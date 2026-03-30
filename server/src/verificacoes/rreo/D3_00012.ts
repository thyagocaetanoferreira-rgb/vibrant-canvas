import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, ehExcecaoNegativoRREO, VerificacaoMeta } from "./shared";

// ── D3_00012: Valores negativos inválidos no RREO ────────────────────────────
export async function verificarD3_00012(
  municipioId: number, _codIbge: string, ano: number,
): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; anexo: string; cod_conta: string; conta: string;
    coluna: string; valor: number; ocorrencias: number;
  }>(
    `SELECT periodo, anexo, cod_conta, MAX(conta) AS conta, coluna,
            MIN(valor)::float AS valor, COUNT(*)::int AS ocorrencias
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND rotulo = 'Padrão'
       AND valor < 0
     GROUP BY periodo, anexo, cod_conta, coluna
     ORDER BY periodo, anexo, cod_conta, coluna`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum valor negativo encontrado no RREO. Todos os valores são ≥ 0.",
      detalhes: [],
    };
  }

  const detalhes: object[] = [];
  let invalidos = 0;

  for (const d of rows) {
    const excecao = ehExcecaoNegativoRREO(d.coluna, d.cod_conta);
    if (!excecao) invalidos++;
    detalhes.push({
      periodo: d.periodo,
      label: BIMESTRE_LABELS[d.periodo] ?? `Período ${d.periodo}`,
      anexo: d.anexo,
      cod_conta: d.cod_conta,
      conta: d.conta,
      coluna: d.coluna,
      valor: d.valor,
      ocorrencias: d.ocorrencias,
      excecao,
      ok: excecao,
    });
  }

  const total = rows.length;
  const nota = parseFloat(((total - invalidos) / total).toFixed(4));

  if (invalidos === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `${total} combinação(ões) com valor negativo, todas enquadradas em exceções permitidas (saldo, resultado, meta fiscal).`,
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: `${invalidos} de ${total} combinação(ões) com valor negativo não enquadrado em exceção permitida.`,
    detalhes,
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00012",
  tipo: "RREO",
  descricao: "Informação de valores negativos no RREO",
  nota_max: 1,
};
