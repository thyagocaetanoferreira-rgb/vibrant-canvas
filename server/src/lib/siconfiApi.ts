/**
 * Cliente da API SICONFI (STN — Secretaria do Tesouro Nacional)
 * Base: https://apidatalake.tesouro.gov.br/ords/siconfi/tt/
 *
 * Usa node:https diretamente (mais confiável em containers Docker que o
 * fetch/undici nativo do Node 20 em conexões HTTPS com redirect).
 *
 * Inclui:
 *  - Rate limiter: token bucket (1 req / 1500 ms, burst = 3)
 *  - Retry com backoff exponencial (2 s → 4 s → 8 s) em 429 e 5xx
 *  - Timeout de 20 s por requisição via socket
 *  - Paginação automática (hasMore loop)
 */

import * as https from "node:https";
import * as http  from "node:http";

const BASE_URL = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";
const TIMEOUT_MS = 20_000;

// ─── Tipos retornados pela API ────────────────────────────────────────────────

export interface ExtratoEntrega {
  exercicio:        number;
  cod_ibge:         number;
  populacao:        number | null;
  instituicao:      string | null;
  entregavel:       string;           // RREO, RGF, DCA, MSC, etc.
  periodo:          number;
  periodicidade:    string | null;    // M B Q S A
  status_relatorio: string | null;    // HO RE
  data_status:      string | null;    // ISO datetime
  forma_envio:      string | null;    // P I M F XML CSV
  tipo_relatorio:   string | null;    // P S
}

export interface RreoItem {
  exercicio:     number;
  demonstrativo: string;
  periodo:       number;
  periodicidade: string | null;
  instituicao:   string | null;
  cod_ibge:      number;
  uf:            string | null;
  populacao:     number | null;
  anexo:         string | null;
  rotulo:        string | null;
  coluna:        string | null;
  cod_conta:     string;
  conta:         string | null;
  valor:         number | null;
}

interface ApiPage<T> {
  items:   T[];
  hasMore: boolean;
  limit:   number;
  offset:  number;
  count:   number;
}

// ─── HTTP helper usando node:https com redirect e timeout ────────────────────

function httpsGet(url: string, redirectCount = 0): Promise<{ status: number; body: string; headers: Record<string, string> }> {
  if (redirectCount > 5) return Promise.reject(new Error("Too many redirects"));

  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Accept: "application/json" } }, (res) => {
      // Segue redirect (301/302/307/308)
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); // descarta body
        return httpsGet(res.headers.location, redirectCount + 1).then(resolve, reject);
      }

      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status:  res.statusCode ?? 0,
          body:    Buffer.concat(chunks).toString("utf8"),
          headers: res.headers as Record<string, string>,
        });
      });
      res.on("error", reject);
    });

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error(`SICONFI request timeout após ${TIMEOUT_MS / 1000}s: ${url}`));
    });

    req.on("error", reject);
  });
}

// ─── Rate Limiter (Token Bucket) ──────────────────────────────────────────────

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private queue: Array<() => void> = [];

  constructor(
    private readonly capacity: number,
    private readonly refillMs: number,
  ) {
    this.tokens     = capacity;
    this.lastRefill = Date.now();
  }

  acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.drain();
    });
  }

  private drain() {
    if (this.queue.length === 0) return;
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      const next = this.queue.shift()!;
      next();
      if (this.queue.length > 0) {
        setTimeout(() => this.drain(), this.refillMs);
      }
    } else {
      const wait = this.refillMs - (Date.now() - this.lastRefill);
      setTimeout(() => this.drain(), Math.max(wait, 10));
    }
  }

  private refill() {
    const now     = Date.now();
    const elapsed = now - this.lastRefill;
    const add     = Math.floor(elapsed / this.refillMs);
    if (add > 0) {
      this.tokens     = Math.min(this.capacity, this.tokens + add);
      this.lastRefill = now;
    }
  }
}

// ─── Cliente SICONFI ──────────────────────────────────────────────────────────

class SiconfiApiClient {
  private readonly rateLimiter = new TokenBucket(3, 1500);

  private async fetchWithRetry(url: string, attempt = 1, maxAttempts = 3): Promise<string> {
    await this.rateLimiter.acquire();

    console.log(`[siconfiApi] GET ${url.split("?")[0]} (tentativa ${attempt})`);

    let result: Awaited<ReturnType<typeof httpsGet>>;
    try {
      result = await httpsGet(url);
    } catch (err: any) {
      if (attempt < maxAttempts) {
        const delay = 2 ** attempt * 1000;
        console.warn(`[siconfiApi] Erro de rede (tentativa ${attempt}): ${err.message} — retry em ${delay}ms`);
        await sleep(delay);
        return this.fetchWithRetry(url, attempt + 1, maxAttempts);
      }
      throw new Error(`SICONFI: falha após ${maxAttempts} tentativas — ${err.message}`);
    }

    if (result.status === 429 || result.status >= 500) {
      if (attempt < maxAttempts) {
        const retryAfter = Number(result.headers["retry-after"] ?? 0);
        const delay      = retryAfter * 1000 || 2 ** attempt * 1000;
        console.warn(`[siconfiApi] HTTP ${result.status} (tentativa ${attempt}), retry em ${delay}ms`);
        await sleep(delay);
        return this.fetchWithRetry(url, attempt + 1, maxAttempts);
      }
      throw new Error(`SICONFI HTTP ${result.status}: ${result.body.slice(0, 200)}`);
    }

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`SICONFI HTTP ${result.status} — ${url}`);
    }

    return result.body;
  }

  private async paginate<T>(endpoint: string, params: Record<string, string | number>): Promise<T[]> {
    const all: T[] = [];
    let offset = 0;
    const limit = 5000;

    while (true) {
      const qs = new URLSearchParams({
        ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
        limit:  String(limit),
        offset: String(offset),
      }).toString();

      const url  = `${BASE_URL}/${endpoint}?${qs}`;
      const body = await this.fetchWithRetry(url);
      const page = JSON.parse(body) as ApiPage<T>;

      console.log(`[siconfiApi] ${endpoint} offset=${offset} count=${page.count} hasMore=${page.hasMore}`);

      all.push(...page.items);
      if (!page.hasMore) break;
      offset += limit;
    }

    return all;
  }

  async getExtratoEntregas(coIbge: string, ano: number): Promise<ExtratoEntrega[]> {
    return this.paginate<ExtratoEntrega>("extrato_entregas", {
      an_referencia: ano,   // parâmetro correto conforme doc da API
      id_ente:       coIbge,
    });
  }

  /**
   * Busca dados RREO de um período.
   * tipoDemonstrativo: 'RREO' (padrão) | 'RREO Simplificado' (mun. < 50k hab)
   */
  async getRreo(
    coIbge:           string,
    ano:              number,
    periodo:          number,
    tipoDemonstrativo = "RREO",
  ): Promise<RreoItem[]> {
    return this.paginate<RreoItem>("rreo", {
      an_exercicio:          ano,
      nr_periodo:            periodo,
      id_ente:               coIbge,
      co_tipo_demonstrativo: tipoDemonstrativo,
    });
  }
}

export const siconfiApi = new SiconfiApiClient();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
