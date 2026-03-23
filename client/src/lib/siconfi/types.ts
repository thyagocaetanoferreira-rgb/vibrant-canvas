export type MscType = "agregada" | "encerramento";
export type ValidationStatus = "pass" | "warning" | "fail";
export type OverallStatus = "regular" | "warning" | "irregular";

export interface MSCRecord {
  [key: string]: any;
}

export interface ValidationResult {
  id: string;
  description: string;
  status: ValidationStatus;
  message?: string;
  details?: any;
}

export interface ValidationReport {
  overallStatus: OverallStatus;
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
  };
  validations: ValidationResult[];
  mscType: MscType;
}

export interface SaveValidacaoPayload {
  municipio_id: number;
  tipo_msc: MscType;
  arquivo_nome: string;
  ano_exercicio: number;
  total: number;
  ok: number;
  avisos: number;
  erros: number;
  status_geral: OverallStatus;
  resultado_json: ValidationResult[];
}

export interface ValidacaoHistorico {
  id: number;
  tipo_msc: MscType;
  arquivo_nome: string | null;
  ano_exercicio: number | null;
  total: number;
  ok: number;
  avisos: number;
  erros: number;
  status_geral: OverallStatus;
  criado_em: string;
  usuario_nome?: string;
}
