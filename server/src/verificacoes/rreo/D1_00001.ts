import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, SEMESTRE_LABELS, VerificacaoMeta } from "./shared";

// ── D1_00001: Entrega de todos os RREOs ────────────────────────────────────
export async function verificarD1_00001(municipioId: number, _codIbge: string, ano: number): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; tipo_relatorio: string | null; periodicidade: string | null;
    status_relatorio: string | null; data_status: string | null; instituicao: string | null;
  }>(
    `SELECT periodo, tipo_relatorio, periodicidade, status_relatorio, data_status, instituicao
     FROM siconfi_extrato_entregas
     WHERE municipio_id = $1
       AND exercicio = $2
       AND (entregavel ILIKE '%RREO%' OR entregavel ILIKE '%Relat%Resumido%')
     ORDER BY periodo`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "nao_aplicavel",
      nota: 0, nota_max: 1,
      resumo: "Nenhum dado do extrato de entregas encontrado. Sincronize o extrato primeiro.",
      detalhes: [],
    };
  }

  const semestral = rows.some(r => r.tipo_relatorio?.trim() === "S" || r.periodicidade?.trim() === "S");
  const periodosEsperados = semestral ? [1, 2] : [1, 2, 3, 4, 5, 6];
  const labels = semestral ? SEMESTRE_LABELS : BIMESTRE_LABELS;
  const total = periodosEsperados.length;
  const tipo = semestral ? "semestres" : "bimestres";

  const entregues = new Map(rows.map(r => [r.periodo, r]));
  const detalhes = periodosEsperados.map(p => {
    const r = entregues.get(p);
    return r
      ? { periodo: p, label: labels[p], entregue: true, status_relatorio: r.status_relatorio, data_status: r.data_status, instituicao: r.instituicao }
      : { periodo: p, label: labels[p], entregue: false };
  });

  const faltando = periodosEsperados.filter(p => !entregues.has(p));
  const entreguesCount = total - faltando.length;
  const nota = parseFloat((entreguesCount / total).toFixed(4));

  if (faltando.length === 0) {
    return { status: "consistente", nota: 1, nota_max: 1, resumo: `${total}/${total} ${tipo} entregues.`, detalhes };
  }

  const faltandoLabels = faltando.map(p => labels[p]).join(", ");
  return {
    status: "inconsistente", nota, nota_max: 1,
    resumo: `${entreguesCount}/${total} ${tipo} entregues. Faltam: ${faltandoLabels}.`,
    detalhes,
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D1_00001",
  tipo: "RREO",
  descricao: "Entrega de todos os RREOs",
  nota_max: 1,
};
