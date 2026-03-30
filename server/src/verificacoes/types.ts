/**
 * Simulador Verus — contratos centrais
 *
 * Este arquivo define as interfaces que governam TODO o sistema de verificação.
 * Nenhuma regra, rota ou componente deve inventar formato próprio.
 * Qualquer mudança aqui impacta tela, dashboard e PDF — altere com cuidado.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipos primitivos compartilhados
// ─────────────────────────────────────────────────────────────────────────────

export type TipoAnalise = "RREO" | "RGF" | "MSC";

export type StatusRegra = "consistente" | "inconsistente" | "nao_aplicavel";

export type StatusExecucao = "executando" | "concluida" | "falhou";

export type StatusGeral = "ok" | "atencao" | "critico";

// ─────────────────────────────────────────────────────────────────────────────
// Resultado de uma regra individual
// ─────────────────────────────────────────────────────────────────────────────

/**
 * O que cada função verificarXXXXX deve retornar.
 * Todos os campos opcionais devem ser preenchidos quando aplicável —
 * não deixar undefined se há informação útil.
 */
export interface ResultadoRegra {
  /** Código da regra. Ex: "D3_00001" */
  codigo: string;

  /** Resultado da verificação. */
  status: StatusRegra;

  /** Pontos obtidos nesta regra. */
  nota: number;

  /** Pontos máximos possíveis nesta regra. */
  nota_max: number;

  /**
   * Frase curta exibida na lista de verificações.
   * Ex: "Todos os 6 bimestres consistentes."
   * Ex: "3 bimestres com divergência (1º, 3º, 5º)."
   */
  resumo: string;

  /**
   * Preenchido quando status = "inconsistente".
   * Descreve o que foi encontrado de errado, em linguagem que o contador entende.
   * Ex: "O total de despesas do Anexo 01 difere do Anexo 02 no 3º bimestre."
   */
  motivo_falha?: string;

  /**
   * Preenchido quando status = "inconsistente".
   * Orientação prática de como corrigir no sistema de origem.
   * Ex: "Verifique o lançamento XXXXXXX no módulo de despesas e retifique o RREO."
   */
  sugestao_correcao?: string;

  /**
   * Array de objetos com o detalhe linha a linha.
   * Cada regra define a tipagem específica do seu array —
   * o contrato aqui é só que é um array de objetos.
   * Estes detalhes são persistidos como JSONB no banco.
   */
  detalhes: object[];

  /**
   * Texto técnico exibido no rodapé da tabela de detalhes.
   * Lista as cod_contas e colunas analisadas para auxiliar na localização do erro.
   * Gerado pela própria regra no backend — não hard-coded no frontend.
   * Ex: "An01 — ReservaDeContingencia | DOTAÇÃO ATUALIZADA (e) · An06 — ..."
   */
  observacoes_rodape?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Definição de uma regra (metadados + função de execução)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interface que cada arquivo de regra deve implementar e exportar.
 * Separa metadados (o que a regra é) da execução (o que ela faz).
 */
export interface Verificacao {
  /** Código único. Ex: "D3_00001" */
  codigo: string;

  /** Tipo de demonstrativo ao qual pertence. */
  tipo: TipoAnalise;

  /**
   * Descrição curta da regra para exibição em tela e PDF.
   * Ex: "Superávit/Déficit — consistência receitas vs despesas (An01)"
   */
  descricao: string;

  /**
   * Pontuação máxima que esta regra pode atribuir.
   * Geralmente 1, mas pode ser maior para regras compostas.
   */
  nota_max: number;

  /**
   * Função que executa a verificação e retorna o resultado.
   * Deve ser assíncrona e nunca lançar exceção — em caso de erro interno,
   * retornar status "nao_aplicavel" com resumo explicativo.
   */
  executar(
    municipioId: number,
    codIbge: string,
    ano: number
  ): Promise<ResultadoRegra>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Execução da análise (uma "rodada" completa)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Representa uma rodada completa de verificações para um município/exercício/tipo.
 * Persistida na tabela simulador_execucoes.
 * É a entidade principal de histórico, auditoria e dashboard.
 */
export interface ExecucaoSimulador {
  id: number;
  municipio_id: number;
  exercicio: number;
  tipo: TipoAnalise;
  status: StatusExecucao;

  /** Soma das notas de todas as regras desta execução. */
  nota_total: number;

  /** Soma das notas_max de todas as regras desta execução. */
  nota_maxima: number;

  /** Percentual: nota_total / nota_maxima * 100. Calculado ao persistir. */
  percentual: number;

  total_consistente: number;
  total_inconsistente: number;
  total_nao_aplicavel: number;

  executado_em: string;     // ISO 8601
  executado_por: number;    // usuario_id

  /**
   * Resultados individuais de cada regra.
   * Presente na resposta da API de execução e consulta detalhada.
   * Não retornado nas queries de dashboard (usa apenas a tabela de execuções).
   */
  resultados: ResultadoRegra[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Consolidado por município (para dashboard e ranking)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Visão agregada de um município — alimenta dashboard e ranking.
 * Construída a partir da tabela simulador_execucoes (sem joins pesados em resultados).
 */
export interface ConsolidadoMunicipio {
  municipio_id: number;
  municipio_nome: string;
  exercicio: number;
  ultima_execucao_em: string;

  /** Um item por tipo de análise que já foi executado. */
  por_tipo: ConsolidadoPorTipo[];
}

export interface ConsolidadoPorTipo {
  tipo: TipoAnalise;
  nota_total: number;
  nota_maxima: number;
  percentual: number;

  /**
   * Status calculado pelo percentual:
   * >= 80% → "ok"
   * >= 50% → "atencao"
   * <  50% → "critico"
   * Limites podem ser ajustados quando o produto amadurecer.
   */
  status_geral: StatusGeral;

  total_consistente: number;
  total_inconsistente: number;
  ultima_execucao_em: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload para geração de PDF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estrutura enviada ao template de impressão.
 * Derivada de uma ExecucaoSimulador + dados do município.
 * Separada em dois grupos para o layout do PDF:
 * consistentes resumidos / inconsistentes com detalhe completo.
 */
export interface PayloadPdf {
  municipio_nome: string;
  municipio_ibge: string;
  exercicio: number;
  tipo: TipoAnalise;
  executado_em: string;
  executado_por_nome: string;

  nota_total: number;
  nota_maxima: number;
  percentual: number;

  /** Regras OK — exibidas de forma compacta no PDF. */
  consistentes: Array<Pick<ResultadoRegra, "codigo" | "resumo"> & { descricao: string }>;

  /**
   * Regras com problema — exibidas com detalhe completo.
   * Inclui motivo_falha, sugestao_correcao e detalhes para o contador corrigir.
   */
  inconsistentes: Array<ResultadoRegra & { descricao: string }>;
}
