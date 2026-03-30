/**
 * verusLog — logger do frontend Verus
 *
 * Camada 1 (local):  últimos 200 eventos em localStorage["verus_logs"]
 * Camada 2 (remoto): warn/error são enviados ao backend em batch via POST /api/logs/frontend
 *
 * Regras de segurança:
 *  - Nunca grava token JWT, senha, CPF/CNPJ ou payloads de arquivo nos logs
 *  - O flush para o backend é silencioso (nunca bloqueia a UI)
 *  - debug só é registrado em desenvolvimento (VITE_MODE !== "production")
 *
 * Uso:
 *   import { log } from "@/lib/verusLog";
 *   log.info("pdf", "Geração iniciada", { municipio: "Acreúna", ano: 2024 });
 *   log.error("pdf", "Falha ao renderizar", err);
 *
 * DevTools:
 *   window.__verusLogs()       → imprime e retorna todos os logs
 *   window.__verusLogErros()   → retorna os últimos 20 erros
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  ts:       string;      // ISO timestamp
  level:    LogLevel;
  modulo:   string;      // ex: "pdf", "simulador", "api"
  mensagem: string;
  dados?:   unknown;
  stack?:   string;
}

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_LOCAL   = 200;
const STORAGE_KEY = "verus_logs";
const IS_PROD     = import.meta.env.MODE === "production";

// Flush para backend: agrupa até 5 eventos, ou drena a cada 10s
const FLUSH_MAX      = 5;
const FLUSH_DELAY_MS = 10_000;

// ── Storage local ─────────────────────────────────────────────────────────────
function ler(): LogEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}

function gravar(entries: LogEntry[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_LOCAL))); }
  catch { /* localStorage cheio — ignora */ }
}

// ── Flush remoto ──────────────────────────────────────────────────────────────
let fila:      LogEntry[] = [];
let timer:     ReturnType<typeof setTimeout> | null = null;

function agendarFlush(): void {
  if (timer) return;
  timer = setTimeout(() => { timer = null; flushRemoto(); }, FLUSH_DELAY_MS);
}

async function flushRemoto(): Promise<void> {
  if (!fila.length) return;
  const lote = fila.splice(0, 20);
  try {
    const token = localStorage.getItem("vh_token");
    if (!token) return; // não autenticado — descarta silenciosamente

    await fetch("/api/logs/frontend", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(lote),
    });
  } catch {
    // Silencioso — nunca impacta a UI
  }
}

// ── Registro ──────────────────────────────────────────────────────────────────
function registrar(level: LogLevel, modulo: string, mensagem: string, dados?: unknown): void {
  // debug só em dev
  if (level === "debug" && IS_PROD) return;

  const entry: LogEntry = {
    ts:       new Date().toISOString(),
    level,
    modulo,
    mensagem,
    dados:    dados instanceof Error ? undefined : dados,
    stack:    dados instanceof Error ? dados.stack : undefined,
  };

  // Persiste localmente
  const lista = ler();
  lista.push(entry);
  gravar(lista);

  // Console nativo
  const prefix = `[Verus:${modulo}]`;
  if (level === "error")      console.error(prefix, mensagem, dados);
  else if (level === "warn")  console.warn(prefix,  mensagem, dados);
  else if (level === "debug") console.debug(prefix, mensagem, dados);
  else                        console.info(prefix,  mensagem, dados);

  // Envia para o backend apenas warn e error
  if (level === "warn" || level === "error") {
    fila.push(entry);
    if (fila.length >= FLUSH_MAX) {
      flushRemoto();
    } else {
      agendarFlush();
    }
  }
}

// ── API pública ───────────────────────────────────────────────────────────────
export const log = {
  debug: (modulo: string, mensagem: string, dados?: unknown) => registrar("debug", modulo, mensagem, dados),
  info:  (modulo: string, mensagem: string, dados?: unknown) => registrar("info",  modulo, mensagem, dados),
  warn:  (modulo: string, mensagem: string, dados?: unknown) => registrar("warn",  modulo, mensagem, dados),
  error: (modulo: string, mensagem: string, dados?: unknown) => registrar("error", modulo, mensagem, dados),

  /** Retorna todos os logs salvos */
  obter: (): LogEntry[] => ler(),

  /** Retorna os últimos N erros */
  erros: (n = 20): LogEntry[] => ler().filter(e => e.level === "error").slice(-n),

  /** Limpa o histórico local */
  limpar: () => localStorage.removeItem(STORAGE_KEY),

  /** Exporta como texto (para copiar no suporte) */
  exportarTexto: (): string =>
    ler()
      .map(e =>
        `[${e.ts}] ${e.level.toUpperCase()} [${e.modulo}] ${e.mensagem}` +
        (e.stack  ? "\n" + e.stack                            : "") +
        (e.dados  ? "\n" + JSON.stringify(e.dados, null, 2)   : "")
      )
      .join("\n─────────────────────────────────\n"),

  /** Força flush imediato para o backend (ex: antes de fechar a tela) */
  flush: () => flushRemoto(),
};

// ── DevTools ──────────────────────────────────────────────────────────────────
if (typeof window !== "undefined") {
  (window as any).__verusLogs      = () => { console.log(log.exportarTexto()); return ler(); };
  (window as any).__verusLogErros  = () => log.erros();
  (window as any).__verusLogFlush  = () => flushRemoto();
}
