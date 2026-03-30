import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, VerificacaoMeta } from "./shared";

// ── D3_00033: Superávit Financeiro — Anexo 01 × Anexo 06 ─────────────────────
// Regra única (por período 1–6):
//   An01 SuperavitFinanceiro col="PREVISÃO ATUALIZADA (a)"
//   = An06 SuperavitFinanceiro col="PREVISÃO ORÇAMENTÁRIA"
// Ausência de linha = 0.
export async function verificarD3_00033(
  municipioId: number, _codIbge: string, ano: number,
): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; anexo: string; valor: number;
  }>(
    `SELECT periodo, anexo, SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND rotulo = 'Padrão'
       AND cod_conta = 'SuperavitFinanceiro'
       AND (
         (anexo = 'RREO-Anexo 01' AND coluna = 'PREVISÃO ATUALIZADA (a)')
         OR
         (anexo = 'RREO-Anexo 06' AND coluna = 'PREVISÃO ORÇAMENTÁRIA')
       )
     GROUP BY periodo, anexo`,
    [municipioId, ano],
  );

  const idx = new Map<string, number>();
  const periodos = new Set<number>();
  for (const d of rows) {
    idx.set(`${d.periodo}|${d.anexo}`, d.valor ?? 0);
    periodos.add(d.periodo);
  }

  // Garante avaliação para todos os períodos com dado em qualquer um dos dois anexos
  const detalhes: object[] = [];
  let totalOk = 0;

  for (const periodo of Array.from(periodos).sort((a, b) => a - b)) {
    const label = BIMESTRE_LABELS[periodo] ?? `Período ${periodo}`;
    const an01Valor = idx.get(`${periodo}|RREO-Anexo 01`) ?? 0;
    const an06Valor = idx.get(`${periodo}|RREO-Anexo 06`) ?? 0;
    const diferenca = an01Valor - an06Valor;
    const consistente = Math.abs(diferenca) < 0.01;
    if (consistente) totalOk++;

    detalhes.push({
      periodo, label,
      an01_cod_conta: "SuperavitFinanceiro",
      col_an01: "PREVISÃO ATUALIZADA (a)",
      an06_cod_conta: "SuperavitFinanceiro",
      col_an06: "PREVISÃO ORÇAMENTÁRIA",
      an01_valor: an01Valor,
      an06_valor: an06Valor,
      diferenca,
      consistente,
    });
  }

  if (periodos.size === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum dado dos Anexos 01 e 06 encontrado — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  const inconsistentes = periodos.size - totalOk;

  if (inconsistentes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Superávit Financeiro consistente entre Anexo 01 e Anexo 06 em todos os ${periodos.size} período(s) verificados.`,
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: `Superávit Financeiro divergente em ${inconsistentes} de ${periodos.size} período(s) entre Anexo 01 e Anexo 06.`,
    detalhes,
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00033",
  tipo: "RREO",
  descricao: "Igualdade de Superávit Financeiro entre os Anexos 1 e 6 do RREO",
  nota_max: 1,
};
