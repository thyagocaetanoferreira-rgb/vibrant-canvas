import { db } from "../../db";
import { ResultadoVerificacao, VerificacaoMeta } from "./shared";

// ── D3_00039: Amortização da Dívida — Anexo 01 × Anexo 09 ────────────────────
// Aplica-se apenas ao período 6.
// Regra 1 (Dotação Atualizada):
//   An01 SUM(AmortizacaoDaDivida + AmortizacaoDaDividaIntra) col="DOTAÇÃO ATUALIZADA (e)"
//   = An09 AmortizacaoDaDivida col="DOTAÇÃO ATUALIZADA (d)"
// Regra 2 (Empenhadas):
//   An01 SUM(AmortizacaoDaDivida + AmortizacaoDaDividaIntra) col="DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)"
//   = An09 AmortizacaoDaDivida col="DESPESAS EMPENHADAS (e)"
// Ausência de linha = 0 (AmortizacaoDaDividaIntra pode não existir).
// Consistente apenas se AMBAS as regras passarem.
export async function verificarD3_00039(
  municipioId: number, _codIbge: string, ano: number,
): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    fonte: string; cod_conta: string; coluna: string; valor: number;
  }>(
    `SELECT
       CASE
         WHEN anexo = 'RREO-Anexo 01' THEN 'An01'
         ELSE 'An09'
       END AS fonte,
       cod_conta,
       coluna,
       SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND periodo = 6
       AND rotulo = 'Padrão'
       AND (
         (anexo = 'RREO-Anexo 01'
           AND cod_conta IN ('AmortizacaoDaDivida','AmortizacaoDaDividaIntra')
           AND coluna IN ('DOTAÇÃO ATUALIZADA (e)','DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)'))
         OR
         (anexo = 'RREO-Anexo 09'
           AND cod_conta = 'AmortizacaoDaDivida'
           AND coluna IN ('DOTAÇÃO ATUALIZADA (d)','DESPESAS EMPENHADAS (e)'))
       )
     GROUP BY fonte, cod_conta, coluna`,
    [municipioId, ano],
  );

  // Índice: "fonte|cod_conta|coluna" → valor
  const idx = new Map<string, number>();
  for (const d of rows) idx.set(`${d.fonte}|${d.cod_conta}|${d.coluna}`, d.valor ?? 0);

  // Helpers para obter valor individual por conta
  const getAn01 = (cod: string, col: string) => idx.get(`An01|${cod}|${col}`) ?? 0;
  const getAn09 = (cod: string, col: string) => idx.get(`An09|${cod}|${col}`) ?? 0;

  // Valores individuais An01 por coluna
  const an01DivDotacao      = getAn01("AmortizacaoDaDivida",      "DOTAÇÃO ATUALIZADA (e)");
  const an01IntraDotacao    = getAn01("AmortizacaoDaDividaIntra",  "DOTAÇÃO ATUALIZADA (e)");
  const an01DivEmpenhadas   = getAn01("AmortizacaoDaDivida",      "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)");
  const an01IntraEmpenhadas = getAn01("AmortizacaoDaDividaIntra",  "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)");

  const an01Dotacao    = an01DivDotacao    + an01IntraDotacao;
  const an09Dotacao    = getAn09("AmortizacaoDaDivida", "DOTAÇÃO ATUALIZADA (d)");
  const an01Empenhadas = an01DivEmpenhadas + an01IntraEmpenhadas;
  const an09Empenhadas = getAn09("AmortizacaoDaDivida", "DESPESAS EMPENHADAS (e)");

  const okDotacao    = Math.abs(an01Dotacao    - an09Dotacao)    < 0.01;
  const okEmpenhadas = Math.abs(an01Empenhadas - an09Empenhadas) < 0.01;
  const consistente  = okDotacao && okEmpenhadas;

  const detalhes = [
    {
      comparacao: "Dotação Atualizada",
      col_an01: "DOTAÇÃO ATUALIZADA (e)",
      col_an09: "DOTAÇÃO ATUALIZADA (d)",
      an01_valor: an01Dotacao,
      an01_componentes: [
        { cod_conta: "AmortizacaoDaDivida",     valor: an01DivDotacao },
        { cod_conta: "AmortizacaoDaDividaIntra", valor: an01IntraDotacao },
      ],
      an09_valor: an09Dotacao,
      an09_cod_conta: "AmortizacaoDaDivida",
      diferenca: an01Dotacao - an09Dotacao,
      consistente: okDotacao,
    },
    {
      comparacao: "Despesas Empenhadas",
      col_an01: "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)",
      col_an09: "DESPESAS EMPENHADAS (e)",
      an01_valor: an01Empenhadas,
      an01_componentes: [
        { cod_conta: "AmortizacaoDaDivida",     valor: an01DivEmpenhadas },
        { cod_conta: "AmortizacaoDaDividaIntra", valor: an01IntraEmpenhadas },
      ],
      an09_valor: an09Empenhadas,
      an09_cod_conta: "AmortizacaoDaDivida",
      diferenca: an01Empenhadas - an09Empenhadas,
      consistente: okEmpenhadas,
    },
  ];

  if (consistente) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "6° Bimestre consistente — Amortização da Dívida igual entre Anexo 01 e Anexo 09.",
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: "6° Bimestre com divergência na Amortização da Dívida entre Anexo 01 e Anexo 09.",
    detalhes,
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00039",
  tipo: "RREO",
  descricao: "Igualdade de Amortização da Dívida (intra + exceto intra) do Anexo 1 e do Anexo 9 do RREO",
  nota_max: 1,
};
