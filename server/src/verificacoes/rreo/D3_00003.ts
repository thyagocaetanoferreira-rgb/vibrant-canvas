import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, VerificacaoMeta } from "./shared";

// ── D3_00003: Igualdade de despesas entre Anexo 01 e Anexo 06 ────────────────
// Vigência: 2019–2021. A partir de 2022 o SICONFI não executa mais esta verificação.
export async function verificarD3_00003(municipioId: number, _codIbge: string, ano: number): Promise<Partial<ResultadoVerificacao>> {
  if (ano < 2019 || ano > 2021) {
    return {
      status: "nao_aplicavel", nota: 0, nota_max: 1,
      resumo: `Regra vigente apenas para os exercícios de 2019 a 2021. A partir de 2022, o SICONFI não executa mais esta verificação (exercício selecionado: ${ano}).`,
      detalhes: [],
    };
  }

  // Uma única query busca tudo: An01 (Correntes+Capital × 3 colunas) + An06 (idem)
  const { rows } = await db.query<{
    periodo: number; anexo: string; cod_conta: string; coluna: string; valor: number;
  }>(
    `SELECT periodo, anexo, cod_conta, coluna, SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND (
         (anexo = 'RREO-Anexo 01'
           AND cod_conta IN ('DespesasCorrentes','DespesasDeCapital')
           AND coluna IN (
             'DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)',
             'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)',
             'DESPESAS PAGAS ATÉ O BIMESTRE (j)'
           ))
         OR
         (anexo = 'RREO-Anexo 06'
           AND cod_conta IN ('DespesasCorrentesExcetoFontesRPPS','DespesasDeCapitalExcetoFontesRPPS')
           AND coluna IN ('DESPESAS EMPENHADAS','DESPESAS LIQUIDADAS','DESPESAS PAGAS (a)'))
       )
     GROUP BY periodo, anexo, cod_conta, coluna`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum dado do RREO Anexo 01 / Anexo 06 encontrado — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  // Indexa: periodo|anexo|cod_conta|coluna → valor
  const idx = new Map<string, number>();
  const periodos = new Set<number>();
  for (const d of rows) {
    idx.set(`${d.periodo}|${d.anexo}|${d.cod_conta}|${d.coluna}`, d.valor ?? 0);
    periodos.add(d.periodo);
  }

  // Matriz de comparações: categoria × tipo
  const comparacoes = [
    {
      categoria: "Correntes",
      contaAn01: "DespesasCorrentes",
      contaAn06: "DespesasCorrentesExcetoFontesRPPS",
      tipos: [
        { tipo: "Empenhadas", colAn01: "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)", colAn06: "DESPESAS EMPENHADAS" },
        { tipo: "Liquidadas",  colAn01: "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)", colAn06: "DESPESAS LIQUIDADAS" },
        { tipo: "Pagas",       colAn01: "DESPESAS PAGAS ATÉ O BIMESTRE (j)",      colAn06: "DESPESAS PAGAS (a)" },
      ],
    },
    {
      categoria: "Capital",
      contaAn01: "DespesasDeCapital",
      contaAn06: "DespesasDeCapitalExcetoFontesRPPS",
      tipos: [
        { tipo: "Empenhadas", colAn01: "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)", colAn06: "DESPESAS EMPENHADAS" },
        { tipo: "Liquidadas",  colAn01: "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)", colAn06: "DESPESAS LIQUIDADAS" },
        { tipo: "Pagas",       colAn01: "DESPESAS PAGAS ATÉ O BIMESTRE (j)",      colAn06: "DESPESAS PAGAS (a)" },
      ],
    },
  ];

  const TOLERANCIA = 1.00;
  const detalhes: object[] = [];
  let totalComparacoes = 0;
  let comparacoesOk = 0;

  for (const periodo of Array.from(periodos).sort()) {
    for (const { categoria, contaAn01, contaAn06, tipos } of comparacoes) {
      for (const { tipo, colAn01, colAn06 } of tipos) {
        const keyAn01 = `${periodo}|RREO-Anexo 01|${contaAn01}|${colAn01}`;
        const keyAn06 = `${periodo}|RREO-Anexo 06|${contaAn06}|${colAn06}`;
        if (!idx.has(keyAn01) && !idx.has(keyAn06)) continue;

        const vAn01 = idx.get(keyAn01) ?? 0;
        const vAn06 = idx.get(keyAn06) ?? 0;

        totalComparacoes++;
        const igualou = Math.abs(vAn01 - vAn06) <= TOLERANCIA;
        if (igualou) comparacoesOk++;

        detalhes.push({
          periodo,
          label: BIMESTRE_LABELS[periodo] ?? `Período ${periodo}`,
          categoria,
          tipo,
          valor_anexo01: vAn01,
          valor_anexo06: vAn06,
          diferenca: vAn06 - vAn01,
          ok: igualou,
        });
      }
    }
  }

  if (totalComparacoes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum dado comparável encontrado nos Anexos 01 e 06 — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  const nota = parseFloat((comparacoesOk / totalComparacoes).toFixed(4));
  const inconsistentes = totalComparacoes - comparacoesOk;
  const nPeriodos = periodos.size;

  if (inconsistentes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Todas as ${totalComparacoes} comparações consistentes (${nPeriodos} período(s), Correntes + Capital).`,
      detalhes,
      observacoes_rodape: "Contas analisadas: An01 — DespesasCorrentes e DespesasDeCapital · An06 — DespesasCorrentesExcetoFontesRPPS e DespesasDeCapitalExcetoFontesRPPS. Colunas (An01 → An06): Empenhadas: DESPESAS EMPENHADAS ATÉ O BIMESTRE (f) = DESPESAS EMPENHADAS · Liquidadas: DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h) = DESPESAS LIQUIDADAS · Pagas: DESPESAS PAGAS ATÉ O BIMESTRE (j) = DESPESAS PAGAS (a).",
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: `${inconsistentes} de ${totalComparacoes} comparações com divergência entre Anexo 01 e Anexo 06.`,
    detalhes,
    observacoes_rodape: "Contas analisadas: An01 — DespesasCorrentes e DespesasDeCapital · An06 — DespesasCorrentesExcetoFontesRPPS e DespesasDeCapitalExcetoFontesRPPS. Colunas (An01 → An06): Empenhadas: DESPESAS EMPENHADAS ATÉ O BIMESTRE (f) = DESPESAS EMPENHADAS · Liquidadas: DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h) = DESPESAS LIQUIDADAS · Pagas: DESPESAS PAGAS ATÉ O BIMESTRE (j) = DESPESAS PAGAS (a).",
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00003",
  tipo: "RREO",
  descricao: "Igualdade da Informação de despesas orçamentárias entre os anexos 1 e 6 do RREO",
  nota_max: 1,
};
