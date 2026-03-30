import { db } from "../../db";
import { ResultadoVerificacao, VerificacaoMeta } from "./shared";

// ── D3_00040: Receitas de Operações de Crédito — Anexo 01 × Anexo 09 ─────────
// Aplica-se apenas ao período 6.
// Regra 1 (Realizadas):
//   An01 SUM(ReceitasDeOperacoesDeCredito + ReceitasDeOperacoesDeCreditoIntra) col="Até o Bimestre (c)"
//   = An09 RREO9ReceitasDeOperacoesDeCredito col="RECEITAS REALIZADAS (b)"
// Regra 2 (Previsão):
//   An01 SUM(ReceitasDeOperacoesDeCredito + ReceitasDeOperacoesDeCreditoIntra) col="PREVISÃO ATUALIZADA (a)"
//   = An09 RREO9ReceitasDeOperacoesDeCredito col="PREVISÃO ATUALIZADA (a)"
// Ausência de linha = 0. Consistente apenas se AMBAS as regras passarem.
export async function verificarD3_00040(
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
           AND cod_conta IN ('ReceitasDeOperacoesDeCredito','ReceitasDeOperacoesDeCreditoIntra')
           AND coluna IN ('Até o Bimestre (c)','PREVISÃO ATUALIZADA (a)'))
         OR
         (anexo = 'RREO-Anexo 09'
           AND cod_conta = 'RREO9ReceitasDeOperacoesDeCredito'
           AND coluna IN ('RECEITAS REALIZADAS (b)','PREVISÃO ATUALIZADA (a)'))
       )
     GROUP BY fonte, cod_conta, coluna`,
    [municipioId, ano],
  );

  // Índice: "fonte|cod_conta|coluna" → valor
  const idx = new Map<string, number>();
  for (const d of rows) idx.set(`${d.fonte}|${d.cod_conta}|${d.coluna}`, d.valor ?? 0);

  const getAn01 = (cod: string, col: string) => idx.get(`An01|${cod}|${col}`) ?? 0;
  const getAn09 = (cod: string, col: string) => idx.get(`An09|${cod}|${col}`) ?? 0;

  // Valores individuais An01
  const an01CreditoRealizado      = getAn01("ReceitasDeOperacoesDeCredito",      "Até o Bimestre (c)");
  const an01IntraRealizado        = getAn01("ReceitasDeOperacoesDeCreditoIntra",  "Até o Bimestre (c)");
  const an01CreditoPrevisao       = getAn01("ReceitasDeOperacoesDeCredito",      "PREVISÃO ATUALIZADA (a)");
  const an01IntraPrevisao         = getAn01("ReceitasDeOperacoesDeCreditoIntra",  "PREVISÃO ATUALIZADA (a)");

  const an01Realizado  = an01CreditoRealizado + an01IntraRealizado;
  const an09Realizado  = getAn09("RREO9ReceitasDeOperacoesDeCredito", "RECEITAS REALIZADAS (b)");
  const an01Previsao   = an01CreditoPrevisao  + an01IntraPrevisao;
  const an09Previsao   = getAn09("RREO9ReceitasDeOperacoesDeCredito", "PREVISÃO ATUALIZADA (a)");

  const okRealizado  = Math.abs(an01Realizado  - an09Realizado)  < 0.01;
  const okPrevisao   = Math.abs(an01Previsao   - an09Previsao)   < 0.01;
  const consistente  = okRealizado && okPrevisao;

  const detalhes = [
    {
      comparacao: "Receitas Realizadas",
      col_an01: "Até o Bimestre (c)",
      col_an09: "RECEITAS REALIZADAS (b)",
      an01_valor: an01Realizado,
      an01_componentes: [
        { cod_conta: "ReceitasDeOperacoesDeCredito",      valor: an01CreditoRealizado },
        { cod_conta: "ReceitasDeOperacoesDeCreditoIntra", valor: an01IntraRealizado },
      ],
      an09_valor: an09Realizado,
      an09_cod_conta: "RREO9ReceitasDeOperacoesDeCredito",
      diferenca: an01Realizado - an09Realizado,
      consistente: okRealizado,
    },
    {
      comparacao: "Previsão Atualizada",
      col_an01: "PREVISÃO ATUALIZADA (a)",
      col_an09: "PREVISÃO ATUALIZADA (a)",
      an01_valor: an01Previsao,
      an01_componentes: [
        { cod_conta: "ReceitasDeOperacoesDeCredito",      valor: an01CreditoPrevisao },
        { cod_conta: "ReceitasDeOperacoesDeCreditoIntra", valor: an01IntraPrevisao },
      ],
      an09_valor: an09Previsao,
      an09_cod_conta: "RREO9ReceitasDeOperacoesDeCredito",
      diferenca: an01Previsao - an09Previsao,
      consistente: okPrevisao,
    },
  ];

  if (consistente) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "6° Bimestre consistente — Receitas de Operações de Crédito iguais entre Anexo 01 e Anexo 09.",
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: "6° Bimestre com divergência nas Receitas de Operações de Crédito entre Anexo 01 e Anexo 09.",
    detalhes,
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00040",
  tipo: "RREO",
  descricao: "Igualdade de Receitas de Operações de Crédito do Anexo 1 e do Anexo 9 do RREO",
  nota_max: 1,
};
