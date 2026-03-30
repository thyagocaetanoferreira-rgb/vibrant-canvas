import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, SEMESTRE_LABELS, VerificacaoMeta } from "./shared";

// ── D1_00011: Quantidade de retificações dos RREOs do exercício ───────────────
export async function verificarD1_00011(municipioId: number, _codIbge: string, ano: number): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; tipo_relatorio: string | null; periodicidade: string | null;
    status_relatorio: string; data_status: string | null; instituicao: string | null;
  }>(
    `SELECT periodo, tipo_relatorio, periodicidade, status_relatorio, data_status, instituicao
     FROM siconfi_extrato_entregas
     WHERE municipio_id = $1
       AND exercicio = $2
       AND (entregavel ILIKE '%RREO%' OR entregavel ILIKE '%Relat%Resumido%')
     ORDER BY periodo, status_relatorio`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "nao_aplicavel", nota: 0, nota_max: 1,
      resumo: "Nenhum dado do extrato de entregas encontrado. Sincronize o extrato primeiro.",
      detalhes: [],
    };
  }

  const semestral = rows.some(r => r.tipo_relatorio?.trim() === "S" || r.periodicidade?.trim() === "S");
  const labels = semestral ? SEMESTRE_LABELS : BIMESTRE_LABELS;

  const retificacoes = rows.filter(r => r.status_relatorio?.trim() === "RE");
  const countRE = retificacoes.length;

  const detalhes = rows.map(r => ({
    periodo: r.periodo,
    label: labels[r.periodo] ?? `Período ${r.periodo}`,
    status_relatorio: r.status_relatorio,
    data_status: r.data_status,
    instituicao: r.instituicao,
  }));

  const nota = parseFloat(Math.max(0, 1 - countRE * 0.1).toFixed(4));

  if (countRE === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhuma retificação encontrada nos RREOs do exercício.",
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota, nota_max: 1,
    resumo: `${countRE} retificação(ões) encontrada(s). Cada RE desconta 0,1 da nota.`,
    detalhes,
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D1_00011",
  tipo: "RREO",
  descricao: "Quantidade de retificações dos RREOs do exercício",
  nota_max: 1,
};
