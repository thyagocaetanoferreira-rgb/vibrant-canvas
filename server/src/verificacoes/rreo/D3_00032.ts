import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, VerificacaoMeta } from "./shared";

// ── D3_00032: Recursos Arrecadados em Exercícios Anteriores (RPPS) — An01 × An04 × An06 ──
// Por período 1–6. Lógica de presença + igualdade de valores.
// An01: RecursosArrecadadosEmExerciciosAnteriores col="PREVISÃO ATUALIZADA (a)" (prioridade)
//       ou col="PREVISÃO INICIAL" (fallback)
// An04: RecursosRPPSArrecadadosEmExerciciosAnterioresPrevidenciario col="PREVISÃO ORÇAMENTÁRIA"
// An06: RecursosArrecadadosEmExerciciosAnteriores col="PREVISÃO ORÇAMENTÁRIA"
// Regra de presença: ausência nos 3 = válido; parcial (1 ou 2) = inválido; todos os 3 = compara valores.
export async function verificarD3_00032(
  municipioId: number, _codIbge: string, ano: number,
): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; anexo: string; coluna: string; valor: number;
  }>(
    `SELECT periodo, anexo, coluna, SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND rotulo = 'Padrão'
       AND (
         (anexo = 'RREO-Anexo 04'
           AND cod_conta = 'RecursosRPPSArrecadadosEmExerciciosAnterioresPrevidenciario'
           AND coluna = 'PREVISÃO ORÇAMENTÁRIA')
         OR
         (anexo = 'RREO-Anexo 06'
           AND cod_conta = 'RecursosArrecadadosEmExerciciosAnteriores'
           AND coluna = 'PREVISÃO ORÇAMENTÁRIA')
         OR
         (anexo = 'RREO-Anexo 01'
           AND cod_conta = 'RecursosArrecadadosEmExerciciosAnteriores'
           AND coluna IN ('PREVISÃO ATUALIZADA (a)', 'PREVISÃO INICIAL'))
       )
     GROUP BY periodo, anexo, coluna`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum dado dos Anexos 01, 04 e 06 encontrado — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  // Índice: "periodo|anexo|coluna" → valor
  const idx = new Map<string, number>();
  const periodos = new Set<number>();
  for (const d of rows) {
    idx.set(`${d.periodo}|${d.anexo}|${d.coluna}`, d.valor ?? 0);
    periodos.add(d.periodo);
  }

  const detalhes: object[] = [];
  let totalOk = 0;

  for (const periodo of Array.from(periodos).sort((a, b) => a - b)) {
    const label = BIMESTRE_LABELS[periodo] ?? `Período ${periodo}`;

    // An01 — prioriza PREVISÃO ATUALIZADA (a), fallback PREVISÃO INICIAL
    const keyAtual  = `${periodo}|RREO-Anexo 01|PREVISÃO ATUALIZADA (a)`;
    const keyInicial = `${periodo}|RREO-Anexo 01|PREVISÃO INICIAL`;
    const an01AtualExiste   = idx.has(keyAtual);
    const an01InicialExiste = idx.has(keyInicial);
    const an01Existe   = an01AtualExiste || an01InicialExiste;
    const an01ColUsada = an01AtualExiste
      ? "PREVISÃO ATUALIZADA (a)"
      : an01InicialExiste ? "PREVISÃO INICIAL" : null;
    const an01Valor = an01AtualExiste
      ? (idx.get(keyAtual) ?? 0)
      : an01InicialExiste ? (idx.get(keyInicial) ?? 0) : 0;

    // An04
    const keyAn04 = `${periodo}|RREO-Anexo 04|PREVISÃO ORÇAMENTÁRIA`;
    const an04Existe = idx.has(keyAn04);
    const an04Valor  = idx.get(keyAn04) ?? 0;

    // An06
    const keyAn06 = `${periodo}|RREO-Anexo 06|PREVISÃO ORÇAMENTÁRIA`;
    const an06Existe = idx.has(keyAn06);
    const an06Valor  = idx.get(keyAn06) ?? 0;

    const quantosPresentes = [an01Existe, an04Existe, an06Existe].filter(Boolean).length;
    const presencaOk = quantosPresentes === 0 || quantosPresentes === 3;

    let ok_01x04: boolean | null = null;
    let ok_01x06: boolean | null = null;
    let ok_04x06: boolean | null = null;
    let valoresOk = true;

    if (quantosPresentes === 3) {
      ok_01x04 = Math.abs(an01Valor - an04Valor) < 0.01;
      ok_01x06 = Math.abs(an01Valor - an06Valor) < 0.01;
      ok_04x06 = Math.abs(an04Valor - an06Valor) < 0.01;
      valoresOk = ok_01x04 && ok_01x06 && ok_04x06;
    }

    const consistente = presencaOk && valoresOk;
    if (consistente) totalOk++;

    detalhes.push({
      periodo, label,
      an01_existe: an01Existe,
      an04_existe: an04Existe,
      an06_existe: an06Existe,
      an01_coluna_usada: an01ColUsada,
      an01_valor: an01Valor,
      an04_valor: an04Valor,
      an06_valor: an06Valor,
      presenca_ok: presencaOk,
      ok_01x04,
      ok_01x06,
      ok_04x06,
      consistente,
    });
  }

  const inconsistentes = periodos.size - totalOk;

  if (inconsistentes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Recursos Arrecadados em Exercícios Anteriores (RPPS) consistentes entre Anexo 01, 04 e 06 em todos os ${periodos.size} período(s) verificados.`,
      detalhes,
      observacoes_rodape: "Contas analisadas: An01 — RecursosArrecadadosEmExerciciosAnteriores | PREVISÃO ATUALIZADA (a) (prioritária) ou PREVISÃO INICIAL · An04 — RecursosRPPSArrecadadosEmExerciciosAnterioresPrevidenciario | PREVISÃO ORÇAMENTÁRIA · An06 — RecursosArrecadadosEmExerciciosAnteriores | PREVISÃO ORÇAMENTÁRIA.",
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: `Recursos Arrecadados em Exercícios Anteriores (RPPS) divergentes em ${inconsistentes} de ${periodos.size} período(s) entre Anexo 01, 04 e 06.`,
    detalhes,
    observacoes_rodape: "Contas analisadas: An01 — RecursosArrecadadosEmExerciciosAnteriores | PREVISÃO ATUALIZADA (a) (prioritária) ou PREVISÃO INICIAL · An04 — RecursosRPPSArrecadadosEmExerciciosAnterioresPrevidenciario | PREVISÃO ORÇAMENTÁRIA · An06 — RecursosArrecadadosEmExerciciosAnteriores | PREVISÃO ORÇAMENTÁRIA.",
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00032",
  tipo: "RREO",
  descricao: "Igualdade de Recursos Arrecadados em Exercícios Anteriores (RPPS) entre os Anexos 1, 4 e 6 do RREO",
  nota_max: 1,
};
