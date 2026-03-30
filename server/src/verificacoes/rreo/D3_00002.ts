import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, VerificacaoMeta } from "./shared";

// ── D3_00002: Igualdade de despesas entre Anexo 01 e Anexo 02 ────────────────
export async function verificarD3_00002(municipioId: number, _codIbge: string, ano: number): Promise<Partial<ResultadoVerificacao>> {
  // Busca todos os períodos disponíveis para o exercício
  const { rows: periodosRows } = await db.query<{ periodo: number }>(
    `SELECT DISTINCT periodo FROM siconfi_rreo
     WHERE municipio_id = $1 AND exercicio = $2
     ORDER BY periodo`,
    [municipioId, ano],
  );

  if (periodosRows.length === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum dado do RREO encontrado — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  const periodos = periodosRows.map(r => r.periodo);

  // Três comparações conforme especificação:
  // An01: cod_conta = 'TotalDespesas', rotulo = 'Padrão'
  // An02: cod_conta = 'RREO2TotalDespesas', rotulo = 'Total das Despesas Exceto Intra-Orçamentárias'
  const comparacoes = [
    {
      tipo: "Dotação Atualizada",
      colAn01: "DOTAÇÃO ATUALIZADA (e)",
      colAn02: "DOTAÇÃO ATUALIZADA (a)",
    },
    {
      tipo: "Empenhadas",
      colAn01: "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)",
      colAn02: "DESPESAS EMPENHADAS ATÉ O BIMESTRE (b)",
    },
    {
      tipo: "Liquidadas",
      colAn01: "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)",
      colAn02: "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)",
    },
  ];

  const colunasAn01 = comparacoes.map(c => c.colAn01);
  const colunasAn02 = comparacoes.map(c => c.colAn02);

  // Busca todos os valores relevantes de uma vez
  const { rows: dados } = await db.query<{
    periodo: number; anexo: string; coluna: string; valor: number;
  }>(
    `SELECT periodo, anexo, coluna, SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND periodo = ANY($3::int[])
       AND (
         (anexo = 'RREO-Anexo 01'
           AND cod_conta = 'TotalDespesas'
           AND rotulo = 'Padrão'
           AND coluna = ANY($4::text[]))
         OR
         (anexo = 'RREO-Anexo 02'
           AND cod_conta = 'RREO2TotalDespesas'
           AND rotulo = 'Total das Despesas Exceto Intra-Orçamentárias'
           AND coluna = ANY($5::text[]))
       )
     GROUP BY periodo, anexo, coluna
     ORDER BY periodo, anexo, coluna`,
    [municipioId, ano, periodos, colunasAn01, colunasAn02],
  );

  // Indexa: "periodo|anexo|coluna" → valor
  const idx = new Map<string, number>();
  for (const d of dados) {
    idx.set(`${d.periodo}|${d.anexo}|${d.coluna}`, d.valor ?? 0);
  }

  const TOLERANCIA = 1.00;
  const detalhes: object[] = [];
  let periodosOk = 0;

  for (const periodo of periodos) {
    const resultsPeriodo: { tipo: string; vAn01: number; vAn02: number; diferenca: number; ok: boolean }[] = [];

    for (const cmp of comparacoes) {
      // Ausência de linha = 0, conforme especificação
      const vAn01 = idx.get(`${periodo}|RREO-Anexo 01|${cmp.colAn01}`) ?? 0;
      const vAn02 = idx.get(`${periodo}|RREO-Anexo 02|${cmp.colAn02}`) ?? 0;
      const diferenca = vAn02 - vAn01;
      const ok = Math.abs(diferenca) <= TOLERANCIA;
      resultsPeriodo.push({ tipo: cmp.tipo, vAn01, vAn02, diferenca, ok });
    }

    const periodoConsistente = resultsPeriodo.every(r => r.ok);
    if (periodoConsistente) periodosOk++;

    for (const r of resultsPeriodo) {
      detalhes.push({
        periodo,
        label: BIMESTRE_LABELS[periodo] ?? `Período ${periodo}`,
        tipo: r.tipo,
        valor_anexo01: r.vAn01,
        valor_anexo02: r.vAn02,
        diferenca: r.diferenca,
        ok: r.ok,
        periodo_consistente: periodoConsistente,
      });
    }
  }

  const totalPeriodos = periodos.length;
  const periodosInconsistentes = totalPeriodos - periodosOk;
  const nota = parseFloat((periodosOk / totalPeriodos).toFixed(4));

  if (periodosInconsistentes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Todos os ${totalPeriodos} período(s) consistentes entre Anexo 01 (TotalDespesas) e Anexo 02 (RREO2TotalDespesas) nas 3 comparações.`,
      detalhes,
      observacoes_rodape: "Contas analisadas: An01 — TotalDespesas | Rótulo: Padrão · An02 — RREO2TotalDespesas | Rótulo: Total das Despesas Exceto Intra-Orçamentárias. Colunas (An01 → An02): Dotação Atualizada: DOTAÇÃO ATUALIZADA (e) = DOTAÇÃO ATUALIZADA (a) · Empenhadas: DESPESAS EMPENHADAS ATÉ O BIMESTRE (f) = DESPESAS EMPENHADAS ATÉ O BIMESTRE (b) · Liquidadas: DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h) = DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d).",
    };
  }

  return {
    status: "inconsistente", nota, nota_max: 1,
    resumo: `${periodosInconsistentes} de ${totalPeriodos} período(s) com divergência entre Anexo 01 e Anexo 02 (Dotação Atualizada, Empenhadas ou Liquidadas).`,
    detalhes,
    observacoes_rodape: "Contas analisadas: An01 — TotalDespesas | Rótulo: Padrão · An02 — RREO2TotalDespesas | Rótulo: Total das Despesas Exceto Intra-Orçamentárias. Colunas (An01 → An02): Dotação Atualizada: DOTAÇÃO ATUALIZADA (e) = DOTAÇÃO ATUALIZADA (a) · Empenhadas: DESPESAS EMPENHADAS ATÉ O BIMESTRE (f) = DESPESAS EMPENHADAS ATÉ O BIMESTRE (b) · Liquidadas: DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h) = DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d).",
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00002",
  tipo: "RREO",
  descricao: "Igualdade da Informação de despesas orçamentárias entre os anexos 1 e 2 do RREO",
  nota_max: 1,
};
