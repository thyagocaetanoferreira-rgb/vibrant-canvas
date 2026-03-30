import { db } from "../../db";
import { ResultadoVerificacao, VerificacaoMeta } from "./shared";

// ── D3_00001: Resultado orçamentário no RREO Anexo 01, 6° bimestre ──────────
// Identidade contábil: TotalReceitas + Deficit = TotalDespesasComSuperavit
// Equivalente a: TotalReceitasComDeficit = TotalDespesasComSuperavit
export async function verificarD3_00001(municipioId: number, _codIbge: string, ano: number): Promise<Partial<ResultadoVerificacao>> {
  const { rows } = await db.query<{ cod_conta: string; coluna: string; valor: number }>(
    `SELECT cod_conta, coluna, SUM(valor)::float AS valor
     FROM siconfi_rreo
     WHERE municipio_id = $1
       AND exercicio = $2
       AND anexo = 'RREO-Anexo 01'
       AND periodo = 6
       AND cod_conta IN ('TotalReceitas','TotalDespesasComSuperavit','Superavit','Deficit')
       AND coluna IN ('Até o Bimestre (c)','DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)')
     GROUP BY cod_conta, coluna`,
    [municipioId, ano],
  );

  if (rows.length === 0) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Nenhum dado do RREO Anexo 01 (6° bimestre) encontrado — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  const receitas       = rows.find(r => r.cod_conta === "TotalReceitas"           && r.coluna === "Até o Bimestre (c)");
  const despesasSup    = rows.find(r => r.cod_conta === "TotalDespesasComSuperavit" && r.coluna === "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)");
  const superavit      = rows.find(r => r.cod_conta === "Superavit"               && r.coluna === "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)");
  const deficit        = rows.find(r => r.cod_conta === "Deficit"                 && r.coluna === "Até o Bimestre (c)");

  if (!receitas || !despesasSup) {
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: "Dados de TotalReceitas ou TotalDespesasComSuperavit não encontrados no Anexo 01 do 6° bimestre — valores tratados como zero, regra consistente.",
      detalhes: [],
    };
  }

  const totalReceitas       = receitas.valor ?? 0;
  const totalDespesasSup    = despesasSup.valor ?? 0;
  const superavitInformado  = superavit?.valor ?? 0;
  const deficitInformado    = deficit?.valor ?? 0;

  // Identidade: TotalReceitas + Deficit = TotalDespesasComSuperavit
  const receitasComDeficit = totalReceitas + deficitInformado;
  const diferenca = receitasComDeficit - totalDespesasSup;

  const detalhes = [
    { item: "Total de Receitas", coluna: "Até o Bimestre (c)", valor: totalReceitas },
    ...(deficitInformado > 0 ? [{ item: "(+) Déficit Informado", coluna: "Até o Bimestre (c)", valor: deficitInformado }] : []),
    { item: "Total Receitas c/ Déficit", coluna: "—", valor: receitasComDeficit },
    { item: "Total Despesas c/ Superávit", coluna: "Despesas Empenhadas Até o Bimestre (f)", valor: totalDespesasSup },
    ...(superavitInformado > 0 ? [{ item: "(incl.) Superávit Informado", coluna: "Despesas Empenhadas Até o Bimestre (f)", valor: superavitInformado }] : []),
    { item: "Diferença (deve ser zero)", coluna: "—", valor: diferenca },
  ];

  const TOLERANCIA = 1.0; // R$ 1,00 — tolerância para arredondamentos de centavos
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (Math.abs(diferenca) <= TOLERANCIA) {
    const tipo = superavitInformado > 0 ? `superávit de ${fmt(superavitInformado)}`
               : deficitInformado > 0   ? `déficit de ${fmt(deficitInformado)}`
               : "resultado equilibrado";
    return {
      status: "consistente", nota: 1, nota_max: 1,
      resumo: `Balanço Orçamentário equilibrado (${tipo}). Identidade TotalReceitas + Déficit = TotalDespesas + Superávit verificada.`,
      detalhes,
      observacoes_rodape: "Contas analisadas (RREO-Anexo 01 | Período 6 | Rótulo Padrão): TotalReceitas | Até o Bimestre (c) · TotalDespesasComSuperavit | DESPESAS EMPENHADAS ATÉ O BIMESTRE (f) · Superavit | DESPESAS EMPENHADAS ATÉ O BIMESTRE (f) · Deficit | Até o Bimestre (c).",
    };
  }

  return {
    status: "inconsistente", nota: 0, nota_max: 1,
    resumo: `Balanço Orçamentário desequilibrado em ${fmt(Math.abs(diferenca))}. TotalReceitas + Déficit (${fmt(receitasComDeficit)}) ≠ TotalDespesas + Superávit (${fmt(totalDespesasSup)}).`,
    detalhes,
    observacoes_rodape: "Contas analisadas (RREO-Anexo 01 | Período 6 | Rótulo Padrão): TotalReceitas | Até o Bimestre (c) · TotalDespesasComSuperavit | DESPESAS EMPENHADAS ATÉ O BIMESTRE (f) · Superavit | DESPESAS EMPENHADAS ATÉ O BIMESTRE (f) · Deficit | Até o Bimestre (c).",
  };
}

export const meta: VerificacaoMeta = {
  codigo: "D3_00001",
  tipo: "RREO",
  descricao: "Avalia a correta informação do déficit ou superávit orçamentário no Anexo 01 do RREO",
  nota_max: 1,
};
