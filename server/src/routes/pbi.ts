// -----------------------------------------------------------------------
// TCM-GO 2025 — Endpoints Power BI
// Expõe as views vw_pbi_* com filtragem por município/período.
// Autenticação via requireAuth (Bearer token).
// Para Power BI: use Web Connector com Authorization: Bearer <token>
// -----------------------------------------------------------------------

import { Router, Response } from "express";
import { db } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// ── Helper: resolve municipio_tcmgo_id a partir do cliente_id ──────────
async function resolverMunicipioTcmgo(
  usuarioId: string,
  perfil: string,
  clienteId: string
): Promise<number> {
  const { rows: [cliente] } = await db.query(
    `SELECT c.municipio_tcmgo_id, m.nome AS municipio_nome
     FROM clientes c
     JOIN municipios m ON m.id = c.municipio_id
     WHERE c.id = $1 AND c.status = true`,
    [clienteId]
  );

  if (!cliente) throw Object.assign(new Error("Cliente não encontrado."), { status: 404 });
  if (!cliente.municipio_tcmgo_id) {
    throw Object.assign(
      new Error(`Município "${cliente.municipio_nome}" sem código TCM-GO configurado.`),
      { status: 422 }
    );
  }

  if (perfil !== "Administrador") {
    const { rows: acesso } = await db.query(
      `SELECT 1 FROM usuario_municipios um
       JOIN clientes c ON c.municipio_id = um.municipio_id
       WHERE um.usuario_id = $1 AND c.id = $2 AND c.status = true`,
      [usuarioId, clienteId]
    );
    if (acesso.length === 0) {
      throw Object.assign(new Error("Sem permissão para acessar este município."), { status: 403 });
    }
  }

  return cliente.municipio_tcmgo_id as number;
}

// ── Helper: monta WHERE + params comuns das views ──────────────────────
function buildViewFilter(
  municipioTcmgoId: number,
  ano: string | undefined,
  mes: string | undefined,
  orgaoId: string | undefined
) {
  const params: any[] = [municipioTcmgoId];
  const conditions: string[] = ["municipio_id = $1"];

  if (ano) {
    params.push(parseInt(ano, 10));
    conditions.push(`ano_referencia = $${params.length}`);
  }
  if (mes) {
    params.push(parseInt(mes, 10));
    conditions.push(`mes_referencia = $${params.length}`);
  }
  if (orgaoId) {
    params.push(parseInt(orgaoId, 10));
    conditions.push(`orgao_id = $${params.length}`);
  }

  return { where: conditions.join(" AND "), params };
}

// ── Helper: paginação ──────────────────────────────────────────────────
function buildPagination(query: any): { limit: number; offset: number } {
  const limit = Math.min(parseInt(String(query.limit ?? "5000"), 10), 50000);
  const offset = parseInt(String(query.offset ?? "0"), 10);
  return { limit: isNaN(limit) ? 5000 : limit, offset: isNaN(offset) ? 0 : offset };
}

// ── Helper: executa query de view e retorna JSON ───────────────────────
async function queryView(
  req: AuthRequest,
  res: Response,
  viewName: string
) {
  const { cliente_id, ano, mes, orgao_id } = req.query;
  if (!cliente_id) return res.status(400).json({ mensagem: "cliente_id obrigatório." });

  try {
    const municipioTcmgoId = await resolverMunicipioTcmgo(
      req.usuario!.id, req.usuario!.perfil, String(cliente_id)
    );

    const { where, params } = buildViewFilter(
      municipioTcmgoId, String(ano ?? ""), String(mes ?? ""), orgao_id ? String(orgao_id) : undefined
    );
    const { limit, offset } = buildPagination(req.query);
    params.push(limit, offset);

    const { rows } = await db.query(
      `SELECT * FROM ${viewName}
       WHERE ${where}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ total: rows.length, data: rows });
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ mensagem: err.message });
  }
}

// ── Endpoints de cada view ─────────────────────────────────────────────

/**
 * GET /api/tcmgo/pbi/execucao_despesa
 * Parâmetros: cliente_id, ano, mes (opcional), orgao_id (opcional),
 *             limit (padrão 5000, máx 50000), offset (padrão 0)
 */
router.get("/execucao_despesa", (req: AuthRequest, res: Response) =>
  queryView(req, res, "vw_pbi_execucao_despesa")
);

/**
 * GET /api/tcmgo/pbi/execucao_receita
 */
router.get("/execucao_receita", (req: AuthRequest, res: Response) =>
  queryView(req, res, "vw_pbi_execucao_receita")
);

/**
 * GET /api/tcmgo/pbi/restos_pagar
 */
router.get("/restos_pagar", (req: AuthRequest, res: Response) =>
  queryView(req, res, "vw_pbi_restos_pagar")
);

/**
 * GET /api/tcmgo/pbi/alteracao_orcamentaria
 */
router.get("/alteracao_orcamentaria", (req: AuthRequest, res: Response) =>
  queryView(req, res, "vw_pbi_alteracao_orcamentaria")
);

/**
 * GET /api/tcmgo/pbi/extraorcamentario
 */
router.get("/extraorcamentario", (req: AuthRequest, res: Response) =>
  queryView(req, res, "vw_pbi_extraorcamentario")
);

/**
 * GET /api/tcmgo/pbi/lancamento_contabil
 */
router.get("/lancamento_contabil", (req: AuthRequest, res: Response) =>
  queryView(req, res, "vw_pbi_lancamento_contabil")
);

/**
 * GET /api/tcmgo/pbi/movimentacao_bancaria
 */
router.get("/movimentacao_bancaria", (req: AuthRequest, res: Response) =>
  queryView(req, res, "vw_pbi_movimentacao_bancaria")
);

/**
 * GET /api/tcmgo/pbi/sumario
 * Retorna totais agregados de todas as fato_* para o município/período,
 * consolidando apenas remessas ativas.
 */
router.get("/sumario", async (req: AuthRequest, res: Response) => {
  const { cliente_id, ano, mes, orgao_id } = req.query;
  if (!cliente_id) return res.status(400).json({ mensagem: "cliente_id obrigatório." });

  try {
    const municipioTcmgoId = await resolverMunicipioTcmgo(
      req.usuario!.id, req.usuario!.perfil, String(cliente_id)
    );

    const params: any[] = [municipioTcmgoId];
    let filter = "municipio_id = $1 AND ativa = TRUE";
    if (ano) { params.push(parseInt(String(ano), 10)); filter += ` AND ano_referencia = $${params.length}`; }
    if (mes) { params.push(parseInt(String(mes), 10)); filter += ` AND mes_referencia = $${params.length}`; }
    if (orgao_id) { params.push(parseInt(String(orgao_id), 10)); filter += ` AND orgao_id = $${params.length}`; }

    // Busca IDs das remessas ativas para o filtro
    const { rows: remessas } = await db.query(
      `SELECT id FROM tcmgo_remessa WHERE ${filter}`,
      params
    );

    if (remessas.length === 0) {
      return res.json({
        remessas_ativas: 0,
        empenho: { count: 0, total_empenhado: 0, total_anulado: 0 },
        liquidacao: { count: 0, total_liquidado: 0 },
        pagamento: { count: 0, total_pago: 0 },
        receita: { count: 0, total_previsto: 0, total_arrecadado: 0 },
        restos_pagar: { count: 0, total_inscrito: 0, total_pago: 0 },
        extraorcamentario: { count: 0, total_movimento: 0 },
        lancamento_contabil: { count: 0 },
      });
    }

    const remessaIds = remessas.map((r: any) => r.id);
    const idFilter = `remessa_id = ANY($1::int[])`;

    const [empQ, anulQ, lqdQ, pagQ, recQ, rspQ, extQ, lncQ] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_bruto),0) AS total FROM fato_empenho WHERE ${idFilter}`, [remessaIds]),
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_anulacao),0) AS total FROM fato_anulacao_empenho WHERE ${idFilter}`, [remessaIds]),
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_liquidacao),0) AS total FROM fato_liquidacao WHERE ${idFilter}`, [remessaIds]),
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_pagamento),0) AS total FROM fato_pagamento WHERE ${idFilter}`, [remessaIds]),
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_previsto_atualizado),0) AS previsto, COALESCE(SUM(vl_arrecadado),0) AS arrecadado FROM fato_receita WHERE ${idFilter}`, [remessaIds]),
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_inscrito),0) AS inscrito, COALESCE(SUM(vl_pago),0) AS pago FROM fato_restos_pagar WHERE ${idFilter}`, [remessaIds]),
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_movimento),0) AS total FROM fato_extraorcamentario WHERE ${idFilter}`, [remessaIds]),
      db.query(`SELECT COUNT(*)::int AS cnt FROM fato_lancamento_contabil WHERE ${idFilter}`, [remessaIds]),
    ]);

    return res.json({
      remessas_ativas: remessas.length,
      empenho: {
        count: empQ.rows[0].cnt,
        total_empenhado: Number(empQ.rows[0].total),
        total_anulado: Number(anulQ.rows[0].total),
        saldo_liquido: Number(empQ.rows[0].total) - Number(anulQ.rows[0].total),
      },
      liquidacao: {
        count: lqdQ.rows[0].cnt,
        total_liquidado: Number(lqdQ.rows[0].total),
      },
      pagamento: {
        count: pagQ.rows[0].cnt,
        total_pago: Number(pagQ.rows[0].total),
      },
      receita: {
        count: recQ.rows[0].cnt,
        total_previsto: Number(recQ.rows[0].previsto),
        total_arrecadado: Number(recQ.rows[0].arrecadado),
      },
      restos_pagar: {
        count: rspQ.rows[0].cnt,
        total_inscrito: Number(rspQ.rows[0].inscrito),
        total_pago: Number(rspQ.rows[0].pago),
      },
      extraorcamentario: {
        count: extQ.rows[0].cnt,
        total_movimento: Number(extQ.rows[0].total),
      },
      lancamento_contabil: {
        count: lncQ.rows[0].cnt,
      },
    });
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ mensagem: err.message });
  }
});

export default router;
