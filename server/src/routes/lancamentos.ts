import { Router, Response } from "express";
import { db } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const IBGE_CORRECTIONS: Record<string, number> = {
  "Bela Vista de Goiás": 5203302,
  "Davinópolis": 5206909,
};

function parseMoney(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val;
  let s = String(val).trim();
  if (s === "" || s === "-" || s === "R$ -" || s === "R$-") return 0;
  const negative = s.startsWith("-") || s.startsWith("(");
  s = s.replace(/^-/, "").replace(/^\(/, "").replace(/\)$/, "").replace(/^R\$\s*/, "").trim();
  if (s.includes(",") && s.indexOf(",") > s.lastIndexOf(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negative ? -n : n;
}

function parsePct(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val <= 1 ? val * 100 : val;
  const s = String(val).trim().replace("%", "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseMonthYear(val: any): { mes: number; ano: number } | null {
  if (!val) return null;
  const s = String(val).trim().toLowerCase();
  const match = s.match(/^(\w+),?\s*(\d{4})$/);
  if (match) {
    const mes = MONTH_MAP[match[1]];
    const year = parseInt(match[2]);
    if (mes && year) return { mes, ano: year };
  }
  return null;
}

// GET /api/lancamentos?cliente_id=X&mes=X&ano=X
// GET /api/lancamentos?cliente_id=X&ano=X
// GET /api/lancamentos?cliente_id=X&ano=X&mes_lt=X
router.get("/", async (req: AuthRequest, res: Response) => {
  const { cliente_id, mes, ano, mes_lt } = req.query;
  if (!cliente_id) return res.status(400).json({ message: "cliente_id obrigatório" });

  let query = `SELECT * FROM lancamentos_mensais WHERE cliente_id = $1`;
  const params: any[] = [cliente_id];

  if (mes) {
    params.push(Number(mes));
    query += ` AND mes_referencia = $${params.length}`;
  }
  if (ano) {
    params.push(Number(ano));
    query += ` AND ano_referencia = $${params.length}`;
  }
  if (mes_lt) {
    params.push(Number(mes_lt));
    query += ` AND mes_referencia < $${params.length}`;
  }

  query += ` ORDER BY mes_referencia`;

  const { rows } = await db.query(query, params);
  const result = mes ? (rows[0] || null) : rows;
  return res.json(result);
});

// GET /api/lancamentos/:id
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const { rows } = await db.query("SELECT * FROM lancamentos_mensais WHERE id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Lançamento não encontrado" });
  return res.json(rows[0]);
});

// POST /api/lancamentos  (upsert)
router.post("/", async (req: AuthRequest, res: Response) => {
  const data = req.body;
  const numFields = [
    "receita_prevista_ano","receita_realizada","despesa_fixada","despesa_empenhada_f1","despesa_empenhada_f2",
    "despesa_liquidada","despesa_paga","caixa","despesa_nao_processada","despesa_processada",
    "consignacoes_tesouraria","resto_nao_processado","resto_processado",
    "supl_anulacao_perc","supl_anulacao_autorizada","supl_anulacao_utilizado",
    "supl_superavit_perc","superavit_exerc_anterior","supl_superavit_autorizada","supl_superavit_utilizado",
    "supl_excesso_perc","excesso_projetado","supl_excesso_utilizado",
    "receita_impostos","aplicacao_educacao","receita_fundeb","aplicacao_fundeb_70",
    "receita_impostos_saude","aplicacao_saude","receita_corrente_liquida","gasto_pessoal",
  ];

  const fields = ["cliente_id","mes_referencia","ano_referencia","status","observacoes","criado_por"];
  const values: any[] = [
    data.cliente_id, data.mes_referencia, data.ano_referencia,
    data.status || "rascunho", data.observacoes || null, data.criado_por || null,
  ];

  for (const f of numFields) {
    fields.push(f);
    values.push(data[f] ?? null);
  }

  const cols = fields.join(", ");
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");
  const updates = fields.slice(3).map((f, i) => `${f} = $${i + 4}`).join(", ");

  try {
    const { rows } = await db.query(
      `INSERT INTO lancamentos_mensais (${cols}) VALUES (${placeholders})
       ON CONFLICT (cliente_id, mes_referencia, ano_referencia)
       DO UPDATE SET ${updates}
       RETURNING *`,
      values
    );
    return res.status(201).json(rows[0]);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
});

// PUT /api/lancamentos/:id
router.put("/:id", async (req: AuthRequest, res: Response) => {
  const data = req.body;
  const numFields = [
    "receita_prevista_ano","receita_realizada","despesa_fixada","despesa_empenhada_f1","despesa_empenhada_f2",
    "despesa_liquidada","despesa_paga","caixa","despesa_nao_processada","despesa_processada",
    "consignacoes_tesouraria","resto_nao_processado","resto_processado",
    "supl_anulacao_perc","supl_anulacao_autorizada","supl_anulacao_utilizado",
    "supl_superavit_perc","superavit_exerc_anterior","supl_superavit_autorizada","supl_superavit_utilizado",
    "supl_excesso_perc","excesso_projetado","supl_excesso_utilizado",
    "receita_impostos","aplicacao_educacao","receita_fundeb","aplicacao_fundeb_70",
    "receita_impostos_saude","aplicacao_saude","receita_corrente_liquida","gasto_pessoal",
  ];

  const sets: string[] = ["status = $1", "observacoes = $2"];
  const values: any[] = [data.status || "rascunho", data.observacoes || null];

  for (const f of numFields) {
    values.push(data[f] ?? null);
    sets.push(`${f} = $${values.length}`);
  }
  values.push(req.params.id);

  try {
    const { rows } = await db.query(
      `UPDATE lancamentos_mensais SET ${sets.join(", ")}, atualizado_em=NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
});

// POST /api/lancamentos/importar
router.post("/importar", async (req: AuthRequest, res: Response) => {
  const { rows: inputRows } = req.body;
  if (!Array.isArray(inputRows)) return res.status(400).json({ message: "rows deve ser um array" });

  const { rows: clientes } = await db.query(
    `SELECT c.id, m.codigo_ibge, m.nome FROM clientes c JOIN municipios m ON m.id = c.municipio_id`
  );
  const ibgeLookup: Record<number, string> = {};
  const nomeLookup: Record<string, string> = {};
  for (const c of clientes) {
    ibgeLookup[c.codigo_ibge] = c.id;
    nomeLookup[c.nome] = c.id;
  }

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];
  const skippedMunicipios = new Set<string>();
  const batch: any[] = [];

  const moneyFields = [
    "receita_prevista_ano","receita_realizada","despesa_fixada","despesa_empenhada_f1","despesa_empenhada_f2",
    "despesa_liquidada","despesa_paga","caixa","despesa_nao_processada","despesa_processada",
    "consignacoes_tesouraria","resto_nao_processado","resto_processado",
    "supl_anulacao_autorizada","supl_anulacao_utilizado","superavit_exerc_anterior",
    "supl_superavit_autorizada","supl_superavit_utilizado","excesso_projetado","supl_excesso_utilizado",
    "aplicacao_educacao","aplicacao_saude",
  ];
  const pctFields = ["supl_anulacao_perc","supl_superavit_perc","supl_excesso_perc"];

  for (const row of inputRows) {
    const municipioNome = String(row.municipio || "").trim();
    let ibge = row.ibge;
    const mesRef = row.mes_ref;

    if (!municipioNome || !mesRef) { skipped++; continue; }
    const parsed = parseMonthYear(mesRef);
    if (!parsed) { skipped++; continue; }

    if (IBGE_CORRECTIONS[municipioNome]) ibge = IBGE_CORRECTIONS[municipioNome];
    const clienteId = ibgeLookup[Number(ibge)] || nomeLookup[municipioNome];
    if (!clienteId) { skippedMunicipios.add(municipioNome); skipped++; continue; }

    const record: any = { cliente_id: clienteId, ano_referencia: parsed.ano, mes_referencia: parsed.mes, status: "rascunho" };
    for (const f of moneyFields) { if (row[f] !== undefined) record[f] = parseMoney(row[f]); }
    for (const f of pctFields) { if (row[f] !== undefined) record[f] = parsePct(row[f]); }
    batch.push(record);
  }

  for (const record of batch) {
    const fields = Object.keys(record);
    const vals = Object.values(record);
    const cols = fields.join(", ");
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");
    const updates = fields.filter(f => f !== "cliente_id" && f !== "ano_referencia" && f !== "mes_referencia")
      .map(f => `${f} = EXCLUDED.${f}`).join(", ");

    try {
      await db.query(
        `INSERT INTO lancamentos_mensais (${cols}) VALUES (${placeholders})
         ON CONFLICT (cliente_id, mes_referencia, ano_referencia)
         DO UPDATE SET ${updates}`,
        vals
      );
      inserted++;
    } catch (err: any) {
      errors.push(err.message);
    }
  }

  return res.json({
    sucesso: true,
    total: inserted,
    ignorados: skipped,
    municipios_sem_cliente: Array.from(skippedMunicipios),
    erros: errors.slice(0, 20),
  });
});

export default router;
