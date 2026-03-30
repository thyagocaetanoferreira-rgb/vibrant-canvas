/**
 * Simulador Verus — tipos do frontend
 *
 * Espelham os contratos do backend (server/src/verificacoes/types.ts).
 * Não duplicam lógica — só tipar o que a API devolve.
 * Qualquer campo novo no backend deve ser adicionado aqui também.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipos primitivos
// ─────────────────────────────────────────────────────────────────────────────

export type TipoAnalise = "RREO" | "RGF" | "MSC";

export type StatusRegra = "consistente" | "inconsistente" | "nao_aplicavel";

export type StatusExecucao = "executando" | "concluida" | "falhou";

export type StatusGeral = "ok" | "atencao" | "critico";

// ─────────────────────────────────────────────────────────────────────────────
// Resultado de uma regra individual
// ─────────────────────────────────────────────────────────────────────────────

export interface ResultadoRegra {
  codigo: string;
  status: StatusRegra;
  nota: number;
  nota_max: number;
  resumo: string;
  motivo_falha?: string;
  sugestao_correcao?: string;
  detalhes: object[];
  observacoes_rodape?: string;

  /**
   * Descrição legível da regra.
   * Preenchida pelo backend ao montar a resposta da execução.
   */
  descricao?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Execução completa
// ─────────────────────────────────────────────────────────────────────────────

export interface ExecucaoSimulador {
  id: number;
  municipio_id: number;
  exercicio: number;
  tipo: TipoAnalise;
  status: StatusExecucao;
  nota_total: number;
  nota_maxima: number;
  percentual: number;
  total_consistente: number;
  total_inconsistente: number;
  total_nao_aplicavel: number;
  executado_em: string;
  executado_por: number;
  resultados: ResultadoRegra[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Consolidado para dashboard
// ─────────────────────────────────────────────────────────────────────────────

export interface ConsolidadoPorTipo {
  tipo: TipoAnalise;
  nota_total: number;
  nota_maxima: number;
  percentual: number;
  status_geral: StatusGeral;
  total_consistente: number;
  total_inconsistente: number;
  ultima_execucao_em: string;
}

export interface ConsolidadoMunicipio {
  municipio_id: number;
  municipio_nome: string;
  exercicio: number;
  ultima_execucao_em: string;
  por_tipo: ConsolidadoPorTipo[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de UI (não vêm da API — calculados no frontend)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cores e rótulos por status de regra.
 * Centralizados aqui para consistência entre lista, PDF e dashboard.
 */
export const STATUS_REGRA_CONFIG: Record<
  StatusRegra,
  { label: string; cor: string; corFundo: string }
> = {
  consistente:   { label: "Consistente",   cor: "#059669", corFundo: "#d1fae5" },
  inconsistente: { label: "Inconsistente", cor: "#ef4444", corFundo: "#fee2e2" },
  nao_aplicavel: { label: "N/A",           cor: "#6b7280", corFundo: "#f3f4f6" },
};

/**
 * Cores e rótulos por status geral (dashboard).
 * Limiar: >= 80% ok, >= 50% atenção, < 50% crítico.
 */
export const STATUS_GERAL_CONFIG: Record<
  StatusGeral,
  { label: string; cor: string; corFundo: string }
> = {
  ok:      { label: "OK",      cor: "#059669", corFundo: "#d1fae5" },
  atencao: { label: "Atenção", cor: "#d97706", corFundo: "#fef3c7" },
  critico: { label: "Crítico", cor: "#ef4444", corFundo: "#fee2e2" },
};

/** Calcula o StatusGeral a partir do percentual. */
export function calcularStatusGeral(percentual: number): StatusGeral {
  if (percentual >= 80) return "ok";
  if (percentual >= 50) return "atencao";
  return "critico";
}
