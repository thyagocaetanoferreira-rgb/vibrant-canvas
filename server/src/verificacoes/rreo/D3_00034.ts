import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, VerificacaoMeta } from "./shared";

// ── D3_00034: Reserva do RPPS — Anexo 01 × Anexo 04 e Anexo 01 × Anexo 06 ────
// Regra 1 (por período): An01 ReservaDoRPPS col="DOTAÇÃO ATUALIZADA (e)"
//   = An04 ReservaOrcamentariaDoRPPSPrevidenciario col="PREVISÃO ORÇAMENTÁRIA"
// Regra 2 (por período): An01 ReservaDoRPPS col="DOTAÇÃO ATUALIZADA (e)"
//   = An06 ReservaOrcamentariaDoRPPSPrevidenciario col="PREVISÃO ORÇAMENTÁRIA"
// Ausência de linha = 0. Consistente apenas se ambas as regras passarem em cada período.
export async function verificarD3_00034(
  municipioId: number, _codIbge: string, ano: number,
): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; anexo: string; valor: number;
  }>(
    `SELECT periodo, anexo, SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND rotulo = 'Padrão'
       AND (
         (anexo = 'RREO-Anexo 01'
           AND cod_conta = 'ReservaDoRPPS'
           AND coluna = 'DOTAÇÃO ATUALIZADA (e)')
         OR
         (anexo = 'RREO-Anexo 04'
           AND cod_conta = 'ReservaOrcamentariaDoRPPSPrevidenciario'
           AND coluna = 'PREVISÃO ORÇAMENTÁRIA')
         OR
         (anexo = 'RREO-Anexo 06'
           AND cod_conta = 'ReservaOrcamentariaDoRPPSPrevidenciario'
           AND coluna = 'PREVISÃO ORÇAMENTÁRIA')
       )
     GROUP BY periodo, anexo`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum dado dos Anexos 01, 04 e 06 encontrado — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  const idx = new Map<string, number>();
  const periodos = new Set<number>();
  for (const d of rows) {
    idx.set(`${d.periodo}|${d.anexo}`, d.valor ?? 0);
    periodos.add(d.periodo);
  }

  const detalhes: object[] = [];
  let totalOk = 0;
  let totalComparacoes = 0;

  for (const periodo of Array.from(periodos).sort((a, b) => a - b)) {
    const label = BIMESTRE_LABELS[periodo] ?? `Período ${periodo}`;
    const an01Valor = idx.get(`${periodo}|RREO-Anexo 01`) ?? 0;
    const an04Valor = idx.get(`${periodo}|RREO-Anexo 04`) ?? 0;
    const an06Valor = idx.get(`${periodo}|RREO-Anexo 06`) ?? 0;

    const dif01x04 = an01Valor - an04Valor;
    const dif01x06 = an01Valor - an06Valor;
    const ok01x04 = Math.abs(dif01x04) < 0.01;
    const ok01x06 = Math.abs(dif01x06) < 0.01;

    totalComparacoes += 2;
    if (ok01x04) totalOk++;
    if (ok01x06) totalOk++;

    detalhes.push({
      periodo, label,
      comparacao: "An01 × An04",
      an01_cod_conta: "ReservaDoRPPS",
      col_an01: "DOTAÇÃO ATUALIZADA (e)",
      outro_anexo: "RREO-Anexo 04",
      outro_cod_conta: "ReservaOrcamentariaDoRPPSPrevidenciario",
      col_outro: "PREVISÃO ORÇAMENTÁRIA",
      an01_valor: an01Valor,
      outro_valor: an04Valor,
      diferenca: dif01x04,
      consistente: ok01x04,
    });
    detalhes.push({
      periodo, label,
      comparacao: "An01 × An06",
      an01_cod_conta: "ReservaDoRPPS",
      col_an01: "DOTAÇÃO ATUALIZADA (e)",
      outro_anexo: "RREO-Anexo 06",
      outro_cod_conta: "ReservaOrcamentariaDoRPPSPrevidenciario",
      col_outro: "PREVISÃO ORÇAMENTÁRIA",
      an01_valor: an01Valor,
      outro_valor: an06Valor,
      diferenca: dif01x06,
      consistente: ok01x06,
    });
  }

  const inconsistentes = totalComparacoes - totalOk;

  if (inconsistentes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Reserva do RPPS consistente entre Anexo 01, Anexo 04 e Anexo 06 em todos os ${periodos.size} período(s) verificados.`,
      detalhes,
      observacoes_rodape: "Não compare a Reserva do RPPS com: empenhado, liquidado, pago, resultado primário ou Reserva de Contingência (XXIX) do Anexo 6. O motivo é normativo: o MCASP afirma que a Reserva do RPPS não pode ser executada orçamentariamente no exercício em que foi constituída. Logo, ela é uma dotação de equilíbrio, não uma despesa executável naquele exercício.",
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: `Reserva do RPPS divergente em ${inconsistentes} de ${totalComparacoes} comparações (${periodos.size} período(s) entre Anexo 01, 04 e 06).`,
    detalhes,
    observacoes_rodape: "Não compare a Reserva do RPPS com: empenhado, liquidado, pago, resultado primário ou Reserva de Contingência (XXIX) do Anexo 6. O motivo é normativo: o MCASP afirma que a Reserva do RPPS não pode ser executada orçamentariamente no exercício em que foi constituída. Logo, ela é uma dotação de equilíbrio, não uma despesa executável naquele exercício.",
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00034",
  tipo: "RREO",
  descricao: "Igualdade de Reserva do RPPS entre os Anexos 1, 4 e 6 do RREO",
  nota_max: 1,
};
