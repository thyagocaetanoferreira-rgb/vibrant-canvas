import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, VerificacaoMeta } from "./shared";

// ── D3_00028: Receitas Realizadas Até o Bimestre — Anexo 01 × Anexo 06 ────────
// Regra 1: An06 RREO6ReceitasTributarias "RECEITAS REALIZADAS (a)"
//          = An01 ReceitaTributaria "Até o Bimestre (c)"
// Regra 2: An06 RREO6TransferenciasCorrentes "RECEITAS REALIZADAS (a)"
//          = An01 TransferenciasCorrentes "Até o Bimestre (c)"
// Regra 3: An06 ReceitasDeCapitalExcetoFontesRPPS "RECEITAS REALIZADAS (a)"
//          = An01 ReceitasDeCapital "Até o Bimestre (c)"
// Ausência de linha = 0 (não é erro por si só)
// Score: por período — todas as 3 comparações devem passar
export async function verificarD3_00028(
  municipioId: number, _codIbge: string, ano: number,
): Promise<Partial<ResultadoVerificacao>> {
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

  const comparacoes = [
    {
      nome: "Receita Tributária",
      codAn06: "RREO6ReceitasTributarias",
      codAn01: "ReceitaTributaria",
    },
    {
      nome: "Transferências Correntes",
      codAn06: "RREO6TransferenciasCorrentes",
      codAn01: "TransferenciasCorrentes",
    },
    {
      nome: "Receitas de Capital",
      codAn06: "ReceitasDeCapitalExcetoFontesRPPS",
      codAn01: "ReceitasDeCapital",
    },
  ];

  const codsAn06 = comparacoes.map(c => c.codAn06);
  const codsAn01 = comparacoes.map(c => c.codAn01);

  const { rows: dados } = await db.query<{
    periodo: number; anexo: string; cod_conta: string; valor: number;
  }>(
    `SELECT periodo, anexo, cod_conta, SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND rotulo = 'Padrão'
       AND (
         (anexo = 'RREO-Anexo 06' AND cod_conta = ANY($3::text[]) AND coluna = 'RECEITAS REALIZADAS (a)')
         OR
         (anexo = 'RREO-Anexo 01' AND cod_conta = ANY($4::text[]) AND coluna = 'Até o Bimestre (c)')
       )
     GROUP BY periodo, anexo, cod_conta`,
    [municipioId, ano, codsAn06, codsAn01],
  );

  const idx = new Map<string, number>();
  for (const d of dados) {
    idx.set(`${d.periodo}|${d.anexo}|${d.cod_conta}`, d.valor ?? 0);
  }

  const TOLERANCIA = 1.00;
  const detalhes: object[] = [];
  let periodosOk = 0;

  for (const periodo of periodos) {
    const label = BIMESTRE_LABELS[periodo] ?? `Período ${periodo}`;
    const resultsPeriodo: { nome: string; vAn06: number; vAn01: number; diferenca: number; ok: boolean }[] = [];

    for (const { nome, codAn06, codAn01 } of comparacoes) {
      // Ausência = 0, conforme especificação
      const vAn06 = idx.get(`${periodo}|RREO-Anexo 06|${codAn06}`) ?? 0;
      const vAn01 = idx.get(`${periodo}|RREO-Anexo 01|${codAn01}`) ?? 0;
      const diferenca = vAn06 - vAn01;
      const ok = Math.abs(diferenca) <= TOLERANCIA;
      resultsPeriodo.push({ nome, vAn06, vAn01, diferenca, ok });
    }

    const periodoOk = resultsPeriodo.every(r => r.ok);
    if (periodoOk) periodosOk++;

    for (const r of resultsPeriodo) {
      detalhes.push({
        periodo, label,
        nome: r.nome,
        valor_an06: r.vAn06,
        valor_an01: r.vAn01,
        diferenca: r.diferenca,
        ok: r.ok,
        periodo_consistente: periodoOk,
      });
    }
  }

  const totalPeriodos = periodos.length;
  const periodosInconsistentes = totalPeriodos - periodosOk;
  const nota = parseFloat((periodosOk / totalPeriodos).toFixed(4));

  if (periodosInconsistentes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Todos os ${totalPeriodos} período(s) consistentes — Receita Tributária, Transferências Correntes e Receitas de Capital iguais entre Anexo 01 e Anexo 06.`,
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota, nota_max: 1,
    resumo: `${periodosInconsistentes} de ${totalPeriodos} período(s) com divergência de Receitas Realizadas entre Anexo 01 e Anexo 06 (Tributária, Transferências ou Capital).`,
    detalhes,
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00028",
  tipo: "RREO",
  descricao: "Igualdade no total das Receitas Realizadas Até o Bimestre — Anexo 1 e Anexo 6",
  nota_max: 1,
};
