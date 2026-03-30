import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, VerificacaoMeta } from "./shared";

// ── D3_00017: RP pagos — Anexo 06 × Anexo 07 ────────────────────────────────
// Total_Anexo_06 = Σ(An06 RREO6TotalDespesaPrimaria PAGOS (c))
//               + Σ(An06 RREO6TotalDespesaPrimaria RESTOS A PAGAR PROCESSADOS PAGOS (b))
//               + Σ(An06 RREO6JurosEEncargosDaDivida PAGOS (c))           [0 se ausente]
//               + Σ(An06 RREO6JurosEEncargosDaDivida RESTOS A PAGAR PROCESSADOS PAGOS (b)) [0 se ausente]
// Total_Anexo_07 = Σ(An07 RestosAPagarNaoProcessadosPagos Pagos (i))        [excl. Intra]
//               + Σ(An07 RestosAPagarProcessadosENaoProcessadosLiquidadosPagos Pagos (c))  [excl. Intra]
// Regra: avalia TODOS os períodos; nota = 0 se qualquer período divergir
export async function verificarD3_00017(
  municipioId: number, _codIbge: string, ano: number,
): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; periodicidade: string; demonstrativo: string; rotulo: string;
    anexo: string; cod_conta: string; coluna: string; valor: number;
  }>(
    `SELECT periodo, periodicidade, demonstrativo, rotulo, anexo, cod_conta, coluna,
            COALESCE(SUM(valor), 0)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND (
         (anexo = 'RREO-Anexo 06' AND cod_conta = 'RREO6TotalDespesaPrimaria'   AND coluna = 'PAGOS (c)')
         OR (anexo = 'RREO-Anexo 06' AND cod_conta = 'RREO6TotalDespesaPrimaria'   AND coluna = 'RESTOS A PAGAR PROCESSADOS PAGOS (b)')
         OR (anexo = 'RREO-Anexo 06' AND cod_conta = 'RREO6JurosEEncargosDaDivida' AND coluna = 'PAGOS (c)')
         OR (anexo = 'RREO-Anexo 06' AND cod_conta = 'RREO6JurosEEncargosDaDivida' AND coluna = 'RESTOS A PAGAR PROCESSADOS PAGOS (b)')
         OR (anexo = 'RREO-Anexo 07' AND cod_conta = 'RestosAPagarProcessadosENaoProcessadosLiquidadosPagos' AND coluna = 'Pagos (c)')
         OR (anexo = 'RREO-Anexo 07' AND cod_conta = 'RestosAPagarNaoProcessadosPagos'                       AND coluna = 'Pagos (i)')
       )
     GROUP BY periodo, periodicidade, demonstrativo, rotulo, anexo, cod_conta, coluna`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum dado dos Anexos 06 e 07 encontrado — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  // Agrupar por chave de contexto
  type CtxMeta = { periodo: number; periodicidade: string; demonstrativo: string; rotulo: string };
  const ctxMeta = new Map<string, CtxMeta>();
  const idx = new Map<string, number>();

  for (const d of rows) {
    const ctxKey = `${d.periodo}|${d.periodicidade}|${d.demonstrativo}|${d.rotulo}`;
    if (!ctxMeta.has(ctxKey)) {
      ctxMeta.set(ctxKey, {
        periodo: d.periodo,
        periodicidade: d.periodicidade,
        demonstrativo: d.demonstrativo,
        rotulo: d.rotulo,
      });
    }
    idx.set(`${ctxKey}|${d.anexo}|${d.cod_conta}|${d.coluna}`, d.valor ?? 0);
  }

  const TOLERANCIA = 1.00;
  const detalhes: object[] = [];
  let totalContextos = 0;
  let contextosOk = 0;

  for (const [ctxKey, meta] of Array.from(ctxMeta.entries()).sort((a, b) => a[1].periodo - b[1].periodo)) {
    const label = `${BIMESTRE_LABELS[meta.periodo] ?? `Período ${meta.periodo}`}${meta.periodicidade ? ` (${meta.periodicidade})` : ""}`;

    const get = (anexo: string, cod_conta: string, coluna: string): number =>
      idx.get(`${ctxKey}|${anexo}|${cod_conta}|${coluna}`) ?? 0;

    // Componentes do Anexo 06
    const an06_total_pag   = get("RREO-Anexo 06", "RREO6TotalDespesaPrimaria",   "PAGOS (c)");
    const an06_total_rpp   = get("RREO-Anexo 06", "RREO6TotalDespesaPrimaria",   "RESTOS A PAGAR PROCESSADOS PAGOS (b)");
    const an06_juros_pag   = get("RREO-Anexo 06", "RREO6JurosEEncargosDaDivida", "PAGOS (c)");
    const an06_juros_rpp   = get("RREO-Anexo 06", "RREO6JurosEEncargosDaDivida", "RESTOS A PAGAR PROCESSADOS PAGOS (b)");

    // Componentes do Anexo 07 (excluindo Intra-orçamentárias)
    const an07_proc_pag    = get("RREO-Anexo 07", "RestosAPagarProcessadosENaoProcessadosLiquidadosPagos", "Pagos (c)");
    const an07_naoproc_pag = get("RREO-Anexo 07", "RestosAPagarNaoProcessadosPagos",                       "Pagos (i)");

    const total_anexo_06 = an06_total_pag + an06_total_rpp + an06_juros_pag + an06_juros_rpp;
    const total_anexo_07 = an07_proc_pag + an07_naoproc_pag;

    totalContextos++;
    const ok = Math.abs(total_anexo_06 - total_anexo_07) <= TOLERANCIA;
    if (ok) contextosOk++;

    detalhes.push({
      periodo: meta.periodo,
      label,
      total_anexo_06,
      total_anexo_07,
      diferenca: total_anexo_06 - total_anexo_07,
      ok,
      componentes_06: [
        { cod_conta: "RREO6TotalDespesaPrimaria",   coluna: "PAGOS (c)",                            valor: an06_total_pag },
        { cod_conta: "RREO6TotalDespesaPrimaria",   coluna: "RESTOS A PAGAR PROCESSADOS PAGOS (b)", valor: an06_total_rpp },
        { cod_conta: "RREO6JurosEEncargosDaDivida", coluna: "PAGOS (c)",                            valor: an06_juros_pag },
        { cod_conta: "RREO6JurosEEncargosDaDivida", coluna: "RESTOS A PAGAR PROCESSADOS PAGOS (b)", valor: an06_juros_rpp },
      ],
      componentes_07: [
        { cod_conta: "RestosAPagarProcessadosENaoProcessadosLiquidadosPagos", coluna: "Pagos (c)", valor: an07_proc_pag },
        { cod_conta: "RestosAPagarNaoProcessadosPagos",                       coluna: "Pagos (i)", valor: an07_naoproc_pag },
      ],
    });
  }

  if (totalContextos === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum contexto comparável encontrado entre Anexo 06 e Anexo 07 — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  const inconsistentes = totalContextos - contextosOk;

  if (inconsistentes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Todos os ${totalContextos} período(s) consistentes: Total Anexo 06 = Total Anexo 07.`,
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: `${inconsistentes} de ${totalContextos} período(s) com divergência entre Total Anexo 06 e Total Anexo 07.`,
    detalhes,
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00017",
  tipo: "RREO",
  descricao: "Igualdade entre Restos a Pagar Pagos no Exercício do Anexo 6 com o Anexo 7 do RREO",
  nota_max: 1,
};
