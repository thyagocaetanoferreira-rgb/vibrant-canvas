import { Router, Response } from "express";
import { db } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

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
      municipio_id, req.user?.id ?? null, tipo_msc, arquivo_nome ?? null,
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

export default router;
