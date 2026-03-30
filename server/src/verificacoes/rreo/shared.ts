// Labels dos bimestres/semestres
export const BIMESTRE_LABELS: Record<number, string> = {
  1: "1° Bimestre (Jan-Fev)",
  2: "2° Bimestre (Mar-Abr)",
  3: "3° Bimestre (Mai-Jun)",
  4: "4° Bimestre (Jul-Ago)",
  5: "5° Bimestre (Set-Out)",
  6: "6° Bimestre (Nov-Dez)",
};
export const SEMESTRE_LABELS: Record<number, string> = {
  1: "1° Semestre (Jan-Jun)",
  2: "2° Semestre (Jul-Dez)",
};

export interface ResultadoVerificacao {
  no_verificacao: string;
  no_desc: string;
  no_finalidade: string;
  co_dimensao: string;
  capag: boolean;
  status: "consistente" | "inconsistente" | "aviso" | "nao_aplicavel";
  resumo: string;
  detalhes: object[];
  nota: number;        // 0.0 a 1.0 — pontuação parcial da verificação
  nota_max: number;    // sempre 1.0 (reservado para futuras ponderações)
  temRetificacao?: boolean; // D1_00006: indica se há retificações (RE) nos RREOs
  observacoes_rodape?: string;  // texto técnico gerado pela regra (contas, colunas analisadas)
  motivo_falha?: string;        // preenchido quando status = "inconsistente"
  sugestao_correcao?: string;   // orientação de correção quando inconsistente
}

export interface VerificacaoMeta {
  codigo: string;        // "D3_00001"
  tipo: "RREO" | "RGF" | "MSC";
  descricao: string;     // texto curto descritivo da regra
  nota_max: number;      // sempre 1 para as regras atuais
}

// ── Helper: calcula prazo do RREO dado período e tipo ─────────────────────────
export function calcPrazoRREO(periodo: number, semestral: boolean, ano: number): Date {
  if (semestral) {
    return periodo <= 1 ? new Date(ano, 6, 30) : new Date(ano + 1, 0, 30);
  }
  const mesSubsequente = periodo * 2; // meses JS são 0-indexed, mas p*2 já é o índice correto
  return mesSubsequente <= 12
    ? new Date(ano, mesSubsequente, 30)   // ex: p=1 → new Date(ano, 2, 30) = 30/Mar
    : new Date(ano + 1, 0, 30);           // bim 6 → 30/Jan ano+1
}

// Normaliza data_status para somente data (zera horário), evitando falso-intempestivo
export function soData(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Mapa de verificações implementadas por código
export type VerificadorFn = (municipioId: number, codIbge: string, ano: number) => Promise<Partial<ResultadoVerificacao>>;

// ── D3_00012: Valores negativos inválidos no RREO ────────────────────────────
// Regra geral: todo valor do RREO deve ser >= 0.
// Exceções permitidas: saldo, resultado, meta fiscal, variação de saldo, projeção atuarial.
export function ehExcecaoNegativoRREO(coluna: string, cod_conta: string): boolean {
  const col = coluna.toUpperCase();

  // 1. Saldo
  if (col.includes("SALDO")) return true;

  // 2. Resultado (coluna)
  if (col.includes("RESULTADO")) return true;

  // 3. Meta fiscal (coluna)
  if (col.includes("META FIXADA") || col.includes("META DE RESULTADO")) return true;

  // 4. Variação de saldo (coluna)
  if (col.includes("VARIA") && col.includes("SALDO")) return true;

  // 5. Projeção atuarial / exercícios futuros
  if (col === "EXERCÍCIO" || col === "EXERCICIO" ||
      col.includes("º EXERCÍCIO") || col.includes("º EXERCICIO") ||
      col.includes("° EXERCÍCIO") || col.includes("° EXERCICIO")) return true;

  // 6. Referências mensais (<MR-N>) — saldos pontuais do mês
  if (col.startsWith("<MR")) return true;

  // 7. Percentuais — podem ser negativos por definição
  if (col.includes("% (")) return true;

  // 8. Movimentos bimestrais — deduções parciais do bimestre
  if (col.includes("NO BIMESTRE")) return true;

  // 9. Acumulados dos últimos 12 meses
  if (col.includes("ULTIMOS 12 MESES") || col.includes("ÚLTIMOS 12 MESES")) return true;

  // 10. Previsões orçamentárias
  if (col.includes("PREVISÃO") || col.includes("PREVISAO")) return true;

  // 11. Valor incorrido — variações monetárias
  if (col.includes("VALOR INCORRIDO")) return true;

  // 12. Liquidações bimestrais parciais
  if (col.includes("LIQUIDADAS NO BIMESTRE")) return true;

  // 13. By cod_conta: Resultado*, Variacao*, Meta*
  if (cod_conta.includes("Resultado")) return true;
  if (cod_conta.includes("Variacao") || cod_conta.includes("Variação")) return true;
  if (cod_conta.includes("Meta")) return true;

  // 14. Deduções — valores de abatimento (negativos por natureza)
  if (cod_conta.includes("Deducao") || cod_conta.includes("Deducoes")) return true;

  // 15. RPPS / Previdência — natureza contábil distinta
  if (cod_conta.includes("RPPS") || cod_conta.includes("Previdencia")) return true;

  // 16. Saldos financeiros
  if (cod_conta.includes("Saldo")) return true;

  // 17. Valores líquidos (após deduções)
  if (cod_conta.includes("Liquida")) return true;

  return false;
}
