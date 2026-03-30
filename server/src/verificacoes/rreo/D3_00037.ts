import { db } from "../../db";
import { ResultadoVerificacao, VerificacaoMeta } from "./shared";

// ── D3_00037: Investimentos — Anexo 01 × Anexo 09 ────────────────────────────
// Aplica-se apenas ao período 6.
// Regra 1 (Dotação Atualizada):
//   An01 SUM(Investimentos + InvestimentosIntra) col="DOTAÇÃO ATUALIZADA (e)"
//   = An09 Investimentos col="DOTAÇÃO ATUALIZADA (d)"
// Regra 2 (Empenhadas):
//   An01 SUM(Investimentos + InvestimentosIntra) col="DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)"
//   = An09 Investimentos col="DESPESAS EMPENHADAS (e)"
// Ausência de linha = 0. Consistente apenas se AMBAS as regras passarem.
export async function verificarD3_00037(
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
           AND cod_conta IN ('Investimentos','InvestimentosIntra')
           AND coluna IN ('DOTAÇÃO ATUALIZADA (e)','DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)'))
         OR
         (anexo = 'RREO-Anexo 09'
           AND cod_conta = 'Investimentos'
           AND coluna IN ('DOTAÇÃO ATUALIZADA (d)','DESPESAS EMPENHADAS (e)'))
       )
     GROUP BY fonte, cod_conta, coluna`,
    [municipioId, ano],
  );

  const idx = new Map<string, number>();
  for (const d of rows) idx.set(`${d.fonte}|${d.cod_conta}|${d.coluna}`, d.valor ?? 0);

  const getAn01 = (cod: string, col: string) => idx.get(`An01|${cod}|${col}`) ?? 0;
  const getAn09 = (cod: string, col: string) => idx.get(`An09|${cod}|${col}`) ?? 0;

  const an01InvDotacao      = getAn01("Investimentos",      "DOTAÇÃO ATUALIZADA (e)");
  const an01IntraDotacao    = getAn01("InvestimentosIntra", "DOTAÇÃO ATUALIZADA (e)");
  const an01InvEmpenhadas   = getAn01("Investimentos",      "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)");
  const an01IntraEmpenhadas = getAn01("InvestimentosIntra", "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)");

  const an01Dotacao    = an01InvDotacao    + an01IntraDotacao;
  const an09Dotacao    = getAn09("Investimentos", "DOTAÇÃO ATUALIZADA (d)");
  const an01Empenhadas = an01InvEmpenhadas + an01IntraEmpenhadas;
  const an09Empenhadas = getAn09("Investimentos", "DESPESAS EMPENHADAS (e)");

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
        { cod_conta: "Investimentos",      valor: an01InvDotacao },
        { cod_conta: "InvestimentosIntra", valor: an01IntraDotacao },
      ],
      an09_valor: an09Dotacao,
      an09_cod_conta: "Investimentos",
      diferenca: an01Dotacao - an09Dotacao,
      consistente: okDotacao,
    },
    {
      comparacao: "Despesas Empenhadas",
      col_an01: "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)",
      col_an09: "DESPESAS EMPENHADAS (e)",
      an01_valor: an01Empenhadas,
      an01_componentes: [
        { cod_conta: "Investimentos",      valor: an01InvEmpenhadas },
        { cod_conta: "InvestimentosIntra", valor: an01IntraEmpenhadas },
      ],
      an09_valor: an09Empenhadas,
      an09_cod_conta: "Investimentos",
      diferenca: an01Empenhadas - an09Empenhadas,
      consistente: okEmpenhadas,
    },
  ];

  if (consistente) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "6° Bimestre consistente — Investimentos iguais entre Anexo 01 e Anexo 09.",
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: "6° Bimestre com divergência nos Investimentos entre Anexo 01 e Anexo 09.",
    detalhes,
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00037",
  tipo: "RREO",
  descricao: "Igualdade de Investimentos (intra + exceto intra) do Anexo 1 e do Anexo 9 do RREO",
  nota_max: 1,
};
