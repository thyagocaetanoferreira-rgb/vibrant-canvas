import { Router, Response } from "express";
import { db } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { siconfiApi, ExtratoEntrega, RreoItem } from "../lib/siconfiApi";

const router = Router();
router.use(requireAuth);

const CAUC_CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/72b5f371-0c35-4613-8076-c99c821a6410/resource/07af297a-5e59-494a-a88a-55ddfd2f4b01/download/relatorio-situacao-de-varios-entes---municipios---uf-todas---abrangencia-1.csv";

// Mapeamento exato: posição da coluna → campo no banco
// Linha de cabeçalho: UF;Nome do Ente Federado;Código IBGE;Código SIAFI;Região;População;Fonte;1.1;1.2;...
const COL = {
  uf:        0,
  nome_ente: 1,
  cod_ibge:  2,
  cod_siafi: 3,
  regiao:    4,
  populacao: 5,
  // col 6 = Fonte (sempre vazio — ignorado)
  req_1_1:   7,
  req_1_2:   8,
  req_1_3:   9,
  req_1_4:   10,
  req_1_5:   11,
  req_2_1_1: 12,
  req_2_1_2: 13,
  req_3_1_1: 14,
  req_3_1_2: 15,
  req_3_2_1: 16,
  req_3_2_2: 17,
  req_3_2_3: 18,
  req_3_2_4: 19,
  req_3_3:   20,
  req_3_4_1: 21,
  req_3_4_2: 22,
  req_3_5:   23,
  req_3_6:   24,
  req_3_7:   25,
  req_4_1:   26,
  req_4_2:   27,
  req_5_1:   28,
  req_5_2:   29,
  req_5_3:   30,
  req_5_4:   31,
  req_5_5:   32,
  req_5_6:   33,
  req_5_7:   34,
} as const;

const REQ_COLS: (keyof typeof COL)[] = [
  "req_1_1","req_1_2","req_1_3","req_1_4","req_1_5",
  "req_2_1_1","req_2_1_2",
  "req_3_1_1","req_3_1_2","req_3_2_1","req_3_2_2","req_3_2_3","req_3_2_4",
  "req_3_3","req_3_4_1","req_3_4_2","req_3_5","req_3_6","req_3_7",
  "req_4_1","req_4_2",
  "req_5_1","req_5_2","req_5_3","req_5_4","req_5_5","req_5_6","req_5_7",
];

// Parser CSV que respeita campos entre aspas duplas
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ";" && !inQ) {
      fields.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

// Valor do requisito: vazio → null, '!' → '!', data → mantém como string
function reqVal(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  return s; // '!' ou 'DD/MM/YY'
}

export async function importarCauc(): Promise<{ total: number }> {
  const { rows: [log] } = await db.query(
    "INSERT INTO siconfi_sync_log (status) VALUES ('em_andamento') RETURNING id"
  );
  const logId = log.id;

  try {
    const response = await fetch(CAUC_CSV_URL, {
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ao baixar o CSV`);

    const buffer = await response.arrayBuffer();
    // Arquivo é ISO-8859-1 (governo federal)
    const text = new TextDecoder("iso-8859-1").decode(buffer);

    const lines = text.split(/\r?\n/);

    // Linhas 0-2 = metadados, linha 3 = cabeçalho, linha 4+ = dados
    const dataLines = lines.slice(4).filter((l) => l.trim().length > 0);

    let total = 0;

    for (const line of dataLines) {
      const f = parseCSVLine(line);
      if (f.length < 8) continue;

      const uf        = f[COL.uf].trim();
      const nomeEnte  = f[COL.nome_ente].trim();
      if (!uf || !nomeEnte) continue;

      const codIbge   = f[COL.cod_ibge].trim().replace(/\D/g, "") || null;
      const codSiafi  = f[COL.cod_siafi].trim() || null;
      const regiao    = f[COL.regiao].trim() || null;
      const popRaw    = f[COL.populacao].trim().replace(/\D/g, "");
      const populacao = popRaw ? parseInt(popRaw, 10) : null;

      // Requisitos
      const reqs = REQ_COLS.map((k) => reqVal(f[COL[k]] ?? ""));

      // Situação global: irregular se ao menos um requisito tiver '!'
      const situacaoGlobal = reqs.some((r) => r === "!") ? "Irregular" : "Regular";

      await db.query(
        `INSERT INTO siconfi_cauc_situacao (
           uf, nome_ente, codigo_ibge, codigo_siafi, regiao, populacao, situacao_global,
           req_1_1, req_1_2, req_1_3, req_1_4, req_1_5,
           req_2_1_1, req_2_1_2,
           req_3_1_1, req_3_1_2, req_3_2_1, req_3_2_2, req_3_2_3, req_3_2_4,
           req_3_3, req_3_4_1, req_3_4_2, req_3_5, req_3_6, req_3_7,
           req_4_1, req_4_2,
           req_5_1, req_5_2, req_5_3, req_5_4, req_5_5, req_5_6, req_5_7,
           importado_em
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,
           $8,$9,$10,$11,$12,
           $13,$14,
           $15,$16,$17,$18,$19,$20,
           $21,$22,$23,$24,$25,$26,
           $27,$28,
           $29,$30,$31,$32,$33,$34,$35,
           NOW()
         )
         ON CONFLICT (codigo_ibge) DO UPDATE SET
           uf=$1, nome_ente=$2, codigo_siafi=$4, regiao=$5, populacao=$6, situacao_global=$7,
           req_1_1=$8,  req_1_2=$9,  req_1_3=$10, req_1_4=$11, req_1_5=$12,
           req_2_1_1=$13, req_2_1_2=$14,
           req_3_1_1=$15, req_3_1_2=$16, req_3_2_1=$17, req_3_2_2=$18,
           req_3_2_3=$19, req_3_2_4=$20, req_3_3=$21,
           req_3_4_1=$22, req_3_4_2=$23, req_3_5=$24, req_3_6=$25, req_3_7=$26,
           req_4_1=$27, req_4_2=$28,
           req_5_1=$29, req_5_2=$30, req_5_3=$31, req_5_4=$32,
           req_5_5=$33, req_5_6=$34, req_5_7=$35,
           importado_em=NOW()`,
        [
          uf, nomeEnte, codIbge, codSiafi, regiao, populacao, situacaoGlobal,
          ...reqs,
        ]
      );
      total++;
    }

    await db.query(
      "UPDATE siconfi_sync_log SET status='sucesso', total_registros=$1, finalizado_em=NOW() WHERE id=$2",
      [total, logId]
    );

    console.log(`[SICONFI] CAUC importado: ${total} municípios`);
    return { total };
  } catch (err: any) {
    await db.query(
      "UPDATE siconfi_sync_log SET status='erro', mensagem_erro=$1, finalizado_em=NOW() WHERE id=$2",
      [err.message, logId]
    );
    throw err;
  }
}

// POST /api/siconfi/sincronizar-cauc
router.post("/sincronizar-cauc", async (req: AuthRequest, res: Response) => {
  try {
    const { total } = await importarCauc(  );
    return res.json({ sucesso: true, total, mensagem: `${total} municípios importados com sucesso.` });
  } catch (err: any) {
    return res.status(500).json({ sucesso: false, mensagem: err.message });
  }
});

// GET /api/siconfi/cauc-log
router.get("/cauc-log", async (_req: AuthRequest, res: Response) => {
  const { rows } = await db.query(
    `SELECT status, total_registros, finalizado_em, mensagem_erro
     FROM siconfi_sync_log
     ORDER BY iniciado_em DESC LIMIT 1`
  );
  return res.json(rows[0] || null);
});

// GET /api/siconfi/cauc-geral — todos os clientes ativos com seus dados CAUC
router.get("/cauc-geral", async (_req: AuthRequest, res: Response) => {
  const { rows } = await db.query(
    `SELECT
       c.id           AS cliente_id,
       m.nome         AS municipio_nome,
       m.codigo_ibge,
       m.codigo_uf,
       s.uf,
       s.situacao_global,
       s.importado_em,
       s.req_1_1, s.req_1_2, s.req_1_3, s.req_1_4, s.req_1_5,
       s.req_2_1_1, s.req_2_1_2,
       s.req_3_1_1, s.req_3_1_2, s.req_3_2_1, s.req_3_2_2, s.req_3_2_3, s.req_3_2_4,
       s.req_3_3, s.req_3_4_1, s.req_3_4_2, s.req_3_5, s.req_3_6, s.req_3_7,
       s.req_4_1, s.req_4_2,
       s.req_5_1, s.req_5_2, s.req_5_3, s.req_5_4, s.req_5_5, s.req_5_6, s.req_5_7
     FROM clientes c
     JOIN municipios m ON m.id = c.municipio_id
     LEFT JOIN siconfi_cauc_situacao s ON s.codigo_ibge = m.codigo_ibge
     WHERE c.status = true
     ORDER BY m.nome`
  );
  return res.json(rows);
});

// GET /api/siconfi/cauc-status?cliente_id=X
router.get("/cauc-status", async (req: AuthRequest, res: Response) => {
  const { cliente_id } = req.query;
  if (!cliente_id) return res.status(400).json({ message: "cliente_id obrigatório" });

  const { rows } = await db.query(
    `SELECT s.*
     FROM clientes c
     JOIN municipios m ON m.id = c.municipio_id
     LEFT JOIN siconfi_cauc_situacao s ON s.codigo_ibge = m.codigo_ibge
     WHERE c.id = $1`,
    [cliente_id]
  );
  if (!rows[0]) return res.status(404).json({ message: "Cliente não encontrado" });
  return res.json(rows[0]);
});

// POST /api/siconfi/validacoes — salva resultado de validação MSC
router.post("/validacoes", async (req: AuthRequest, res: Response) => {
  const {
    municipio_id, tipo_msc, arquivo_nome, ano_exercicio,
    total, ok, avisos, erros, status_geral, resultado_json,
  } = req.body;

  if (!municipio_id || !tipo_msc || !status_geral) {
    return res.status(400).json({ message: "municipio_id, tipo_msc e status_geral são obrigatórios" });
  }

  const { rows } = await db.query(
    `INSERT INTO siconfi_validacoes
       (municipio_id, usuario_id, tipo_msc, arquivo_nome, ano_exercicio,
        total, ok, avisos, erros, status_geral, resultado_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      municipio_id, req.usuario?.id ?? null, tipo_msc, arquivo_nome ?? null,
      ano_exercicio ?? null, total ?? 0, ok ?? 0, avisos ?? 0, erros ?? 0,
      status_geral, resultado_json ? JSON.stringify(resultado_json) : null,
    ]
  );

  return res.status(201).json({ id: rows[0].id });
});

// GET /api/siconfi/validacoes?municipio_id=X&ano=Y
router.get("/validacoes", async (req: AuthRequest, res: Response) => {
  const { municipio_id, ano } = req.query;
  if (!municipio_id) return res.status(400).json({ message: "municipio_id obrigatório" });

  const params: any[] = [municipio_id];
  let anoFilter = "";
  if (ano) {
    params.push(ano);
    anoFilter = `AND ano_exercicio = $${params.length}`;
  }

  const { rows } = await db.query(
    `SELECT sv.id, sv.tipo_msc, sv.arquivo_nome, sv.ano_exercicio,
            sv.total, sv.ok, sv.avisos, sv.erros, sv.status_geral, sv.criado_em,
            u.nome AS usuario_nome
     FROM siconfi_validacoes sv
     LEFT JOIN usuarios u ON u.id = sv.usuario_id
     WHERE sv.municipio_id = $1 ${anoFilter}
     ORDER BY sv.criado_em DESC
     LIMIT 100`,
    params
  );

  return res.json(rows);
});

// ─── Pipeline RREO ───────────────────────────────────────────────────────────

const ANO_ATUAL = new Date().getFullYear();

/** Upsert em lote na siconfi_extrato_entregas (novo schema v2) */
async function upsertExtrato(
  municipioId: number,
  items: ExtratoEntrega[],
): Promise<void> {
  for (const item of items) {
    await db.query(
      `INSERT INTO siconfi_extrato_entregas
         (municipio_id, cod_ibge, exercicio, populacao, instituicao,
          entregavel, periodo, periodicidade,
          status_relatorio, data_status, forma_envio, tipo_relatorio,
          sincronizado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT ON CONSTRAINT uq_extrato_entrega DO UPDATE SET
         populacao        = EXCLUDED.populacao,
         instituicao      = EXCLUDED.instituicao,
         periodicidade    = EXCLUDED.periodicidade,
         data_status      = EXCLUDED.data_status,
         forma_envio      = EXCLUDED.forma_envio,
         tipo_relatorio   = EXCLUDED.tipo_relatorio,
         sincronizado_em  = NOW()`,
      [
        municipioId,
        String(item.cod_ibge),
        item.exercicio,
        item.populacao        ?? null,
        item.instituicao      ?? null,
        item.entregavel,
        item.periodo,
        item.periodicidade    ?? null,
        item.status_relatorio ?? null,
        item.data_status      ? new Date(item.data_status) : null,
        item.forma_envio      ?? null,
        item.tipo_relatorio   ?? null,
      ],
    );
  }
}

/** Upsert em lote de linhas RREO (lotes de 100) */
async function upsertRreo(
  municipioId: number,
  rows: RreoItem[],
): Promise<void> {
  // A API SICONFI pode retornar duplicatas na mesma resposta.
  // ON CONFLICT DO UPDATE não pode afetar a mesma linha duas vezes num único
  // statement → deduplicamos aqui, mantendo a última ocorrência de cada chave.
  const seen = new Map<string, RreoItem>();
  for (const r of rows) {
    const key = [r.cod_ibge, r.exercicio, r.periodo, r.demonstrativo,
                 r.anexo ?? "", r.rotulo ?? "", r.coluna ?? "", r.cod_conta].join("|");
    seen.set(key, r);
  }
  const dedupedRows = Array.from(seen.values());

  const BATCH = 100;
  for (let i = 0; i < dedupedRows.length; i += BATCH) {
    const chunk = dedupedRows.slice(i, i + BATCH);

    // Monta VALUES ($1,$2,...),($N+1,...) dinamicamente
    const valuesClause = chunk.map((_, idx) => {
      const base = idx * 15;
      return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15})`;
    }).join(",");

    const params: any[] = [];
    for (const r of chunk) {
      params.push(
        municipioId,
        String(r.cod_ibge),
        r.uf          ?? null,
        r.instituicao ?? null,
        r.populacao   ?? null,
        r.exercicio,
        r.demonstrativo,
        r.periodo,
        r.periodicidade ?? null,
        r.anexo         ?? null,
        r.rotulo        ?? null,
        r.coluna        ?? null,
        r.cod_conta,
        r.conta         ?? null,
        r.valor         ?? null,
      );
    }

    await db.query(
      `INSERT INTO siconfi_rreo
         (municipio_id, cod_ibge, uf, instituicao, populacao,
          exercicio, demonstrativo, periodo, periodicidade,
          anexo, rotulo, coluna, cod_conta, conta, valor)
       VALUES ${valuesClause}
       ON CONFLICT ON CONSTRAINT uq_rreo_linha DO UPDATE SET
         valor        = EXCLUDED.valor,
         instituicao  = EXCLUDED.instituicao,
         populacao    = EXCLUDED.populacao,
         importado_em = NOW()`,
      params,
    );
  }
}

/** Executa a importação em background (fire-and-forget).
 *  Estratégia: testa os 6 bimestres diretamente no endpoint /rreo.
 *  Se a API retornar dados → período foi entregue ao SICONFI → importa.
 *  Se retornar 0 linhas → período não disponível ainda → pula.
 */
async function importarRreoBackground(
  municipioId: number,
  coIbge: string,
  jobId: number,
  ano: number,
): Promise<void> {
  const PERIODOS = [1, 2, 3, 4, 5, 6];
  try {
    await db.query(
      "UPDATE siconfi_import_jobs SET periodos_total=$1 WHERE id=$2",
      [PERIODOS.length, jobId],
    );

    for (const periodo of PERIODOS) {
      // Verifica se já foi importado (pula sem chamar a API)
      const { rows: existing } = await db.query(
        `SELECT COUNT(*)::int AS cnt FROM siconfi_rreo
         WHERE cod_ibge=$1 AND exercicio=$2 AND periodo=$3`,
        [coIbge, ano, periodo],
      );

      if (existing[0].cnt > 0) {
        console.log(`[SICONFI] Período ${periodo}/${ano} já importado — pulando`);
        await db.query(
          "UPDATE siconfi_import_jobs SET periodos_importados = periodos_importados + 1 WHERE id=$1",
          [jobId],
        );
        continue;
      }

      // Tenta buscar RREO padrão; se vazio, tenta RREO Simplificado
      let rreoRows = await siconfiApi.getRreo(coIbge, ano, periodo, "RREO");
      if (rreoRows.length === 0) {
        rreoRows = await siconfiApi.getRreo(coIbge, ano, periodo, "RREO Simplificado");
      }

      if (rreoRows.length === 0) {
        console.log(`[SICONFI] Período ${periodo}/${ano} sem dados na API — não entregue ainda`);
      } else {
        console.log(`[SICONFI] Período ${periodo}/${ano}: ${rreoRows.length} linhas — importando…`);
        await upsertRreo(municipioId, rreoRows);
      }

      await db.query(
        "UPDATE siconfi_import_jobs SET periodos_importados = periodos_importados + 1 WHERE id=$1",
        [jobId],
      );
    }

    await db.query(
      "UPDATE siconfi_import_jobs SET status='concluido', finalizado_em=NOW() WHERE id=$1",
      [jobId],
    );
    console.log(`[SICONFI] RREO concluído — municipio_id=${municipioId}, ano=${ano}, job=${jobId}`);
  } catch (err: any) {
    console.error(`[SICONFI] Erro na importação RREO job=${jobId}:`, err.message);
    await db.query(
      "UPDATE siconfi_import_jobs SET status='erro', mensagem_erro=$1, finalizado_em=NOW() WHERE id=$2",
      [err.message, jobId],
    );
  }
}

// POST /api/siconfi/importar-rreo/:municipio_id  { ano?: number }
router.post("/importar-rreo/:municipio_id", async (req: AuthRequest, res: Response) => {
  const municipioId = parseInt(req.params.municipio_id, 10);
  if (isNaN(municipioId)) return res.status(400).json({ message: "municipio_id inválido" });

  const ano = parseInt(req.body?.ano, 10) || ANO_ATUAL;
  if (ano < 2000 || ano > ANO_ATUAL + 1) return res.status(400).json({ message: "ano inválido" });

  // Busca o IBGE do município
  const { rows: mun } = await db.query(
    "SELECT codigo_ibge FROM municipios WHERE id=$1",
    [municipioId],
  );
  if (!mun[0]) return res.status(404).json({ message: "Município não encontrado" });

  const coIbge = String(mun[0].codigo_ibge);

  // Verifica job já em andamento (qualquer ano)
  const { rows: jobs } = await db.query(
    `SELECT id, an_exercicio FROM siconfi_import_jobs
     WHERE municipio_id=$1 AND status='em_andamento'
     LIMIT 1`,
    [municipioId],
  );
  if (jobs[0]) {
    return res.status(409).json({
      message: `Importação já em andamento (exercício ${jobs[0].an_exercicio})`,
      job_id: jobs[0].id,
    });
  }

  // Cria o job
  const { rows: [job] } = await db.query(
    `INSERT INTO siconfi_import_jobs (municipio_id, an_exercicio, tp_declaracao, status)
     VALUES ($1,$2,'RREO','em_andamento') RETURNING id`,
    [municipioId, ano],
  );

  // Responde imediatamente
  res.json({ job_id: job.id, message: "Importação iniciada" });

  // Fire-and-forget
  importarRreoBackground(municipioId, coIbge, job.id, ano);
});

// GET /api/siconfi/status-importacao/:municipio_id?ano=2024
router.get("/status-importacao/:municipio_id", async (req: AuthRequest, res: Response) => {
  const municipioId = parseInt(req.params.municipio_id, 10);
  if (isNaN(municipioId)) return res.status(400).json({ message: "municipio_id inválido" });

  const ano = parseInt(req.query.ano as string, 10) || ANO_ATUAL;

  const { rows: mun } = await db.query("SELECT id FROM municipios WHERE id=$1", [municipioId]);
  if (!mun[0]) return res.status(404).json({ message: "Município não encontrado" });

  const [{ rows: jobRows }, { rows: periodosRows }, { rows: anosRows }] = await Promise.all([
    // Último job para o ano selecionado
    db.query(
      `SELECT id, status, an_exercicio, periodos_total, periodos_importados, mensagem_erro, iniciado_em, finalizado_em
       FROM siconfi_import_jobs
       WHERE municipio_id=$1 AND an_exercicio=$2
       ORDER BY iniciado_em DESC LIMIT 1`,
      [municipioId, ano],
    ),
    // Status de cada bimestre derivado da siconfi_rreo
    db.query(
      `SELECT
         periodo                       AS nr_periodo,
         COUNT(*)::int                 AS total_linhas,
         MAX(importado_em)             AS importado_em,
         MIN(importado_em)             AS primeiro_importado_em
       FROM siconfi_rreo
       WHERE municipio_id=$1 AND exercicio=$2
       GROUP BY periodo
       ORDER BY periodo ASC`,
      [municipioId, ano],
    ),
    // Anos com dados no banco (resumo histórico)
    db.query(
      `SELECT exercicio                      AS ano,
              COUNT(DISTINCT periodo)::int   AS periodos_importados,
              MAX(importado_em)              AS ultima_importacao
       FROM siconfi_rreo
       WHERE municipio_id=$1
       GROUP BY exercicio
       ORDER BY exercicio DESC`,
      [municipioId],
    ),
  ]);

  return res.json({
    job:      jobRows[0]   ?? null,
    periodos: periodosRows,  // [{ nr_periodo, total_linhas, importado_em }]
    anos:     anosRows,
  });
});

// GET /api/siconfi/rreo/:municipio_id?periodo=X&exercicio=Y&anexo=Z
router.get("/rreo/:municipio_id", async (req: AuthRequest, res: Response) => {
  const municipioId = parseInt(req.params.municipio_id, 10);
  if (isNaN(municipioId)) return res.status(400).json({ message: "municipio_id inválido" });

  const periodo   = parseInt(req.query.periodo as string, 10);
  if (isNaN(periodo)) return res.status(400).json({ message: "periodo obrigatório (1-6)" });

  const exercicio = parseInt(req.query.exercicio as string || "", 10) || ANO_ATUAL;
  const anexo     = req.query.anexo as string | undefined;

  const params: any[] = [municipioId, exercicio, periodo];
  let anexoFilter = "";
  if (anexo) {
    params.push(anexo);
    anexoFilter = `AND anexo = $${params.length}`;
  }

  const { rows } = await db.query(
    `SELECT cod_conta, conta, coluna, anexo, rotulo, valor
     FROM siconfi_rreo
     WHERE municipio_id=$1 AND exercicio=$2 AND periodo=$3 ${anexoFilter}
     ORDER BY anexo, rotulo, coluna, cod_conta`,
    params,
  );

  return res.json(rows);
});

// ─── Extrato de Entregas ──────────────────────────────────────────────────────

/**
 * POST /api/siconfi/sincronizar-extrato/:municipio_id
 * Body: { ano?: number }
 * Busca o extrato de entregas (RREO, RGF, DCA, MSC, etc.) via API SICONFI
 * e faz upsert na tabela siconfi_extrato_entregas.
 */
router.post("/sincronizar-extrato/:municipio_id", async (req: AuthRequest, res: Response) => {
  const municipioId = parseInt(req.params.municipio_id, 10);
  if (isNaN(municipioId)) return res.status(400).json({ message: "municipio_id inválido" });

  const ano = parseInt(req.body?.ano, 10) || ANO_ATUAL;

  const { rows: [mun] } = await db.query(
    "SELECT codigo_ibge FROM municipios WHERE id=$1",
    [municipioId],
  );
  if (!mun) return res.status(404).json({ message: "Município não encontrado" });

  const coIbge = String(mun.codigo_ibge);

  try {
    console.log(`[SICONFI] Sincronizando extrato de entregas — IBGE ${coIbge}, ano ${ano}`);
    const items = await siconfiApi.getExtratoEntregas(coIbge, ano);

    if (items.length === 0) {
      return res.json({ total: 0, message: "Nenhuma entrega encontrada para este município/ano na API SICONFI." });
    }

    await upsertExtrato(municipioId, items);

    console.log(`[SICONFI] Extrato sincronizado: ${items.length} registros — IBGE ${coIbge}, ano ${ano}`);
    return res.json({ total: items.length });
  } catch (err: any) {
    console.error("[SICONFI] Erro ao sincronizar extrato:", err.message);
    return res.status(502).json({ message: err.message });
  }
});

/**
 * GET /api/siconfi/extrato/:municipio_id
 * Query: ano (default=ano atual), entregavel (opcional)
 * Retorna o extrato de entregas do banco local.
 */
router.get("/extrato/:municipio_id", async (req: AuthRequest, res: Response) => {
  const municipioId = parseInt(req.params.municipio_id, 10);
  if (isNaN(municipioId)) return res.status(400).json({ message: "municipio_id inválido" });

  const ano        = parseInt(req.query.ano as string || "", 10) || ANO_ATUAL;
  const entregavel = req.query.entregavel as string | undefined;

  const params: any[] = [municipioId, ano];
  let filtroEntregavel = "";
  if (entregavel) {
    params.push(entregavel);
    filtroEntregavel = `AND entregavel = $${params.length}`;
  }

  const { rows } = await db.query(
    `SELECT
       entregavel, periodo, periodicidade,
       status_relatorio, data_status, forma_envio, tipo_relatorio,
       populacao, instituicao, sincronizado_em
     FROM siconfi_extrato_entregas
     WHERE municipio_id=$1 AND exercicio=$2 ${filtroEntregavel}
     ORDER BY entregavel, periodo, status_relatorio`,
    params,
  );

  const { rows: [meta] } = await db.query(
    `SELECT MAX(sincronizado_em) AS ultima_sync, COUNT(*)::int AS total
     FROM siconfi_extrato_entregas
     WHERE municipio_id=$1 AND exercicio=$2`,
    [municipioId, ano],
  );

  return res.json({ items: rows, ultima_sync: meta?.ultima_sync ?? null, total: meta?.total ?? 0 });
});

// ─────────────────────────────────────────────────────────────────────────────
// VALIDADOR SICONFI
// ─────────────────────────────────────────────────────────────────────────────

// Labels dos bimestres/semestres
const BIMESTRE_LABELS: Record<number, string> = {
  1: "1° Bimestre (Jan-Fev)",
  2: "2° Bimestre (Mar-Abr)",
  3: "3° Bimestre (Mai-Jun)",
  4: "4° Bimestre (Jul-Ago)",
  5: "5° Bimestre (Set-Out)",
  6: "6° Bimestre (Nov-Dez)",
};
const SEMESTRE_LABELS: Record<number, string> = {
  1: "1° Semestre (Jan-Jun)",
  2: "2° Semestre (Jul-Dez)",
};

interface ResultadoVerificacao {
  no_verificacao: string;
  no_desc: string;
  no_finalidade: string;
  co_dimensao: string;
  capag: boolean;
  status: "consistente" | "inconsistente" | "aviso" | "nao_aplicavel";
  resumo: string;
  detalhes: object[];
  nota: number;        // 0.0 a 1.0 — pontuação parcial da verificação
  nota_max: number;    // sempre 1.0 (reservado para futuras ponderações)
}

// ── Helper: calcula prazo do RREO dado período e tipo ─────────────────────────
function calcPrazoRREO(periodo: number, semestral: boolean, ano: number): Date {
  if (semestral) {
    return periodo <= 1 ? new Date(ano, 6, 30) : new Date(ano + 1, 0, 30);
  }
  const mesSubsequente = periodo * 2; // meses JS são 0-indexed, mas p*2 já é o índice correto
  return mesSubsequente <= 12
    ? new Date(ano, mesSubsequente, 30)   // ex: p=1 → new Date(ano, 2, 30) = 30/Mar
    : new Date(ano + 1, 0, 30);           // bim 6 → 30/Jan ano+1
}

// Normaliza data_status para somente data (zera horário), evitando falso-intempestivo
function soData(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Mapa de verificações implementadas por código
type VerificadorFn = (municipioId: number, codIbge: string, ano: number) => Promise<Partial<ResultadoVerificacao>>;

// ── D1_00001: Homologação de todos os RREOs ────────────────────────────────
async function verificarD1_00001(municipioId: number, _codIbge: string, ano: number): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; tipo_relatorio: string | null; periodicidade: string | null;
    data_status: string | null; instituicao: string | null;
  }>(
    `SELECT periodo, tipo_relatorio, periodicidade, data_status, instituicao
     FROM siconfi_extrato_entregas
     WHERE municipio_id = $1
       AND exercicio = $2
       AND (entregavel ILIKE '%RREO%' OR entregavel ILIKE '%Relat%Resumido%')
       AND status_relatorio = 'HO'
     ORDER BY periodo`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "nao_aplicavel",
      nota: 0, nota_max: 1,
      resumo: "Nenhum dado do extrato de entregas encontrado. Sincronize o extrato primeiro.",
      detalhes: [],
    };
  }

  const semestral = rows.some(r => r.tipo_relatorio?.trim() === "S" || r.periodicidade?.trim() === "S");
  const periodosEsperados = semestral ? [1, 2] : [1, 2, 3, 4, 5, 6];
  const labels = semestral ? SEMESTRE_LABELS : BIMESTRE_LABELS;
  const total = periodosEsperados.length;
  const tipo = semestral ? "semestres" : "bimestres";

  const entregues = new Map(rows.map(r => [r.periodo, r]));
  const detalhes = periodosEsperados.map(p => {
    const r = entregues.get(p);
    return r
      ? { periodo: p, label: labels[p], entregue: true, data_status: r.data_status, instituicao: r.instituicao }
      : { periodo: p, label: labels[p], entregue: false };
  });

  const faltando = periodosEsperados.filter(p => !entregues.has(p));
  const entreguesCount = total - faltando.length;
  const nota = parseFloat((entreguesCount / total).toFixed(4));

  if (faltando.length === 0) {
    return { status: "consistente", nota: 1, nota_max: 1, resumo: `${total}/${total} ${tipo} homologados.`, detalhes };
  }

  const faltandoLabels = faltando.map(p => labels[p]).join(", ");
  return {
    status: "inconsistente", nota, nota_max: 1,
    resumo: `${entreguesCount}/${total} ${tipo} homologados. Faltam: ${faltandoLabels}.`,
    detalhes,
  };
}

// ── D1_00006: Tempestividade na homologação dos RREOs ─────────────────────────
async function verificarD1_00006(municipioId: number, _codIbge: string, ano: number): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; tipo_relatorio: string | null; periodicidade: string | null;
    data_status: string | null; instituicao: string | null;
  }>(
    `SELECT periodo, tipo_relatorio, periodicidade, data_status, instituicao
     FROM siconfi_extrato_entregas
     WHERE municipio_id = $1
       AND exercicio = $2
       AND (entregavel ILIKE '%RREO%' OR entregavel ILIKE '%Relat%Resumido%')
       AND status_relatorio = 'HO'
     ORDER BY periodo`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "nao_aplicavel", nota: 0, nota_max: 1,
      resumo: "Nenhum dado do extrato de entregas encontrado. Sincronize o extrato primeiro.",
      detalhes: [],
    };
  }

  const semestral = rows.some(r => r.tipo_relatorio?.trim() === "S" || r.periodicidade?.trim() === "S");
  const periodosEsperados = semestral ? [1, 2] : [1, 2, 3, 4, 5, 6];
  const labels = semestral ? SEMESTRE_LABELS : BIMESTRE_LABELS;
  const total = periodosEsperados.length;

  const entregues = new Map(rows.map(r => [r.periodo, r]));

  const detalhes = periodosEsperados.map(p => {
    const r = entregues.get(p);
    const prazo = calcPrazoRREO(p, semestral, ano);
    const prazoStr = prazo.toLocaleDateString("pt-BR");

    if (!r || !r.data_status) {
      return { periodo: p, label: labels[p], entregue: false, prazo: prazoStr, intempestiva: null };
    }

    const dataEnvio = soData(new Date(r.data_status));
    const intempestiva = dataEnvio > prazo;

    return {
      periodo: p, label: labels[p], entregue: true,
      data_status: r.data_status, prazo: prazoStr,
      intempestiva, instituicao: r.instituicao,
    };
  });

  const noPrazo      = detalhes.filter(d => d.entregue && !d.intempestiva).length;
  const intempestivos = detalhes.filter(d => d.entregue && d.intempestiva === true).length;
  const nota = parseFloat((noPrazo / total).toFixed(4));
  const tipo = semestral ? "semestres" : "bimestres";

  if (intempestivos === 0 && noPrazo === total) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `${total}/${total} ${tipo} homologados no prazo.`,
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota, nota_max: 1,
    resumo: `${noPrazo}/${total} no prazo. ${intempestivos} intempestivo(s).`,
    detalhes,
  };
}

// ── D1_00011: Quantidade de retificações dos RREOs do exercício ───────────────
async function verificarD1_00011(municipioId: number, _codIbge: string, ano: number): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; tipo_relatorio: string | null; periodicidade: string | null;
    status_relatorio: string; data_status: string | null; instituicao: string | null;
  }>(
    `SELECT periodo, tipo_relatorio, periodicidade, status_relatorio, data_status, instituicao
     FROM siconfi_extrato_entregas
     WHERE municipio_id = $1
       AND exercicio = $2
       AND (entregavel ILIKE '%RREO%' OR entregavel ILIKE '%Relat%Resumido%')
     ORDER BY periodo, status_relatorio`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "nao_aplicavel", nota: 0, nota_max: 1,
      resumo: "Nenhum dado do extrato de entregas encontrado. Sincronize o extrato primeiro.",
      detalhes: [],
    };
  }

  const semestral = rows.some(r => r.tipo_relatorio?.trim() === "S" || r.periodicidade?.trim() === "S");
  const labels = semestral ? SEMESTRE_LABELS : BIMESTRE_LABELS;

  const retificacoes = rows.filter(r => r.status_relatorio?.trim() === "RE");
  const countRE = retificacoes.length;

  const detalhes = rows.map(r => ({
    periodo: r.periodo,
    label: labels[r.periodo] ?? `Período ${r.periodo}`,
    status_relatorio: r.status_relatorio,
    data_status: r.data_status,
    instituicao: r.instituicao,
  }));

  const nota = parseFloat(Math.max(0, 1 - countRE * 0.16).toFixed(4));

  if (countRE === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhuma retificação encontrada nos RREOs do exercício.",
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota, nota_max: 1,
    resumo: `${countRE} retificação(ões) encontrada(s). Cada RE desconta 0,16 da nota.`,
    detalhes,
  };
}

// ── D3_00001: Resultado orçamentário no RREO Anexo 01, 6° bimestre ──────────
async function verificarD3_00001(municipioId: number, _codIbge: string, ano: number): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{ cod_conta: string; coluna: string; valor: number }>(
    `SELECT cod_conta, coluna, SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND anexo = 'RREO-Anexo 01'
       AND periodo = 6
       AND cod_conta IN ('TotalReceitas','TotalDespesas','Superavit')
       AND coluna IN ('Até o Bimestre (c)','DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)')
     GROUP BY cod_conta, coluna`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "nao_aplicavel", nota: 0, nota_max: 1,
      resumo: "Nenhum dado do RREO Anexo 01 (6° bimestre) encontrado. Importe o RREO primeiro.",
      detalhes: [],
    };
  }

  const receitas  = rows.find(r => r.cod_conta === "TotalReceitas"  && r.coluna === "Até o Bimestre (c)");
  const despesas  = rows.find(r => r.cod_conta === "TotalDespesas"  && r.coluna === "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)");
  const superavit = rows.find(r => r.cod_conta === "Superavit"      && r.coluna === "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)");

  if (!receitas || !despesas) {
    return {
      status: "nao_aplicavel", nota: 0, nota_max: 1,
      resumo: "Dados de TotalReceitas ou TotalDespesas não encontrados no Anexo 01 do 6° bimestre.",
      detalhes: [],
    };
  }

  const totalReceitas = receitas.valor ?? 0;
  const totalDespesas = despesas.valor ?? 0;
  const resultadoCalculado = totalReceitas - totalDespesas;
  const superavitInformado = superavit?.valor ?? 0;

  const detalhes = [
    { item: "Total de Receitas", coluna: "Até o Bimestre (c)", valor: totalReceitas },
    { item: "Total de Despesas", coluna: "Despesas Empenhadas Até o Bimestre (f)", valor: totalDespesas },
    { item: "Resultado Calculado (Rec − Desp)", coluna: "—", valor: resultadoCalculado },
    { item: "Superávit Informado no Demonstrativo", coluna: "Despesas Empenhadas Até o Bimestre (f)", valor: superavitInformado },
  ];

  const TOLERANCIA = 0.01; // centavos
  let consistente = false;

  if (resultadoCalculado > TOLERANCIA) {
    // Superávit deve ser igual ao resultado positivo
    consistente = Math.abs(superavitInformado - resultadoCalculado) <= TOLERANCIA;
  } else {
    // Déficit ou equilíbrio — superávit deve ser 0 ou nulo
    consistente = Math.abs(superavitInformado) <= TOLERANCIA;
  }

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (consistente) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Resultado orçamentário (${fmt(resultadoCalculado)}) confere com o superávit informado.`,
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: `Resultado calculado ${fmt(resultadoCalculado)} difere do superávit informado ${fmt(superavitInformado)}.`,
    detalhes,
  };
}

// ── D3_00002: Igualdade de despesas entre Anexo 01 e Anexo 02 ────────────────
async function verificarD3_00002(municipioId: number, _codIbge: string, ano: number): Promise<Partial<ResultadoVerificacao>> {
  // Busca todos os períodos disponíveis para o exercício
  const { rows: periodosRows } = await db.query<{ periodo: number }>(
    `SELECT DISTINCT periodo FROM siconfi_rreo
     WHERE municipio_id = $1 AND exercicio = $2
     ORDER BY periodo`,
    [municipioId, ano],
  );

  if (periodosRows.length === 0) {
    return {
      status: "nao_aplicavel", nota: 0, nota_max: 1,
      resumo: "Nenhum dado do RREO encontrado. Importe o RREO primeiro.",
      detalhes: [],
    };
  }

  const periodos = periodosRows.map(r => r.periodo);

  // Tipos de comparação disponíveis (pagas não existe no Anexo 02)
  const comparacoes = [
    {
      tipo: "Empenhadas",
      colAn02: "DESPESAS EMPENHADAS ATÉ O BIMESTRE (b)",
      colAn01: "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)",
    },
    {
      tipo: "Liquidadas",
      colAn02: "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)",
      colAn01: "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)",
    },
  ];

  // Busca todos os valores relevantes de uma vez
  const { rows: dados } = await db.query<{
    periodo: number; anexo: string; coluna: string; valor: number;
  }>(
    `SELECT periodo, anexo, coluna, SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND periodo = ANY($3::int[])
       AND (
         (anexo = 'RREO-Anexo 01'
           AND cod_conta = 'DespesasExcetoIntraOrcamentarias'
           AND coluna IN ('DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)', 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)'))
         OR
         (anexo = 'RREO-Anexo 02'
           AND rotulo = 'Total das Despesas Exceto Intra-Orçamentárias'
           AND coluna IN ('DESPESAS EMPENHADAS ATÉ O BIMESTRE (b)', 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)'))
       )
     GROUP BY periodo, anexo, coluna
     ORDER BY periodo, anexo, coluna`,
    [municipioId, ano, periodos],
  );

  // Indexa: periodo → anexo → coluna → valor
  const idx = new Map<string, number>();
  for (const d of dados) {
    idx.set(`${d.periodo}|${d.anexo}|${d.coluna}`, d.valor ?? 0);
  }

  const TOLERANCIA = 0.02;
  const detalhes: object[] = [];
  let totalComparacoes = 0;
  let comparacoesOk = 0;

  for (const periodo of periodos) {
    for (const cmp of comparacoes) {
      const vAn02 = idx.get(`${periodo}|RREO-Anexo 02|${cmp.colAn02}`) ?? null;
      const vAn01 = idx.get(`${periodo}|RREO-Anexo 01|${cmp.colAn01}`) ?? null;

      if (vAn02 === null && vAn01 === null) continue; // período sem dados neste tipo

      totalComparacoes++;
      const igualou = vAn02 !== null && vAn01 !== null && Math.abs(vAn02 - vAn01) <= TOLERANCIA;
      if (igualou) comparacoesOk++;

      detalhes.push({
        periodo,
        label: BIMESTRE_LABELS[periodo] ?? `Período ${periodo}`,
        tipo: cmp.tipo,
        valor_anexo01: vAn01,
        valor_anexo02: vAn02,
        diferenca: vAn01 !== null && vAn02 !== null ? vAn02 - vAn01 : null,
        ok: igualou,
      });
    }
  }

  if (totalComparacoes === 0) {
    return {
      status: "nao_aplicavel", nota: 0, nota_max: 1,
      resumo: "Nenhum dado comparável encontrado nos Anexos 01 e 02.",
      detalhes: [],
    };
  }

  const nota = parseFloat((comparacoesOk / totalComparacoes).toFixed(4));
  const inconsistentes = totalComparacoes - comparacoesOk;

  if (inconsistentes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Todas as ${totalComparacoes} comparações consistentes entre Anexo 01 e Anexo 02 (${periodos.length} período(s)).`,
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota, nota_max: 1,
    resumo: `${inconsistentes} de ${totalComparacoes} comparações com divergência entre Anexo 01 e Anexo 02.`,
    detalhes,
  };
}

// ── D3_00003: Igualdade de despesas entre Anexo 01 e Anexo 06 ────────────────
async function verificarD3_00003(municipioId: number, _codIbge: string, ano: number): Promise<Partial<ResultadoVerificacao>> {
  // Uma única query busca tudo: An01 (Correntes+Capital × 3 colunas) + An06 (idem)
  const { rows } = await db.query<{
    periodo: number; anexo: string; cod_conta: string; coluna: string; valor: number;
  }>(
    `SELECT periodo, anexo, cod_conta, coluna, SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND (
         (anexo = 'RREO-Anexo 01'
           AND cod_conta IN ('DespesasCorrentes','DespesasDeCapital')
           AND coluna IN (
             'DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)',
             'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)',
             'DESPESAS PAGAS ATÉ O BIMESTRE (j)'
           ))
         OR
         (anexo = 'RREO-Anexo 06'
           AND cod_conta IN ('DespesasCorrentesExcetoFontesRPPS','DespesasDeCapitalExcetoFontesRPPS')
           AND coluna IN ('DESPESAS EMPENHADAS','DESPESAS LIQUIDADAS','DESPESAS PAGAS (a)'))
       )
     GROUP BY periodo, anexo, cod_conta, coluna`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "nao_aplicavel", nota: 0, nota_max: 1,
      resumo: "Nenhum dado do RREO Anexo 01 / Anexo 06 encontrado. Importe o RREO primeiro.",
      detalhes: [],
    };
  }

  // Indexa: periodo|anexo|cod_conta|coluna → valor
  const idx = new Map<string, number>();
  const periodos = new Set<number>();
  for (const d of rows) {
    idx.set(`${d.periodo}|${d.anexo}|${d.cod_conta}|${d.coluna}`, d.valor ?? 0);
    periodos.add(d.periodo);
  }

  // Matriz de comparações: categoria × tipo
  const comparacoes = [
    {
      categoria: "Correntes",
      contaAn01: "DespesasCorrentes",
      contaAn06: "DespesasCorrentesExcetoFontesRPPS",
      tipos: [
        { tipo: "Empenhadas", colAn01: "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)", colAn06: "DESPESAS EMPENHADAS" },
        { tipo: "Liquidadas",  colAn01: "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)", colAn06: "DESPESAS LIQUIDADAS" },
        { tipo: "Pagas",       colAn01: "DESPESAS PAGAS ATÉ O BIMESTRE (j)",      colAn06: "DESPESAS PAGAS (a)" },
      ],
    },
    {
      categoria: "Capital",
      contaAn01: "DespesasDeCapital",
      contaAn06: "DespesasDeCapitalExcetoFontesRPPS",
      tipos: [
        { tipo: "Empenhadas", colAn01: "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)", colAn06: "DESPESAS EMPENHADAS" },
        { tipo: "Liquidadas",  colAn01: "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)", colAn06: "DESPESAS LIQUIDADAS" },
        { tipo: "Pagas",       colAn01: "DESPESAS PAGAS ATÉ O BIMESTRE (j)",      colAn06: "DESPESAS PAGAS (a)" },
      ],
    },
  ];

  const TOLERANCIA = 0.02;
  const detalhes: object[] = [];
  let totalComparacoes = 0;
  let comparacoesOk = 0;

  for (const periodo of Array.from(periodos).sort()) {
    for (const { categoria, contaAn01, contaAn06, tipos } of comparacoes) {
      for (const { tipo, colAn01, colAn06 } of tipos) {
        const vAn01 = idx.get(`${periodo}|RREO-Anexo 01|${contaAn01}|${colAn01}`) ?? null;
        const vAn06 = idx.get(`${periodo}|RREO-Anexo 06|${contaAn06}|${colAn06}`) ?? null;

        if (vAn01 === null && vAn06 === null) continue; // sem dados para este ponto

        totalComparacoes++;
        const igualou = vAn01 !== null && vAn06 !== null && Math.abs(vAn01 - vAn06) <= TOLERANCIA;
        if (igualou) comparacoesOk++;

        detalhes.push({
          periodo,
          label: BIMESTRE_LABELS[periodo] ?? `Período ${periodo}`,
          categoria,
          tipo,
          valor_anexo01: vAn01,
          valor_anexo06: vAn06,
          diferenca: vAn01 !== null && vAn06 !== null ? vAn06 - vAn01 : null,
          ok: igualou,
        });
      }
    }
  }

  if (totalComparacoes === 0) {
    return {
      status: "nao_aplicavel", nota: 0, nota_max: 1,
      resumo: "Nenhum dado comparável encontrado nos Anexos 01 e 06.",
      detalhes: [],
    };
  }

  const nota = parseFloat((comparacoesOk / totalComparacoes).toFixed(4));
  const inconsistentes = totalComparacoes - comparacoesOk;
  const nPeriodos = periodos.size;

  if (inconsistentes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Todas as ${totalComparacoes} comparações consistentes (${nPeriodos} período(s), Correntes + Capital).`,
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota, nota_max: 1,
    resumo: `${inconsistentes} de ${totalComparacoes} comparações com divergência entre Anexo 01 e Anexo 06.`,
    detalhes,
  };
}

// ── D3_00007: Igualdade de receitas (previsão + realizado) entre Anexo 01 e 06 ─
async function verificarD3_00007(municipioId: number, _codIbge: string, ano: number): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; anexo: string; cod_conta: string; coluna: string; valor: number;
  }>(
    `SELECT periodo, anexo, cod_conta, coluna, SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND rotulo = 'Padrão'
       AND (
         (anexo = 'RREO-Anexo 01'
           AND cod_conta IN ('ReceitasCorrentes','ReceitasDeCapital')
           AND coluna IN ('PREVISÃO ATUALIZADA (a)','Até o Bimestre (c)'))
         OR
         (anexo = 'RREO-Anexo 06'
           AND cod_conta IN ('ReceitasCorrentesExcetoFontesRPPS','ReceitasDeCapitalExcetoFontesRPPS')
           AND coluna IN ('PREVISÃO ATUALIZADA','RECEITAS REALIZADAS (a)'))
       )
     GROUP BY periodo, anexo, cod_conta, coluna`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "nao_aplicavel", nota: 0, nota_max: 1,
      resumo: "Nenhum dado do RREO Anexo 01 / Anexo 06 encontrado. Importe o RREO primeiro.",
      detalhes: [],
    };
  }

  const idx = new Map<string, number>();
  const periodos = new Set<number>();
  for (const d of rows) {
    idx.set(`${d.periodo}|${d.anexo}|${d.cod_conta}|${d.coluna}`, d.valor ?? 0);
    periodos.add(d.periodo);
  }

  const comparacoes = [
    {
      categoria: "Correntes",
      contaAn01: "ReceitasCorrentes",
      contaAn06: "ReceitasCorrentesExcetoFontesRPPS",
      tipos: [
        { tipo: "Previsão Atualizada",    colAn01: "PREVISÃO ATUALIZADA (a)", colAn06: "PREVISÃO ATUALIZADA"      },
        { tipo: "Realizadas até Bimestre", colAn01: "Até o Bimestre (c)",      colAn06: "RECEITAS REALIZADAS (a)" },
      ],
    },
    {
      categoria: "Capital",
      contaAn01: "ReceitasDeCapital",
      contaAn06: "ReceitasDeCapitalExcetoFontesRPPS",
      tipos: [
        { tipo: "Previsão Atualizada",    colAn01: "PREVISÃO ATUALIZADA (a)", colAn06: "PREVISÃO ATUALIZADA"      },
        { tipo: "Realizadas até Bimestre", colAn01: "Até o Bimestre (c)",      colAn06: "RECEITAS REALIZADAS (a)" },
      ],
    },
  ];

  const TOLERANCIA = 0.02;
  const detalhes: object[] = [];
  let totalComparacoes = 0;
  let comparacoesOk = 0;

  for (const periodo of Array.from(periodos).sort()) {
    for (const { categoria, contaAn01, contaAn06, tipos } of comparacoes) {
      for (const { tipo, colAn01, colAn06 } of tipos) {
        const vAn01 = idx.get(`${periodo}|RREO-Anexo 01|${contaAn01}|${colAn01}`) ?? null;
        const vAn06 = idx.get(`${periodo}|RREO-Anexo 06|${contaAn06}|${colAn06}`) ?? null;

        if (vAn01 === null && vAn06 === null) continue;

        totalComparacoes++;
        const igualou = vAn01 !== null && vAn06 !== null && Math.abs(vAn01 - vAn06) <= TOLERANCIA;
        if (igualou) comparacoesOk++;

        detalhes.push({
          periodo,
          label: BIMESTRE_LABELS[periodo] ?? `Período ${periodo}`,
          categoria,
          tipo,
          valor_anexo01: vAn01,
          valor_anexo06: vAn06,
          diferenca: vAn01 !== null && vAn06 !== null ? vAn06 - vAn01 : null,
          ok: igualou,
        });
      }
    }
  }

  if (totalComparacoes === 0) {
    return {
      status: "nao_aplicavel", nota: 0, nota_max: 1,
      resumo: "Nenhum dado comparável encontrado nos Anexos 01 e 06.",
      detalhes: [],
    };
  }

  const nota = parseFloat((comparacoesOk / totalComparacoes).toFixed(4));
  const inconsistentes = totalComparacoes - comparacoesOk;

  if (inconsistentes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Todas as ${totalComparacoes} comparações consistentes (${periodos.size} período(s), Correntes + Capital).`,
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota, nota_max: 1,
    resumo: `${inconsistentes} de ${totalComparacoes} comparações com divergência entre Anexo 01 e Anexo 06.`,
    detalhes,
  };
}

// Mapeamento: no_declaracao da tabela → verificações do tipo
const VERIFICACOES_POR_TIPO: Record<string, string[]> = {
  "RREO": ["D1_00001","D1_00006","D1_00011","D3_00001","D3_00002","D3_00003","D3_00007","D3_00012","D3_00017","D3_00027","D3_00028","D3_00030","D3_00032","D3_00033","D3_00034","D3_00035","D3_00037","D3_00038","D3_00039","D3_00040","D3_00044","D3_00045"],
};

const verificadores: Record<string, VerificadorFn> = {
  "D1_00001": verificarD1_00001,
  "D1_00006": verificarD1_00006,
  "D1_00011": verificarD1_00011,
  "D3_00001": verificarD3_00001,
  "D3_00002": verificarD3_00002,
  "D3_00003": verificarD3_00003,
  "D3_00007": verificarD3_00007,
};

// POST /api/siconfi/validar/:municipio_id
router.post("/validar/:municipio_id", async (req: AuthRequest, res: Response) => {
  const municipioId = parseInt(req.params.municipio_id);
  const { ano, tipo } = req.body as { ano: number; tipo: string };

  if (!ano || !tipo) return res.status(400).json({ error: "ano e tipo são obrigatórios" });

  // Buscar município para obter cod_ibge
  const { rows: [municipio] } = await db.query<{ codigo_ibge: string }>(
    "SELECT codigo_ibge FROM municipios WHERE id = $1",
    [municipioId],
  );
  if (!municipio) return res.status(404).json({ error: "Município não encontrado" });

  const codigosEsperados = VERIFICACOES_POR_TIPO[tipo] ?? [];

  // Buscar metadados das verificações no banco
  const { rows: regras } = await db.query<{
    no_verificacao: string; no_desc: string; no_finalidade: string;
    co_dimensao: string; capag: boolean;
  }>(
    `SELECT no_verificacao, no_desc, no_finalidade, co_dimensao, capag
     FROM siconfi_verificacoes
     WHERE no_verificacao = ANY($1::text[])
     ORDER BY no_verificacao`,
    [codigosEsperados],
  );

  // Executar cada verificação
  const resultados: ResultadoVerificacao[] = await Promise.all(
    regras.map(async (regra) => {
      const fn = verificadores[regra.no_verificacao];
      if (!fn) {
        return {
          ...regra,
          status: "nao_aplicavel" as const,
          nota: 0, nota_max: 1,
          resumo: "Verificação ainda não implementada.",
          detalhes: [],
        };
      }
      try {
        const resultado = await fn(municipioId, String(municipio.codigo_ibge), ano);
        return { ...regra, ...resultado } as ResultadoVerificacao;
      } catch (err: any) {
        return {
          ...regra,
          status: "nao_aplicavel" as const,
          nota: 0, nota_max: 1,
          resumo: `Erro ao executar verificação: ${err.message}`,
          detalhes: [],
        };
      }
    }),
  );

  const executado_em = new Date().toISOString();

  return res.json({
    resultados,
    executado_em,
    municipio_id: municipioId,
    ano,
    tipo,
  });
});

// POST /api/siconfi/validador-historico — salvar resultado
router.post("/validador-historico", async (req: AuthRequest, res: Response) => {
  const { municipio_id, tipo_analise, ano_exercicio, resultados } = req.body as {
    municipio_id: number;
    tipo_analise: string;
    ano_exercicio: number;
    resultados: ResultadoVerificacao[];
  };

  if (!municipio_id || !tipo_analise || !ano_exercicio || !resultados) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  const analisadas    = resultados.filter(r => r.status !== "nao_aplicavel").length;
  const consistentes  = resultados.filter(r => r.status === "consistente").length;
  const inconsistentes= resultados.filter(r => r.status === "inconsistente").length;
  const avisos        = resultados.filter(r => r.status === "aviso").length;
  const status_geral  = inconsistentes > 0 ? "irregular" : avisos > 0 ? "alerta" : "regular";

  const { rows: [row] } = await db.query(
    `INSERT INTO siconfi_validador_historico
       (municipio_id, usuario_id, tipo_analise, ano_exercicio,
        total_analisadas, consistentes, inconsistentes, avisos,
        status_geral, resultado_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, executado_em`,
    [
      municipio_id, req.usuario!.id, tipo_analise, ano_exercicio,
      analisadas, consistentes, inconsistentes, avisos,
      status_geral, JSON.stringify(resultados),
    ],
  );

  return res.status(201).json({ id: row.id, executado_em: row.executado_em });
});

// GET /api/siconfi/validador-historico?municipio_id=&ano=
router.get("/validador-historico", async (req: AuthRequest, res: Response) => {
  const municipio_id = parseInt(req.query.municipio_id as string);
  const ano = req.query.ano ? parseInt(req.query.ano as string) : null;

  if (!municipio_id) return res.status(400).json({ error: "municipio_id obrigatório" });

  const params: any[] = [municipio_id];
  let anoFilter = "";
  if (ano) { anoFilter = " AND h.ano_exercicio = $2"; params.push(ano); }

  const { rows } = await db.query(
    `SELECT h.id, h.tipo_analise, h.ano_exercicio, h.total_analisadas,
            h.consistentes, h.inconsistentes, h.avisos, h.status_geral,
            h.resultado_json, h.executado_em,
            u.nome AS usuario_nome
     FROM siconfi_validador_historico h
     LEFT JOIN usuarios u ON u.id = h.usuario_id
     WHERE h.municipio_id = $1${anoFilter}
     ORDER BY h.executado_em DESC
     LIMIT 50`,
    params,
  );

  return res.json(rows);
});

export default router;
