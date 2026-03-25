import { Router, Response } from "express";
import { db } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Mesmo helper usado em pbi.ts — resolve cliente_id → tcmgo_municipios.id
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
  if (!cliente.municipio_tcmgo_id)
    throw Object.assign(
      new Error(`Município "${cliente.municipio_nome}" sem código TCM-GO configurado.`),
      { status: 422 }
    );

  if (perfil !== "Administrador") {
    const { rows: acesso } = await db.query(
      `SELECT 1 FROM usuario_municipios um
       JOIN clientes c ON c.municipio_id = um.municipio_id
       WHERE um.usuario_id = $1 AND c.id = $2 AND c.status = true`,
      [usuarioId, clienteId]
    );
    if (acesso.length === 0)
      throw Object.assign(new Error("Sem permissão para acessar este município."), { status: 403 });
  }
  return cliente.municipio_tcmgo_id as number;
}

/**
 * GET /api/paineis/extraorcamentario/inss-rpps
 * Query: cliente_id, ano, sub_tipo? ('001'=INSS | '002'=RPPS | omitido=ambos)
 *
 * categoria '0' = Receita  |  categoria '1' = Despesa
 * tipo_lancamento = '01' (Depósitos e Consignações)
 */
router.get("/extraorcamentario/inss-rpps", async (req: AuthRequest, res: Response) => {
  const { cliente_id, ano, sub_tipo } = req.query;

  if (!cliente_id || !ano) {
    return res.status(400).json({ message: "cliente_id e ano são obrigatórios" });
  }

  let municipioTcmgoId: number;
  try {
    municipioTcmgoId = await resolverMunicipioTcmgo(
      req.usuario!.id,
      req.usuario!.perfil,
      cliente_id as string
    );
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ message: err.message });
  }

  // Monta filtros dinâmicos de sub_tipo (alias difere entre as queries)
  const extSubTipoClause = sub_tipo
    ? `AND e.sub_tipo = $3`
    : `AND e.sub_tipo IN ('001', '002')`;
  const aexSubTipoClause = sub_tipo
    ? `AND a.sub_tipo = $3`
    : `AND a.sub_tipo IN ('001', '002')`;
  const params: any[] = [municipioTcmgoId, ano];
  if (sub_tipo) params.push(sub_tipo);

  try {
    // ── Lançamentos originais agrupados por mês + órgão ──────────────────────
    const extSql = `
      SELECT
        e.mes_referencia,
        e.cod_orgao,
        COALESCE(o.descricao_orgao, e.cod_orgao) AS nome_orgao,
        e.cod_unidade,
        e.categoria,
        e.sub_tipo,
        e.nr_extra_orcamentaria,
        e.desc_extra_orc,
        e.vl_lancamento
      FROM fato_extraorcamentario e
      LEFT JOIN tcmgo_orgaos o
        ON o.codigo_orgao = LTRIM(e.cod_orgao, '0')
       AND o.municipio_tcmgo_id = e.municipio_id
      WHERE e.municipio_id = $1
        AND e.ano_referencia = $2
        AND e.tipo_lancamento = '01'
        ${extSubTipoClause}
      ORDER BY e.mes_referencia, e.cod_orgao, e.nr_extra_orcamentaria
    `;

    // ── Anulações agrupadas por mês + órgão + categoria ──────────────────────
    const aexSql = `
      SELECT
        a.mes_referencia,
        a.cod_orgao,
        a.categoria,
        COALESCE(SUM(a.vl_anulacao), 0) AS total_anulacao
      FROM fato_anulacao_extraorcamentario a
      WHERE a.municipio_id = $1
        AND a.ano_referencia = $2
        AND a.tipo_lancamento = '01'
        ${aexSubTipoClause}
      GROUP BY a.mes_referencia, a.cod_orgao, a.categoria
    `;

    const [extResult, aexResult] = await Promise.all([
      db.query(extSql, params),
      db.query(aexSql, params),
    ]);

    const lancamentos = extResult.rows;
    const anulacoes = aexResult.rows;

    // Índice de anulações: "mes-orgao-categoria" → total
    const aexIdx = new Map<string, number>();
    for (const a of anulacoes) {
      aexIdx.set(`${a.mes_referencia}-${a.cod_orgao}-${a.categoria}`, Number(a.total_anulacao));
    }

    // ── Agregar por mês → órgão ───────────────────────────────────────────────
    // Estrutura: mesMap[mes][orgao] = { receita, despesa, anulacao_receita, anulacao_despesa, lancamentos[] }
    type OrgaoData = {
      cod_orgao: string;
      nome_orgao: string;
      receita: number;
      despesa: number;
      anulacao_receita: number;
      anulacao_despesa: number;
      lancamentos: typeof lancamentos;
    };
    type MesData = {
      mes: number;
      orgaos: Map<string, OrgaoData>;
    };

    const mesMap = new Map<number, MesData>();

    for (const row of lancamentos) {
      const mes = Number(row.mes_referencia);
      if (!mesMap.has(mes)) mesMap.set(mes, { mes, orgaos: new Map() });
      const mesData = mesMap.get(mes)!;

      const orgao = row.cod_orgao ?? "??";
      if (!mesData.orgaos.has(orgao)) {
        mesData.orgaos.set(orgao, {
          cod_orgao: orgao,
          nome_orgao: row.nome_orgao ?? orgao,
          receita: 0,
          despesa: 0,
          anulacao_receita: aexIdx.get(`${mes}-${orgao}-0`) ?? 0,
          anulacao_despesa: aexIdx.get(`${mes}-${orgao}-1`) ?? 0,
          lancamentos: [],
        });
      }
      const orgaoData = mesData.orgaos.get(orgao)!;
      const valor = Number(row.vl_lancamento ?? 0);

      if (row.categoria === "0") orgaoData.receita += valor;
      else orgaoData.despesa += valor;

      orgaoData.lancamentos.push({
        nr_extra_orcamentaria: row.nr_extra_orcamentaria,
        cod_orgao: row.cod_orgao,
        cod_unidade: row.cod_unidade,
        categoria: row.categoria,
        sub_tipo: row.sub_tipo,
        desc_extra_orc: row.desc_extra_orc,
        vl_lancamento: Number(row.vl_lancamento ?? 0),
      });
    }

    // ── Montar response final (12 meses garantidos) ────────────────────────────
    const MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const por_mes = MESES.map((mes) => {
      const mesData = mesMap.get(mes);
      const por_orgao = mesData
        ? Array.from(mesData.orgaos.values()).map((o) => ({
            ...o,
            diferenca: o.receita - o.anulacao_receita - o.despesa - o.anulacao_despesa,
          }))
        : [];

      const receita        = por_orgao.reduce((s, o) => s + o.receita, 0);
      const despesa        = por_orgao.reduce((s, o) => s + o.despesa, 0);
      const anulacao_receita = por_orgao.reduce((s, o) => s + o.anulacao_receita, 0);
      const anulacao_despesa = por_orgao.reduce((s, o) => s + o.anulacao_despesa, 0);

      return {
        mes,
        receita,
        despesa,
        anulacao_receita,
        anulacao_despesa,
        diferenca: receita - anulacao_receita - despesa - anulacao_despesa,
        por_orgao,
      };
    });

    return res.json({ por_mes });
  } catch (err: any) {
    console.error("[paineis] erro:", err.message);
    return res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/paineis/financeiro/saldos-bancarios
 * Query: cliente_id, ano, mes?, cod_orgao?, tipo_conta?, cod_fonte_recurso?
 */
router.get("/financeiro/saldos-bancarios", async (req: AuthRequest, res: Response) => {
  const { cliente_id, ano, mes, cod_orgao, tipo_conta, cod_fonte_recurso } = req.query;

  if (!cliente_id || !ano) {
    return res.status(400).json({ message: "cliente_id e ano são obrigatórios" });
  }

  let municipioTcmgoId: number;
  try {
    municipioTcmgoId = await resolverMunicipioTcmgo(req.usuario!.id, req.usuario!.perfil, cliente_id as string);
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ message: err.message });
  }

  try {
    const usaFonte = !!cod_fonte_recurso;

    // ── Parâmetros base ────────────────────────────────────────────────────────
    const baseParams: any[] = [municipioTcmgoId, ano];
    let pIdx = 3;

    const mesClause     = mes         ? `AND f.mes_referencia = $${pIdx++}`    : "";
    const orgaoClause   = cod_orgao   ? `AND TRIM(f.cod_orgao) = $${pIdx++}`   : "";
    const tipoClause    = tipo_conta  ? `AND TRIM(f.tipo_conta) = $${pIdx++}`  : "";

    if (mes)        baseParams.push(Number(mes));
    if (cod_orgao)  baseParams.push(String(cod_orgao));
    if (tipo_conta) baseParams.push(String(tipo_conta));

    // ── Query principal (contas) ───────────────────────────────────────────────
    let contasSql: string;
    let contasParams: any[];

    if (!usaFonte) {
      // CTB.10 — consolidado por conta
      contasSql = `
        SELECT
          TRIM(f.cod_orgao) AS cod_orgao,
          COALESCE(o.descricao_orgao, TRIM(f.cod_orgao)) AS nome_orgao,
          TRIM(f.cod_unidade) AS cod_unidade,
          LPAD(TRIM(f.banco),3,'0') AS banco,
          COALESCE(b.descricao, TRIM(f.banco)) AS nome_banco,
          TRIM(f.agencia) AS agencia,
          TRIM(f.conta_corrente) AS conta_corrente,
          TRIM(f.conta_corrente_dv) AS conta_corrente_dv,
          TRIM(f.tipo_conta) AS tipo_conta,
          COALESCE(t.descricao, TRIM(f.tipo_conta)) AS desc_tipo_conta,
          NULL AS cod_fonte_recurso,
          f.saldo_inicial, f.vl_entradas, f.vl_saidas, f.saldo_final
        FROM fato_conta_bancaria f
        LEFT JOIN tcmgo_orgaos o
          ON LTRIM(o.codigo_orgao,'0') = LTRIM(f.cod_orgao,'0')
          AND o.municipio_tcmgo_id = f.municipio_id
        LEFT JOIN dom_instituicao_bancaria b ON b.codigo = LPAD(TRIM(f.banco),3,'0')
        LEFT JOIN dom_tipo_conta_bancaria t ON t.codigo = TRIM(f.tipo_conta)
        WHERE f.municipio_id = $1 AND f.ano_referencia = $2
          ${mesClause} ${orgaoClause} ${tipoClause}
        ORDER BY nome_orgao, nome_banco, f.conta_corrente
      `;
      contasParams = [...baseParams];
    } else {
      // CTB.11 — com fonte de recurso
      let pFonteIdx = 3;
      const fonteParams: any[] = [municipioTcmgoId, ano];
      const mesCF     = mes         ? `AND a.mes_referencia = $${pFonteIdx++}`   : "";
      const orgaoCF   = cod_orgao   ? `AND TRIM(a.cod_orgao) = $${pFonteIdx++}` : "";
      const tipoCF    = tipo_conta  ? `AND TRIM(a.tipo_conta) = $${pFonteIdx++}`: "";
      const fonteCF   = `AND TRIM(a.cod_fonte_recurso) = $${pFonteIdx++}`;
      if (mes)              fonteParams.push(Number(mes));
      if (cod_orgao)        fonteParams.push(String(cod_orgao));
      if (tipo_conta)       fonteParams.push(String(tipo_conta));
      fonteParams.push(String(cod_fonte_recurso));

      contasSql = `
        SELECT
          TRIM(a.cod_orgao) AS cod_orgao,
          COALESCE(o.descricao_orgao, TRIM(a.cod_orgao)) AS nome_orgao,
          TRIM(a.cod_unidade) AS cod_unidade,
          LPAD(TRIM(a.banco),3,'0') AS banco,
          COALESCE(b.descricao, TRIM(a.banco)) AS nome_banco,
          TRIM(a.agencia) AS agencia,
          TRIM(a.conta_corrente) AS conta_corrente,
          TRIM(a.conta_corrente_dv) AS conta_corrente_dv,
          TRIM(a.tipo_conta) AS tipo_conta,
          COALESCE(t.descricao, TRIM(a.tipo_conta)) AS desc_tipo_conta,
          TRIM(a.cod_fonte_recurso) AS cod_fonte_recurso,
          a.saldo_inicial, a.vl_entradas, a.vl_saidas, a.saldo_final
        FROM fato_conta_bancaria_aplicacao a
        LEFT JOIN tcmgo_orgaos o
          ON LTRIM(o.codigo_orgao,'0') = LTRIM(a.cod_orgao,'0')
          AND o.municipio_tcmgo_id = a.municipio_id
        LEFT JOIN dom_instituicao_bancaria b ON b.codigo = LPAD(TRIM(a.banco),3,'0')
        LEFT JOIN dom_tipo_conta_bancaria t ON t.codigo = TRIM(a.tipo_conta)
        WHERE a.municipio_id = $1 AND a.ano_referencia = $2
          ${mesCF} ${orgaoCF} ${tipoCF} ${fonteCF}
        ORDER BY nome_orgao, nome_banco, a.conta_corrente
      `;
      contasParams = fonteParams;
    }

    // ── Evolução mensal (sempre CTB.10) ───────────────────────────────────────
    const evolucaoSql = `
      SELECT mes_referencia AS mes, SUM(saldo_final) AS saldo_final
      FROM fato_conta_bancaria
      WHERE municipio_id = $1 AND ano_referencia = $2
      GROUP BY mes_referencia ORDER BY mes_referencia
    `;

    // ── Por tipo de conta ─────────────────────────────────────────────────────
    const tipoSql = `
      SELECT COALESCE(t.descricao, TRIM(f.tipo_conta)) AS tipo_conta,
             SUM(f.saldo_final) AS total
      FROM fato_conta_bancaria f
      LEFT JOIN dom_tipo_conta_bancaria t ON t.codigo = TRIM(f.tipo_conta)
      WHERE f.municipio_id = $1 AND f.ano_referencia = $2 ${mesClause}
      GROUP BY COALESCE(t.descricao, TRIM(f.tipo_conta))
      ORDER BY total DESC
    `;
    const tipoParams = [municipioTcmgoId, ano, ...(mes ? [Number(mes)] : [])];

    // ── Por órgão ─────────────────────────────────────────────────────────────
    const orgaoSql = `
      SELECT COALESCE(o.descricao_orgao, TRIM(f.cod_orgao)) AS orgao,
             SUM(f.vl_entradas) AS entradas,
             SUM(f.vl_saidas) AS saidas
      FROM fato_conta_bancaria f
      LEFT JOIN tcmgo_orgaos o ON LTRIM(o.codigo_orgao,'0') = LTRIM(f.cod_orgao,'0') AND o.municipio_tcmgo_id = f.municipio_id
      WHERE f.municipio_id = $1 AND f.ano_referencia = $2 ${mesClause}
      GROUP BY COALESCE(o.descricao_orgao, TRIM(f.cod_orgao))
      ORDER BY (SUM(f.vl_entradas) + SUM(f.vl_saidas)) DESC
      LIMIT 10
    `;

    // ── Por fonte de recurso (CTB.11) ─────────────────────────────────────────
    const fonteSql = `
      SELECT
        TRIM(a.cod_fonte_recurso) AS fonte,
        SUM(a.saldo_final) AS total
      FROM fato_conta_bancaria_aplicacao a
      WHERE a.municipio_id = $1 AND a.ano_referencia = $2 ${mes ? `AND a.mes_referencia = $3` : ""}
      GROUP BY TRIM(a.cod_fonte_recurso)
      HAVING SUM(a.saldo_final) > 0
      ORDER BY total DESC
      LIMIT 20
    `;
    const fonteParams = [municipioTcmgoId, ano, ...(mes ? [Number(mes)] : [])];

    // ── Opções de filtros ─────────────────────────────────────────────────────
    const orgaosOpcoesSql = `
      SELECT DISTINCT TRIM(f.cod_orgao) AS cod_orgao,
             COALESCE(o.descricao_orgao, TRIM(f.cod_orgao)) AS nome_orgao
      FROM fato_conta_bancaria f
      LEFT JOIN tcmgo_orgaos o ON LTRIM(o.codigo_orgao,'0') = LTRIM(f.cod_orgao,'0') AND o.municipio_tcmgo_id = f.municipio_id
      WHERE f.municipio_id = $1 AND f.ano_referencia = $2
      ORDER BY nome_orgao
    `;
    const tiposOpcoesSql = `SELECT codigo, descricao FROM dom_tipo_conta_bancaria WHERE ativo = true ORDER BY codigo`;
    const fontesOpcoesSql = `
      SELECT DISTINCT TRIM(cod_fonte_recurso) AS fonte
      FROM fato_conta_bancaria_aplicacao
      WHERE municipio_id = $1 AND ano_referencia = $2
      ORDER BY fonte
    `;

    const [contasRes, evolRes, tipoRes, orgaoRes, fonteRes, orgaosOpcoes, tiposOpcoes, fontesOpcoes] = await Promise.all([
      db.query(contasSql, contasParams),
      db.query(evolucaoSql, [municipioTcmgoId, ano]),
      db.query(tipoSql, tipoParams),
      db.query(orgaoSql, tipoParams),
      db.query(fonteSql, fonteParams),
      db.query(orgaosOpcoesSql, [municipioTcmgoId, ano]),
      db.query(tiposOpcoesSql),
      db.query(fontesOpcoesSql, [municipioTcmgoId, ano]),
    ]);

    const contas = contasRes.rows.map((r) => ({
      ...r,
      saldo_inicial: Number(r.saldo_inicial ?? 0),
      vl_entradas:   Number(r.vl_entradas   ?? 0),
      vl_saidas:     Number(r.vl_saidas     ?? 0),
      saldo_final:   Number(r.saldo_final   ?? 0),
    }));

    const kpis = contas.reduce(
      (acc, c) => ({
        saldo_inicial: acc.saldo_inicial + c.saldo_inicial,
        vl_entradas:   acc.vl_entradas   + c.vl_entradas,
        vl_saidas:     acc.vl_saidas     + c.vl_saidas,
        saldo_final:   acc.saldo_final   + c.saldo_final,
      }),
      { saldo_inicial: 0, vl_entradas: 0, vl_saidas: 0, saldo_final: 0 }
    );

    return res.json({
      kpis,
      contas,
      evolucao_mensal: evolRes.rows.map((r) => ({
        mes: Number(r.mes),
        saldo_final: Number(r.saldo_final),
      })),
      por_tipo_conta: tipoRes.rows.map((r) => ({
        tipo_conta: r.tipo_conta,
        total: Number(r.total),
      })),
      por_fonte: fonteRes.rows.map((r) => ({
        fonte: r.fonte as string,
        total: Number(r.total),
      })),
      por_orgao: orgaoRes.rows.map((r) => ({
        orgao: r.orgao,
        entradas: Number(r.entradas),
        saidas: Number(r.saidas),
      })),
      opcoes: {
        orgaos: orgaosOpcoes.rows,
        tipos_conta: tiposOpcoes.rows,
        fontes: fontesOpcoes.rows.map((r: any) => r.fonte),
      },
    });
  } catch (err: any) {
    console.error("[paineis/saldos-bancarios] erro:", err.message);
    return res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/paineis/orcamentario/alteracoes-orcamentarias
// Query: cliente_id, ano, meses?, orgaos?, tipos_alteracao?, fontes?, cod_natureza_despesa?
// ─────────────────────────────────────────────────────────────────────────────
router.get("/orcamentario/alteracoes-orcamentarias", async (req: AuthRequest, res: Response) => {
  const { cliente_id, ano, meses, orgaos, tipos_alteracao, fontes, cod_natureza_despesa } = req.query;

  if (!cliente_id || !ano) {
    return res.status(400).json({ message: "cliente_id e ano são obrigatórios" });
  }

  let municipioId: number;
  try {
    municipioId = await resolverMunicipioTcmgo(req.usuario!.id, req.usuario!.perfil, cliente_id as string);
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ message: err.message });
  }

  // ── Parse filtros ──────────────────────────────────────────────────────────
  const mesesArr   = meses   ? String(meses).split(",").map(Number).filter(n => n >= 1 && n <= 12) : [];
  const orgaosArr  = orgaos  ? String(orgaos).split(",").filter(Boolean) : [];
  const tiposArr   = tipos_alteracao ? String(tipos_alteracao).split(",").filter(Boolean) : [];
  const fontesArr  = fontes  ? String(fontes).split(",").filter(Boolean) : [];
  const natureza   = cod_natureza_despesa ? String(cod_natureza_despesa).trim() : "";

  // ── WHERE dinâmico para fato_alteracao_orcamentaria_fonte ──────────────────
  const buildWhere = (alias: string, includeMes = true) => {
    const p: any[] = [municipioId, ano];
    let w = "";
    let i = 3;
    if (includeMes && mesesArr.length > 0) { w += ` AND ${alias}.mes_referencia = ANY($${i})`; p.push(mesesArr); i++; }
    if (orgaosArr.length  > 0) { w += ` AND ${alias}.cod_orgao = ANY($${i})`; p.push(orgaosArr); i++; }
    if (tiposArr.length   > 0) { w += ` AND ${alias}.tipo_alteracao = ANY($${i})`; p.push(tiposArr); i++; }
    if (fontesArr.length  > 0) { w += ` AND ${alias}.cod_fonte_recurso = ANY($${i})`; p.push(fontesArr); i++; }
    if (natureza) { w += ` AND ${alias}.cod_natureza_despesa ILIKE $${i}`; p.push(`%${natureza}%`); i++; }
    return { p, w };
  };

  const { p, w }        = buildWhere("f");
  const { p: pEv, w: wEv } = buildWhere("f", false); // evolução: sem filtro de mês

  // WHERE receita: só municipio + ano + meses
  const pRec: any[] = [municipioId, ano];
  let wRec = "";
  if (mesesArr.length > 0) { wRec = ` AND r.mes_referencia = ANY($3)`; pRec.push(mesesArr); }

  try {
    const [kpiRes, receitaRes, gridRes, evolucaoRes, orgaoRes, fonteRes, atosRes,
           opOrgaosRes, opFontesRes, opMesesRes, opTiposRes] = await Promise.all([

      // 1. KPIs principais
      db.query(`
        SELECT
          COALESCE(SUM(f.vl_saldo_ant_fonte),  0) AS vl_saldo_ant_fonte,
          COALESCE(SUM(f.vl_alteracao_fonte),  0) AS vl_alteracao_fonte,
          COALESCE(SUM(f.vl_saldo_atual_fonte),0) AS vl_saldo_atual_fonte,
          COUNT(DISTINCT f.nr_alteracao)           AS qtd_alteracoes
        FROM fato_alteracao_orcamentaria_fonte f
        WHERE f.municipio_id = $1 AND f.ano_referencia = $2${w}
      `, p),

      // 2. Receita prevista (para % da receita)
      db.query(`
        SELECT COALESCE(SUM(r.vl_previsto_atualizado), 0) AS vl_previsto_atualizado
        FROM fato_receita r
        WHERE r.municipio_id = $1 AND r.ano_referencia = $2${wRec}
      `, pRec),

      // 3. Grid por tipo de alteração (todos os tipos do domínio)
      db.query(`
        SELECT
          t.codigo, t.descricao,
          COALESCE(sub.vl_saldo_ant_fonte,  0) AS vl_saldo_ant_fonte,
          COALESCE(sub.vl_alteracao_fonte,  0) AS vl_alteracao_fonte,
          COALESCE(sub.vl_saldo_atual_fonte,0) AS vl_saldo_atual_fonte
        FROM dom_tipo_alteracao_orcamentaria t
        LEFT JOIN (
          SELECT f.tipo_alteracao,
            SUM(f.vl_saldo_ant_fonte)  AS vl_saldo_ant_fonte,
            SUM(f.vl_alteracao_fonte)  AS vl_alteracao_fonte,
            SUM(f.vl_saldo_atual_fonte) AS vl_saldo_atual_fonte
          FROM fato_alteracao_orcamentaria_fonte f
          WHERE f.municipio_id = $1 AND f.ano_referencia = $2${w}
          GROUP BY f.tipo_alteracao
        ) sub ON sub.tipo_alteracao = t.codigo
        WHERE t.ativo = true
        ORDER BY t.codigo
      `, p),

      // 4. Evolução mensal (sem filtro de mês para mostrar todos os meses)
      db.query(`
        SELECT
          f.mes_referencia AS mes,
          COALESCE(SUM(f.vl_alteracao_fonte),  0) AS vl_alteracao_fonte,
          COALESCE(SUM(f.vl_saldo_atual_fonte),0) AS vl_saldo_atual_fonte
        FROM fato_alteracao_orcamentaria_fonte f
        WHERE f.municipio_id = $1 AND f.ano_referencia = $2${wEv}
        GROUP BY f.mes_referencia ORDER BY f.mes_referencia
      `, pEv),

      // 5. Por órgão (top 10)
      db.query(`
        SELECT
          f.cod_orgao,
          COALESCE(MAX(o.desc_orgao), 'Órgão ' || f.cod_orgao) AS desc_orgao,
          COALESCE(SUM(f.vl_alteracao_fonte), 0) AS vl_alteracao_fonte
        FROM fato_alteracao_orcamentaria_fonte f
        LEFT JOIN fato_orgao o
          ON o.municipio_id = f.municipio_id AND o.ano_referencia = f.ano_referencia AND o.cod_orgao = f.cod_orgao
        WHERE f.municipio_id = $1 AND f.ano_referencia = $2${w}
        GROUP BY f.cod_orgao
        ORDER BY vl_alteracao_fonte DESC LIMIT 10
      `, p),

      // 6. Por fonte (top 10)
      db.query(`
        SELECT
          f.cod_fonte_recurso,
          COALESCE(d.nomenclatura_fonte_tcm, 'Fonte ' || f.cod_fonte_recurso) AS nomenclatura,
          COALESCE(SUM(f.vl_alteracao_fonte), 0) AS vl_alteracao_fonte
        FROM fato_alteracao_orcamentaria_fonte f
        LEFT JOIN dom_fonte_tcm_v2 d ON d.cod_fonte_tcm = f.cod_fonte_recurso
        WHERE f.municipio_id = $1 AND f.ano_referencia = $2${w}
        GROUP BY f.cod_fonte_recurso, d.nomenclatura_fonte_tcm
        ORDER BY vl_alteracao_fonte DESC LIMIT 10
      `, p),

      // 7. Atos legais (Bloco 4)
      db.query(`
        SELECT
          a.subtipo,
          a.mes_referencia,
          CASE a.subtipo
            WHEN '90' THEN 'Lei de Suplementação'
            WHEN '91' THEN 'Lei de Crédito Especial'
            WHEN '92' THEN 'Lei para Realocação de Recursos'
            WHEN '93' THEN 'Lei de Alteração do PPA'
            WHEN '94' THEN 'Decreto de Abertura de Créditos'
          END AS tipo_ato,
          CASE a.subtipo
            WHEN '90' THEN a.nr_lei_suplementacao
            WHEN '91' THEN a.nr_lei_credito_esp
            WHEN '92' THEN a.nr_lei_realoc
            WHEN '93' THEN a.nr_lei_alt_ppa
            WHEN '94' THEN a.nr_decreto
          END AS numero,
          CASE a.subtipo
            WHEN '90' THEN a.data_lei_suplementacao
            WHEN '91' THEN a.data_lei_credito_esp
            WHEN '92' THEN a.data_lei_realoc
            WHEN '93' THEN a.data_lei_alt_ppa
            WHEN '94' THEN a.data_decreto
          END AS data_ato,
          COALESCE(a.vl_autorizado, a.vl_decreto) AS vl_autorizado,
          a.tipo_credito
        FROM fato_aoc_ato a
        WHERE a.municipio_id = $1 AND a.ano_referencia = $2
          ${mesesArr.length > 0 ? "AND a.mes_referencia = ANY($3)" : ""}
        ORDER BY a.mes_referencia, a.subtipo
      `, mesesArr.length > 0 ? [municipioId, ano, mesesArr] : [municipioId, ano]),

      // 8. Opções: órgãos
      db.query(`
        SELECT DISTINCT f.cod_orgao,
          COALESCE(MAX(o.desc_orgao), 'Órgão ' || f.cod_orgao) AS desc_orgao
        FROM fato_alteracao_orcamentaria_fonte f
        LEFT JOIN fato_orgao o ON o.municipio_id = f.municipio_id AND o.ano_referencia = f.ano_referencia AND o.cod_orgao = f.cod_orgao
        WHERE f.municipio_id = $1 AND f.ano_referencia = $2
        GROUP BY f.cod_orgao ORDER BY desc_orgao
      `, [municipioId, ano]),

      // 9. Opções: fontes
      db.query(`
        SELECT DISTINCT f.cod_fonte_recurso,
          COALESCE(d.nomenclatura_fonte_tcm, 'Fonte ' || f.cod_fonte_recurso) AS nomenclatura
        FROM fato_alteracao_orcamentaria_fonte f
        LEFT JOIN dom_fonte_tcm_v2 d ON d.cod_fonte_tcm = f.cod_fonte_recurso
        WHERE f.municipio_id = $1 AND f.ano_referencia = $2
        ORDER BY f.cod_fonte_recurso
      `, [municipioId, ano]),

      // 10. Opções: meses disponíveis
      db.query(`
        SELECT DISTINCT mes_referencia FROM fato_alteracao_orcamentaria_fonte
        WHERE municipio_id = $1 AND ano_referencia = $2
        ORDER BY mes_referencia
      `, [municipioId, ano]),

      // 11. Opções: tipos de alteração (domínio completo)
      db.query(`SELECT codigo, descricao FROM dom_tipo_alteracao_orcamentaria WHERE ativo = true ORDER BY codigo`),
    ]);

    const totalReceita = Number(receitaRes.rows[0]?.vl_previsto_atualizado ?? 0);

    return res.json({
      kpis: {
        vl_previsto_atualizado: totalReceita,
        vl_saldo_ant_fonte:  Number(kpiRes.rows[0]?.vl_saldo_ant_fonte  ?? 0),
        vl_alteracao_fonte:  Number(kpiRes.rows[0]?.vl_alteracao_fonte  ?? 0),
        vl_saldo_atual_fonte:Number(kpiRes.rows[0]?.vl_saldo_atual_fonte ?? 0),
        qtd_alteracoes:      Number(kpiRes.rows[0]?.qtd_alteracoes       ?? 0),
      },
      grid_tipos: gridRes.rows.map((r) => ({
        codigo:             r.codigo,
        descricao:          r.descricao,
        vl_saldo_ant_fonte: Number(r.vl_saldo_ant_fonte),
        vl_alteracao_fonte: Number(r.vl_alteracao_fonte),
        vl_saldo_atual_fonte:Number(r.vl_saldo_atual_fonte),
        pct_receita: totalReceita > 0 ? (Number(r.vl_alteracao_fonte) / totalReceita) * 100 : 0,
      })),
      evolucao_mensal: evolucaoRes.rows.map((r) => ({
        mes:               Number(r.mes),
        vl_alteracao_fonte:Number(r.vl_alteracao_fonte),
        vl_saldo_atual_fonte:Number(r.vl_saldo_atual_fonte),
      })),
      por_orgao: orgaoRes.rows.map((r) => ({
        cod_orgao:         r.cod_orgao,
        desc_orgao:        r.desc_orgao,
        vl_alteracao_fonte:Number(r.vl_alteracao_fonte),
      })),
      por_fonte: fonteRes.rows.map((r) => ({
        cod_fonte_recurso: r.cod_fonte_recurso,
        nomenclatura:      r.nomenclatura,
        vl_alteracao_fonte:Number(r.vl_alteracao_fonte),
      })),
      atos_legais: atosRes.rows.map((r) => ({
        subtipo:       r.subtipo,
        tipo_ato:      r.tipo_ato,
        numero:        r.numero,
        data_ato:      r.data_ato,
        vl_autorizado: r.vl_autorizado != null ? Number(r.vl_autorizado) : null,
        tipo_credito:  r.tipo_credito,
        mes_referencia:Number(r.mes_referencia),
      })),
      opcoes: {
        orgaos: opOrgaosRes.rows,
        fontes: opFontesRes.rows,
        meses:  opMesesRes.rows.map((r: any) => Number(r.mes_referencia)),
        tipos:  opTiposRes.rows,
      },
    });
  } catch (err: any) {
    console.error("[paineis/alteracoes-orcamentarias] erro:", err.message);
    return res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/paineis/orcamentario/divida-consolidada
// ─────────────────────────────────────────────────────────────────────────────
router.get("/orcamentario/divida-consolidada", async (req: AuthRequest, res: Response) => {
  const { cliente_id, ano, meses, orgao, tp_lancamento, credor, tipo_pessoa, cpf_cnpj, nro_lei } = req.query;

  if (!cliente_id || !ano) return res.status(400).json({ message: "cliente_id e ano são obrigatórios" });

  let municipioId: number;
  try {
    municipioId = await resolverMunicipioTcmgo(req.usuario!.id, req.usuario!.perfil, cliente_id as string);
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ message: err.message });
  }

  try {
    // ── Build WHERE dinâmico ──────────────────────────────────────────────────
    const mesesArr: number[] = meses
      ? String(meses).split(",").map(Number).filter(Boolean)
      : [];

    let idx = 3;
    const conds: string[] = [];
    const vals: any[]    = [municipioId, Number(ano)];

    if (mesesArr.length > 0) { conds.push(`d.mes_referencia = ANY($${idx++})`); vals.push(mesesArr); }
    if (orgao)               { conds.push(`TRIM(d.cod_orgao) = $${idx++}`);          vals.push(String(orgao)); }
    if (tp_lancamento)       { conds.push(`TRIM(d.tp_lancamento) = $${idx++}`);       vals.push(String(tp_lancamento)); }
    if (credor)              { conds.push(`TRIM(d.nome_credor) ILIKE $${idx++}`);     vals.push(`%${credor}%`); }
    if (tipo_pessoa)         { conds.push(`TRIM(d.tipo_pessoa) = $${idx++}`);         vals.push(String(tipo_pessoa)); }
    if (cpf_cnpj)            { conds.push(`TRIM(d.cpf_cnpj_credor) ILIKE $${idx++}`); vals.push(`%${cpf_cnpj}%`); }
    if (nro_lei)             { conds.push(`TRIM(d.nro_lei_autorizacao) ILIKE $${idx++}`); vals.push(`%${nro_lei}%`); }

    const w = conds.length ? " AND " + conds.join(" AND ") : "";

    // WHERE sem filtro de mês (para evolução)
    const condsEv = conds.filter((_, i) => {
      const c = conds[i]; return !c.includes("mes_referencia");
    });
    const valsEv = [municipioId, Number(ano), ...vals.slice(2).filter((_, i) => {
      if (mesesArr.length > 0) return i !== 0; return true;
    })];
    const wEv = condsEv.length ? " AND " + condsEv.join(" AND ") : "";

    const baseFrom   = `FROM fato_divida_consolidada d`;
    const baseWhere  = `WHERE d.municipio_id = $1 AND d.ano_referencia = $2${w}`;
    const base       = `${baseFrom} ${baseWhere}`;
    const baseWhereEv = `WHERE d.municipio_id = $1 AND d.ano_referencia = $2${wEv}`;
    const baseEv     = `${baseFrom} ${baseWhereEv}`;

    const [
      kpiRes, evolRes, porTipoRes, contrAmortRes,
      porCredorRes, porOrgaoRes, movsRes, gradeRes,
      opMesesRes, opOrgaosRes, opTiposRes
    ] = await Promise.all([

      // 1. KPIs
      db.query(`
        SELECT
          COALESCE(SUM(d.vl_saldo_anterior),0) AS vl_saldo_anterior,
          COALESCE(SUM(d.vl_contratacao),   0) AS vl_contratacao,
          COALESCE(SUM(d.vl_amortizacao),   0) AS vl_amortizacao,
          COALESCE(SUM(d.vl_cancelamento),  0) AS vl_cancelamento,
          COALESCE(SUM(d.vl_encampacao),    0) AS vl_encampacao,
          COALESCE(SUM(d.vl_atualizacao),   0) AS vl_atualizacao,
          COALESCE(SUM(d.vl_saldo_atual),   0) AS vl_saldo_atual,
          COUNT(*)                              AS qtd_registros
        ${base}
      `, vals),

      // 2. Evolução mensal (sem filtro de mês)
      db.query(`
        SELECT d.mes_referencia AS mes,
          COALESCE(SUM(d.vl_saldo_atual),  0) AS vl_saldo_atual,
          COALESCE(SUM(d.vl_amortizacao),  0) AS vl_amortizacao,
          COALESCE(SUM(d.vl_contratacao),  0) AS vl_contratacao
        ${baseEv}
        GROUP BY d.mes_referencia ORDER BY d.mes_referencia
      `, valsEv),

      // 3. Por tipo de lançamento
      db.query(`
        SELECT TRIM(d.tp_lancamento) AS tp_lancamento,
          COALESCE(t.descricao, TRIM(d.tp_lancamento)) AS descricao,
          COALESCE(SUM(d.vl_saldo_atual),0) AS vl_saldo_atual
        ${baseFrom}
        LEFT JOIN dom_tipo_divida t ON t.codigo = TRIM(d.tp_lancamento)
        ${baseWhere}
        GROUP BY TRIM(d.tp_lancamento), t.descricao ORDER BY vl_saldo_atual DESC
      `, vals),

      // 4. Contratação x Amortização por mês
      db.query(`
        SELECT d.mes_referencia AS mes,
          COALESCE(SUM(d.vl_contratacao),0) AS vl_contratacao,
          COALESCE(SUM(d.vl_amortizacao),0) AS vl_amortizacao
        ${baseEv}
        GROUP BY d.mes_referencia ORDER BY d.mes_referencia
      `, valsEv),

      // 5. Por credor (top 12)
      db.query(`
        SELECT TRIM(d.nome_credor) AS nome_credor,
          TRIM(d.cpf_cnpj_credor) AS cpf_cnpj_credor,
          TRIM(d.tipo_pessoa)     AS tipo_pessoa,
          COALESCE(SUM(d.vl_saldo_atual),0) AS vl_saldo_atual,
          COUNT(*) AS qtd_registros
        ${base}
        GROUP BY TRIM(d.nome_credor), TRIM(d.cpf_cnpj_credor), TRIM(d.tipo_pessoa)
        ORDER BY vl_saldo_atual DESC LIMIT 12
      `, vals),

      // 6. Por órgão
      db.query(`
        SELECT TRIM(d.cod_orgao) AS cod_orgao,
          COALESCE(MAX(o.desc_orgao), 'Órgão ' || TRIM(d.cod_orgao)) AS desc_orgao,
          COALESCE(SUM(d.vl_saldo_atual),0) AS vl_saldo_atual
        ${baseFrom}
        LEFT JOIN fato_orgao o ON o.municipio_id = d.municipio_id AND o.ano_referencia = d.ano_referencia AND TRIM(o.cod_orgao) = TRIM(d.cod_orgao)
        ${baseWhere}
        GROUP BY TRIM(d.cod_orgao) ORDER BY vl_saldo_atual DESC
      `, vals),

      // 7. Movimentações totais (gráfico F)
      db.query(`
        SELECT
          COALESCE(SUM(d.vl_contratacao),0) AS contratacao,
          COALESCE(SUM(d.vl_amortizacao),0) AS amortizacao,
          COALESCE(SUM(d.vl_cancelamento),0) AS cancelamento,
          COALESCE(SUM(d.vl_encampacao),0)  AS encampacao,
          COALESCE(SUM(d.vl_atualizacao),0) AS atualizacao
        ${base}
      `, vals),

      // 8. Grade analítica completa
      db.query(`
        SELECT
          d.id, d.mes_referencia,
          TRIM(d.cod_orgao)   AS cod_orgao,
          COALESCE(MAX(o.desc_orgao) OVER (PARTITION BY d.municipio_id, d.ano_referencia, d.cod_orgao),
                   'Órgão ' || TRIM(d.cod_orgao)) AS desc_orgao,
          TRIM(d.cod_unidade) AS cod_unidade,
          TRIM(d.tp_lancamento) AS tp_lancamento,
          COALESCE(t.descricao, TRIM(d.tp_lancamento)) AS desc_tipo_divida,
          TRIM(d.nro_lei_autorizacao) AS nro_lei_autorizacao,
          d.dt_lei_autorizacao,
          TRIM(d.nome_credor)      AS nome_credor,
          TRIM(d.tipo_pessoa)      AS tipo_pessoa,
          TRIM(d.cpf_cnpj_credor)  AS cpf_cnpj_credor,
          d.vl_saldo_anterior, d.vl_contratacao, d.vl_amortizacao,
          d.vl_cancelamento,   d.vl_encampacao,  d.vl_atualizacao, d.vl_saldo_atual,
          ROUND((d.vl_saldo_anterior + d.vl_contratacao - d.vl_amortizacao
                 - d.vl_cancelamento + d.vl_encampacao + d.vl_atualizacao)::NUMERIC, 2)
            AS vl_saldo_calculado,
          ROUND((d.vl_saldo_atual - (d.vl_saldo_anterior + d.vl_contratacao - d.vl_amortizacao
                 - d.vl_cancelamento + d.vl_encampacao + d.vl_atualizacao))::NUMERIC, 2)
            AS vl_diferenca
        FROM fato_divida_consolidada d
        LEFT JOIN fato_orgao o ON o.municipio_id = d.municipio_id AND o.ano_referencia = d.ano_referencia AND TRIM(o.cod_orgao) = TRIM(d.cod_orgao)
        LEFT JOIN dom_tipo_divida t ON t.codigo = TRIM(d.tp_lancamento)
        WHERE d.municipio_id = $1 AND d.ano_referencia = $2${w}
        ORDER BY desc_orgao, TRIM(d.cod_unidade), TRIM(d.tp_lancamento), TRIM(d.nome_credor), d.dt_lei_autorizacao
      `, vals),

      // 9. Opções: meses disponíveis
      db.query(`
        SELECT DISTINCT mes_referencia FROM fato_divida_consolidada
        WHERE municipio_id = $1 AND ano_referencia = $2
        ORDER BY mes_referencia
      `, [municipioId, Number(ano)]),

      // 10. Opções: órgãos
      db.query(`
        SELECT DISTINCT TRIM(d.cod_orgao) AS cod_orgao,
          COALESCE(MAX(o.desc_orgao), 'Órgão ' || TRIM(d.cod_orgao)) AS desc_orgao
        FROM fato_divida_consolidada d
        LEFT JOIN fato_orgao o ON o.municipio_id = d.municipio_id AND o.ano_referencia = d.ano_referencia AND TRIM(o.cod_orgao) = TRIM(d.cod_orgao)
        WHERE d.municipio_id = $1 AND d.ano_referencia = $2
        GROUP BY TRIM(d.cod_orgao) ORDER BY desc_orgao
      `, [municipioId, Number(ano)]),

      // 11. Opções: tipos de lançamento com dados
      db.query(`
        SELECT DISTINCT TRIM(d.tp_lancamento) AS codigo,
          COALESCE(t.descricao, TRIM(d.tp_lancamento)) AS descricao
        FROM fato_divida_consolidada d
        LEFT JOIN dom_tipo_divida t ON t.codigo = TRIM(d.tp_lancamento)
        WHERE d.municipio_id = $1 AND d.ano_referencia = $2
        ORDER BY codigo
      `, [municipioId, Number(ano)]),
    ]);

    const n = (v: any) => Number(v ?? 0);
    const kpi = kpiRes.rows[0] ?? {};
    const movs = movsRes.rows[0] ?? {};

    return res.json({
      kpis: {
        vl_saldo_anterior: n(kpi.vl_saldo_anterior),
        vl_contratacao:    n(kpi.vl_contratacao),
        vl_amortizacao:    n(kpi.vl_amortizacao),
        vl_cancelamento:   n(kpi.vl_cancelamento),
        vl_encampacao:     n(kpi.vl_encampacao),
        vl_atualizacao:    n(kpi.vl_atualizacao),
        vl_saldo_atual:    n(kpi.vl_saldo_atual),
        qtd_registros:     n(kpi.qtd_registros),
      },
      evolucao_mensal: evolRes.rows.map((r) => ({
        mes: n(r.mes), vl_saldo_atual: n(r.vl_saldo_atual),
        vl_amortizacao: n(r.vl_amortizacao), vl_contratacao: n(r.vl_contratacao),
      })),
      por_tipo: porTipoRes.rows.map((r) => ({
        tp_lancamento: r.tp_lancamento, descricao: r.descricao, vl_saldo_atual: n(r.vl_saldo_atual),
      })),
      contr_amort_mensal: contrAmortRes.rows.map((r) => ({
        mes: n(r.mes), vl_contratacao: n(r.vl_contratacao), vl_amortizacao: n(r.vl_amortizacao),
      })),
      por_credor: porCredorRes.rows.map((r) => ({
        nome_credor: r.nome_credor, cpf_cnpj_credor: r.cpf_cnpj_credor,
        tipo_pessoa: r.tipo_pessoa, vl_saldo_atual: n(r.vl_saldo_atual), qtd_registros: n(r.qtd_registros),
      })),
      por_orgao: porOrgaoRes.rows.map((r) => ({
        cod_orgao: r.cod_orgao, desc_orgao: r.desc_orgao, vl_saldo_atual: n(r.vl_saldo_atual),
      })),
      movimentacoes: {
        contratacao: n(movs.contratacao), amortizacao: n(movs.amortizacao),
        cancelamento: n(movs.cancelamento), encampacao: n(movs.encampacao), atualizacao: n(movs.atualizacao),
      },
      grade: gradeRes.rows.map((r) => ({
        id: r.id, mes_referencia: n(r.mes_referencia),
        cod_orgao: r.cod_orgao, desc_orgao: r.desc_orgao, cod_unidade: r.cod_unidade,
        tp_lancamento: r.tp_lancamento, desc_tipo_divida: r.desc_tipo_divida,
        nro_lei_autorizacao: r.nro_lei_autorizacao, dt_lei_autorizacao: r.dt_lei_autorizacao,
        nome_credor: r.nome_credor, tipo_pessoa: r.tipo_pessoa, cpf_cnpj_credor: r.cpf_cnpj_credor,
        vl_saldo_anterior: n(r.vl_saldo_anterior), vl_contratacao: n(r.vl_contratacao),
        vl_amortizacao: n(r.vl_amortizacao), vl_cancelamento: n(r.vl_cancelamento),
        vl_encampacao: n(r.vl_encampacao), vl_atualizacao: n(r.vl_atualizacao),
        vl_saldo_atual: n(r.vl_saldo_atual), vl_saldo_calculado: n(r.vl_saldo_calculado),
        vl_diferenca: n(r.vl_diferenca),
      })),
      opcoes: {
        meses:  opMesesRes.rows.map((r: any) => n(r.mes_referencia)),
        orgaos: opOrgaosRes.rows,
        tipos:  opTiposRes.rows,
      },
    });
  } catch (err: any) {
    console.error("[paineis/divida-consolidada] erro:", err.message);
    return res.status(500).json({ message: err.message });
  }
});

export default router;

