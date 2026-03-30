// ── Tipos de análise ───────────────────────────────────────────────────────────

export const TIPOS_ANALISE = [
  { value: "RREO",                    label: "RREO — Conformidade",       fase: 1  },
  { value: "RGF",                     label: "RGF — Conformidade",        fase: 2  },
  { value: "RREO x RGF",             label: "RREO × RGF",                fase: 3  },
  { value: "DCA",                     label: "DCA",                       fase: 4  },
  { value: "DCA x MSC de dezembro",  label: "DCA × MSC Dezembro",        fase: 5  },
  { value: "DCA x RGF",              label: "DCA × RGF",                 fase: 6  },
  { value: "DCA x RREO",             label: "DCA × RREO",                fase: 7  },
  { value: "MSC",                     label: "MSC",                       fase: 8  },
  { value: "MSC x RGF",              label: "MSC × RGF",                 fase: 9  },
  { value: "MSC x RREO",             label: "MSC × RREO",                fase: 10 },
  { value: "MSC de Dezembro",        label: "MSC de Dezembro",           fase: 11 },
  { value: "MSC de Dezembro x RREO", label: "MSC Dezembro × RREO",      fase: 12 },
  { value: "MSC x DCA",              label: "MSC × DCA",                 fase: 13 },
  { value: "RGF x MSC Dezembro",     label: "RGF × MSC Dezembro",       fase: 14 },
  { value: "RGF x RREO",            label: "RGF × RREO",                fase: 15 },
] as const;

export const TIPOS_IMPLEMENTADOS = new Set(["RREO"]);

// ── Status visual ──────────────────────────────────────────────────────────────

export type StatusVerificacao = "consistente" | "inconsistente" | "aviso" | "nao_aplicavel";

export const STATUS_META: Record<StatusVerificacao, {
  label: string; textColor: string; bgColor: string; borderColor: string;
}> = {
  consistente:   { label: "Consistente",   textColor: "#059669", bgColor: "#00e1a420", borderColor: "#00e1a460" },
  inconsistente: { label: "Inconsistente", textColor: "#ef4444", bgColor: "#ef444420", borderColor: "#ef444460" },
  aviso:         { label: "Aviso",         textColor: "#b45309", bgColor: "#ffb85a20", borderColor: "#ffb85a60" },
  nao_aplicavel: { label: "N/A",           textColor: "#6b7280", bgColor: "#6b728012", borderColor: "#6b728030" },
};

export const STATUS_GERAL_META: Record<string, { label: string; textColor: string; bgColor: string }> = {
  regular:   { label: "Regular",   textColor: "#059669", bgColor: "#00e1a420" },
  alerta:    { label: "Com Avisos", textColor: "#b45309", bgColor: "#ffb85a20" },
  irregular: { label: "Irregular", textColor: "#ef4444", bgColor: "#ef444420" },
};
