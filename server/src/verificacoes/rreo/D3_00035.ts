import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, VerificacaoMeta } from "./shared";

// ── D3_00035: Reserva de Contingência — Anexo 01 × Anexo 06 ──────────────────
// Regra única (por período):
//   An01 ReservaDeContingencia col="DOTAÇÃO ATUALIZADA (e)"
//   = An06 RREO6ReservaDeContingencia col="DOTAÇÃO ATUALIZADA"
// Ausência de linha = 0. Aplica-se a todos os períodos disponíveis.
export async function verificarD3_00035(
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
           AND cod_conta = 'ReservaDeContingencia'
           AND coluna = 'DOTAÇÃO ATUALIZADA (e)')
         OR
         (anexo = 'RREO-Anexo 06'
           AND cod_conta = 'RREO6ReservaDeContingencia'
           AND coluna = 'DOTAÇÃO ATUALIZADA')
       )
     GROUP BY periodo, anexo`,
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
    idx.set(`${d.periodo}|${d.anexo}`, d.valor ?? 0);
    periodos.add(d.periodo);
  }

  const detalhes: object[] = [];
  let totalOk = 0;

  for (const periodo of Array.from(periodos).sort((a, b) => a - b)) {
    const label = BIMESTRE_LABELS[periodo] ?? `Período ${periodo}`;
    const an01Valor = idx.get(`${periodo}|RREO-Anexo 01`) ?? 0;
    const an06Valor = idx.get(`${periodo}|RREO-Anexo 06`) ?? 0;
    const diferenca = an01Valor - an06Valor;
    const consistente = Math.abs(diferenca) < 0.01;
    if (consistente) totalOk++;

    detalhes.push({
      periodo, label,
      an01_cod_conta: "ReservaDeContingencia",
      col_an01: "DOTAÇÃO ATUALIZADA (e)",
      an06_cod_conta: "RREO6ReservaDeContingencia",
      col_an06: "DOTAÇÃO ATUALIZADA",
      an01_valor: an01Valor,
      an06_valor: an06Valor,
      diferenca,
      consistente,
    });
  }

  const inconsistentes = periodos.size - totalOk;

  if (inconsistentes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Reserva de Contingência consistente entre Anexo 01 e Anexo 06 em todos os ${periodos.size} período(s) verificados.`,
      detalhes,
      observacoes_rodape: "Para a conta Reserva de Contingência, não se espera execução orçamentária direta, ou seja, não há comportamento normal de empenho, liquidação e pagamento. A própria natureza da reserva é servir como dotação de contingência para futura anulação e reforço de outras dotações. Por isso, o ponto relevante de validação é o estoque orçamentário da reserva no período, refletido na dotação atualizada.",
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: `Reserva de Contingência divergente em ${inconsistentes} de ${periodos.size} período(s) entre Anexo 01 e Anexo 06.`,
    detalhes,
    observacoes_rodape: "Para a conta Reserva de Contingência, não se espera execução orçamentária direta, ou seja, não há comportamento normal de empenho, liquidação e pagamento. A própria natureza da reserva é servir como dotação de contingência para futura anulação e reforço de outras dotações. Por isso, o ponto relevante de validação é o estoque orçamentário da reserva no período, refletido na dotação atualizada.",
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00035",
  tipo: "RREO",
  descricao: "Igualdade de Reserva de Contingência entre os Anexos 1 e 6 do RREO",
  nota_max: 1,
};
