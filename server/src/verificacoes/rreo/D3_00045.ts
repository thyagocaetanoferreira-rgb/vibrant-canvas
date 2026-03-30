import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, VerificacaoMeta } from "./shared";

// ── D3_00045: Valores negativos em Restos a Pagar (An06, An07, An14) ─────────
// Exceções permitidas (An07, conta = TOTAL (III) = (I + II)):
//   1. RestosAPagarProcessadosENaoProcessadosLiquidadosInscritosEmExerciciosAnteriores | Em Exercícios Anteriores (a)
//   2. RestosAPagarProcessadosENaoProcessadosLiquidadosInscritosEmExercicioAnterior    | Em 31 de dezembro de XXXX (b)
//   3. RestosAPagarNaoProcessadosInscritosEmExerciciosAnteriores                       | Em Exercícios Anteriores (f)
//   4. RestosAPagarNaoProcessadosInscritosEmExercicioAnterior                          | Em 31 de dezembro de XXXX (g)
function ehExcecaoNegativoRP(
  anexo: string, cod_conta: string, coluna: string, conta: string,
): boolean {
  if (anexo !== "RREO-Anexo 07") return false;
  if (conta !== "TOTAL (III) = (I + II)") return false;

  if (cod_conta === "RestosAPagarProcessadosENaoProcessadosLiquidadosInscritosEmExerciciosAnteriores"
      && coluna === "Em Exercícios Anteriores (a)") return true;

  if (cod_conta === "RestosAPagarProcessadosENaoProcessadosLiquidadosInscritosEmExercicioAnterior"
      && coluna.startsWith("Em 31 de dezembro de") && coluna.endsWith("(b)")) return true;

  if (cod_conta === "RestosAPagarNaoProcessadosInscritosEmExerciciosAnteriores"
      && coluna === "Em Exercícios Anteriores (f)") return true;

  if (cod_conta === "RestosAPagarNaoProcessadosInscritosEmExercicioAnterior"
      && coluna.startsWith("Em 31 de dezembro de") && coluna.endsWith("(g)")) return true;

  return false;
}

export async function verificarD3_00045(
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
       AND anexo IN ('RREO-Anexo 06','RREO-Anexo 07','RREO-Anexo 14')
       AND (cod_conta ILIKE '%RestosAPagar%' OR conta ILIKE '%RESTOS A PAGAR%')
       AND valor < 0
     GROUP BY periodo, anexo, cod_conta, coluna
     ORDER BY periodo, anexo, cod_conta, coluna`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum valor negativo encontrado nas linhas de Restos a Pagar. Todos os valores são ≥ 0.",
      detalhes: [],
    };
  }

  const detalhes: object[] = [];
  let invalidos = 0;

  for (const d of rows) {
    const excecao = ehExcecaoNegativoRP(d.anexo, d.cod_conta, d.coluna, d.conta);
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

  if (invalidos === 0) {
    return {
      status: "aviso", nota: 1, nota_max: 1,
      resumo: `${total} valor(es) negativo(s) em Restos a Pagar, todos enquadrados nas exceções permitidas (inscrição em exercícios anteriores).`,
      detalhes,
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: `${invalidos} de ${total} valor(es) negativo(s) em Restos a Pagar não enquadrado(s) em exceção permitida.`,
    detalhes,
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00045",
  tipo: "RREO",
  descricao: "Verificação de valores negativos em Restos a Pagar",
  nota_max: 1,
};
