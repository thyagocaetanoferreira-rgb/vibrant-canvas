import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, SEMESTRE_LABELS, calcPrazoRREO, soData, VerificacaoMeta } from "./shared";

// ── D1_00006: Tempestividade na entrega dos RREOs ─────────────────────────────
// Usa a data_status mais cedo por período (HO ou RE). Para retificações (RE),
// a API SICONFI não fornece a data da homologação original — a data disponível
// é a da retificação, o que pode subestimar a nota quando o HO original foi no prazo.
export async function verificarD1_00006(municipioId: number, _codIbge: string, ano: number): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; tipo_relatorio: string | null; periodicidade: string | null;
    data_status: string | null; instituicao: string | null; status_relatorio: string | null;
  }>(
    `SELECT DISTINCT ON (periodo)
       periodo, tipo_relatorio, periodicidade, data_status, instituicao, status_relatorio
     FROM siconfi_extrato_entregas
     WHERE municipio_id = $1
       AND exercicio = $2
       AND (entregavel ILIKE '%RREO%' OR entregavel ILIKE '%Relat%Resumido%')
     ORDER BY periodo, data_status ASC NULLS LAST`,
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
  const periodosEsperados = semestral ? [1, 2] : [1, 2, 3, 4, 5, 6];
  const labels = semestral ? SEMESTRE_LABELS : BIMESTRE_LABELS;
  const total = periodosEsperados.length;

  const entregues = new Map(rows.map(r => [r.periodo, r]));

  const detalhes = periodosEsperados.map(p => {
    const r = entregues.get(p);
    const prazo = calcPrazoRREO(p, semestral, ano);
    const prazoStr = prazo.toLocaleDateString("pt-BR");

    if (!r || !r.data_status) {
      return { periodo: p, label: labels[p], entregue: false, prazo: prazoStr, intempestiva: null };
    }

    const dataEnvio = soData(new Date(r.data_status));
    const intempestiva = dataEnvio > prazo;

    return {
      periodo: p, label: labels[p], entregue: true,
      data_status: r.data_status, status_relatorio: r.status_relatorio,
      prazo: prazoStr, intempestiva, instituicao: r.instituicao,
    };
  });

  const temRetificacao = rows.some(r => r.status_relatorio?.trim() === "RE");
  const noPrazo        = detalhes.filter(d => d.entregue && !d.intempestiva).length;
  const intempestivos  = detalhes.filter(d => d.entregue && d.intempestiva === true).length;
  const nota = parseFloat((noPrazo / total).toFixed(4));
  const tipo = semestral ? "semestres" : "bimestres";

  if (intempestivos === 0 && noPrazo === total) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `${total}/${total} ${tipo} entregues no prazo.`,
      detalhes, temRetificacao,
    };
  }

  return {
    status: "inconsistente", nota, nota_max: 1,
    resumo: `${noPrazo}/${total} no prazo. ${intempestivos} intempestivo(s).`,
    detalhes, temRetificacao,
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D1_00006",
  tipo: "RREO",
  descricao: "Tempestividade na entrega dos RREOs",
  nota_max: 1,
};
