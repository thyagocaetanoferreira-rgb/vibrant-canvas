import { db } from "../../db";
import { ResultadoVerificacao, BIMESTRE_LABELS, VerificacaoMeta } from "./shared";

// ── D3_00030: Receitas RPPS — Anexo 04 × soma de 4 contas do Anexo 06 ─────────
// Aplica-se apenas ao 6° Bimestre (período 6).
// An04 TotalReceitasRPPSPrevidenciario "RECEITAS REALIZADAS ATÉ O BIMESTRE (b)"
// = COALESCE(ReceitasPrimariasCorrentesComFontesRPPS, 0)
// + COALESCE(ReceitasNaoPrimariasCorrentesComFontesRPPS, 0)
// + COALESCE(ReceitasPrimariasDeCapitalComFontesRPPS, 0)
// + COALESCE(ReceitasNaoPrimariasDeCapitalComFontesRPPS, 0)
export async function verificarD3_00030(
  municipioId: number, _codIbge: string, ano: number,
): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{
    periodo: number; anexo: string; cod_conta: string; valor: number;
  }>(
    `SELECT periodo, anexo, cod_conta, SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND periodo = 6
       AND rotulo = 'Padrão'
       AND (
         (anexo = 'RREO-Anexo 04' AND cod_conta = 'TotalReceitasRPPSPrevidenciario'
           AND coluna = 'RECEITAS REALIZADAS ATÉ O BIMESTRE (b)')
         OR
         (anexo = 'RREO-Anexo 06'
           AND cod_conta IN (
             'ReceitasPrimariasCorrentesComFontesRPPS',
             'ReceitasNaoPrimariasCorrentesComFontesRPPS',
             'ReceitasPrimariasDeCapitalComFontesRPPS',
             'ReceitasNaoPrimariasDeCapitalComFontesRPPS'
           )
           AND coluna = 'RECEITAS REALIZADAS (a)')
       )
     GROUP BY periodo, anexo, cod_conta`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum dado do 6° Bimestre nos Anexos 04 e 06 encontrado — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  const idx = new Map<string, number>();
  const periodos = new Set<number>();
  for (const d of rows) {
    idx.set(`${d.periodo}|${d.anexo}|${d.cod_conta}`, d.valor ?? 0);
    periodos.add(d.periodo);
  }

  const TOLERANCIA = 1.00;
  const COD_AN06 = [
    "ReceitasPrimariasCorrentesComFontesRPPS",
    "ReceitasNaoPrimariasCorrentesComFontesRPPS",
    "ReceitasPrimariasDeCapitalComFontesRPPS",
    "ReceitasNaoPrimariasDeCapitalComFontesRPPS",
  ];

  const detalhes: object[] = [];
  let totalPeriodos = 0;
  let periodosOk = 0;

  for (const periodo of Array.from(periodos).sort()) {
    const label = BIMESTRE_LABELS[periodo] ?? `Período ${periodo}`;
    const vAn04 = idx.get(`${periodo}|RREO-Anexo 04|TotalReceitasRPPSPrevidenciario`) ?? null;

    if (vAn04 === null) continue; // An04 ausente neste período — não analisa

    totalPeriodos++;
    const componentes = COD_AN06.map(cod => ({
      cod_conta: cod,
      valor: idx.get(`${periodo}|RREO-Anexo 06|${cod}`) ?? 0,
    }));
    const somaAn06 = componentes.reduce((acc, c) => acc + c.valor, 0);
    const diferenca = vAn04 - somaAn06;
    const ok = Math.abs(diferenca) <= TOLERANCIA;
    if (ok) periodosOk++;

    detalhes.push({
      periodo, label,
      valor_an04: vAn04,
      soma_an06: somaAn06,
      componentes,
      diferenca,
      ok,
    });
  }

  if (totalPeriodos === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum registro do Anexo 04 no 6° Bimestre encontrado — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  const inconsistentes = totalPeriodos - periodosOk;

  if (inconsistentes === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `6° Bimestre consistente — total de receitas RPPS igual entre Anexo 04 e Anexo 06.`,
      detalhes,
      observacoes_rodape: "Contas analisadas (apenas 6° Bimestre): An04 — TotalReceitasRPPSPrevidenciario | RECEITAS REALIZADAS ATÉ O BIMESTRE (b) · An06 — soma de ReceitasPrimariasCorrentesComFontesRPPS + ReceitasNaoPrimariasCorrentesComFontesRPPS + ReceitasPrimariasDeCapitalComFontesRPPS + ReceitasNaoPrimariasDeCapitalComFontesRPPS | RECEITAS REALIZADAS (a).",
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: `6° Bimestre com divergência entre o total de receitas RPPS do Anexo 04 e a soma do Anexo 06.`,
    detalhes,
    observacoes_rodape: "Contas analisadas (apenas 6° Bimestre): An04 — TotalReceitasRPPSPrevidenciario | RECEITAS REALIZADAS ATÉ O BIMESTRE (b) · An06 — soma de ReceitasPrimariasCorrentesComFontesRPPS + ReceitasNaoPrimariasCorrentesComFontesRPPS + ReceitasPrimariasDeCapitalComFontesRPPS + ReceitasNaoPrimariasDeCapitalComFontesRPPS | RECEITAS REALIZADAS (a).",
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00030",
  tipo: "RREO",
  descricao: "Igualdade entre total de receitas previdenciárias do Anexo 4 com o Anexo 6 do RREO",
  nota_max: 1,
};
