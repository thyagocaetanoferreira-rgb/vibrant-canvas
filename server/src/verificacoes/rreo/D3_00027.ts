import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, VerificacaoMeta } from "./shared";

// ── D3_00027: Dotação Atualizada, Empenhos e Liquidações — Anexo 01 × Anexo 06 ─
// Bloco A — Correntes: An06 DespesasCorrentesExcetoFontesRPPS ↔ An01 DespesasCorrentes
// Bloco B — Capital:   An06 DespesasDeCapitalExcetoFontesRPPS ↔ An01 DespesasDeCapital
// Colunas comparadas: DOTAÇÃO ATUALIZADA | DESPESAS EMPENHADAS | DESPESAS LIQUIDADAS
export async function verificarD3_00027(
  municipioId: number, _codIbge: string, ano: number,
): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; anexo: string; cod_conta: string; coluna: string; valor: number;
  }>(
    `SELECT periodo, anexo, cod_conta, coluna, SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND rotulo = 'Padrão'
       AND (
         (anexo = 'RREO-Anexo 06' AND cod_conta = 'DespesasCorrentesExcetoFontesRPPS'
           AND coluna IN ('DOTAÇÃO ATUALIZADA','DESPESAS EMPENHADAS','DESPESAS LIQUIDADAS'))
         OR
         (anexo = 'RREO-Anexo 01' AND cod_conta = 'DespesasCorrentes'
           AND coluna IN ('DOTAÇÃO ATUALIZADA (e)','DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)','DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)'))
         OR
         (anexo = 'RREO-Anexo 06' AND cod_conta = 'DespesasDeCapitalExcetoFontesRPPS'
           AND coluna IN ('DOTAÇÃO ATUALIZADA','DESPESAS EMPENHADAS','DESPESAS LIQUIDADAS'))
         OR
         (anexo = 'RREO-Anexo 01' AND cod_conta = 'DespesasDeCapital'
           AND coluna IN ('DOTAÇÃO ATUALIZADA (e)','DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)','DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)'))
       )
     GROUP BY periodo, anexo, cod_conta, coluna`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum dado dos Anexos 01 e 06 encontrado — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  const idx = new Map<string, number>();
  const periodos = new Set<number>();
  for (const d of rows) {
    idx.set(`${d.periodo}|${d.anexo}|${d.cod_conta}|${d.coluna}`, d.valor ?? 0);
    periodos.add(d.periodo);
  }

  const TOLERANCIA = 1.00;
  const colunas = [
    { nome: "Dotação Atualizada",   colAn06: "DOTAÇÃO ATUALIZADA",    colAn01: "DOTAÇÃO ATUALIZADA (e)"                },
    { nome: "Despesas Empenhadas",  colAn06: "DESPESAS EMPENHADAS",    colAn01: "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)" },
    { nome: "Despesas Liquidadas",  colAn06: "DESPESAS LIQUIDADAS",    colAn01: "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)" },
  ];
  const blocos = [
    {
      bloco: "Correntes",
      codAn06: "DespesasCorrentesExcetoFontesRPPS",
      codAn01: "DespesasCorrentes",
      labelAn06: "DespesasCorrentes (Exceto RPPS)",
      labelAn01: "DespesasCorrentes",
    },
    {
      bloco: "Capital",
      codAn06: "DespesasDeCapitalExcetoFontesRPPS",
      codAn01: "DespesasDeCapital",
      labelAn06: "DespesasDeCapital (Exceto RPPS)",
      labelAn01: "DespesasDeCapital",
    },
  ];

  const detalhes: object[] = [];
  let totalComparacoes = 0;
  let comparacoesOk = 0;

  for (const periodo of Array.from(periodos).sort()) {
    const label = BIMESTRE_LABELS[periodo] ?? `Período ${periodo}`;
    for (const { bloco, codAn06, codAn01, labelAn06, labelAn01 } of blocos) {
      for (const { nome, colAn06, colAn01 } of colunas) {
        const keyAn06 = `${periodo}|RREO-Anexo 06|${codAn06}|${colAn06}`;
        const keyAn01 = `${periodo}|RREO-Anexo 01|${codAn01}|${colAn01}`;
        if (!idx.has(keyAn06) && !idx.has(keyAn01)) continue;

        const vAn06 = idx.get(keyAn06) ?? 0;
        const vAn01 = idx.get(keyAn01) ?? 0;

        totalComparacoes++;
        const ok = Math.abs(vAn06 - vAn01) <= TOLERANCIA;
        if (ok) comparacoesOk++;

        detalhes.push({
          periodo, label, bloco, nome,
          descricao_an06: `An06 — ${labelAn06} | ${colAn06}`,
          descricao_an01: `An01 — ${labelAn01} | ${colAn01}`,
          valor_an06: vAn06,
          valor_an01: vAn01,
          diferenca: vAn06 - vAn01,
          ok,
        });
      }
    }
  }

  if (totalComparacoes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum par comparável encontrado entre Anexo 01 e Anexo 06 — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  const nota = parseFloat((comparacoesOk / totalComparacoes).toFixed(4));
  const inconsistentes = totalComparacoes - comparacoesOk;

  if (inconsistentes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Todas as ${totalComparacoes} comparações consistentes entre Anexo 01 e Anexo 06 (${periodos.size} período(s), Correntes + Capital).`,
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: `${inconsistentes} de ${totalComparacoes} comparações com divergência entre Anexo 01 e Anexo 06.`,
    detalhes,
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00027",
  tipo: "RREO",
  descricao: "Igualdade entre Dotação atualizada, Despesas empenhadas e Liquidadas nos Anexos 1 e 6",
  nota_max: 1,
};
