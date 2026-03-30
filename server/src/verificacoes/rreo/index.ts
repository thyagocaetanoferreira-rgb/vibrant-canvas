export { ResultadoVerificacao, VerificadorFn, BIMESTRE_LABELS, SEMESTRE_LABELS } from "./shared";
export type { VerificacaoMeta } from "./shared";

export { verificarD1_00001 } from "./D1_00001";
export { verificarD1_00006 } from "./D1_00006";
export { verificarD1_00011 } from "./D1_00011";
export { verificarD3_00001 } from "./D3_00001";
export { verificarD3_00002 } from "./D3_00002";
export { verificarD3_00003 } from "./D3_00003";
export { verificarD3_00007 } from "./D3_00007";
export { verificarD3_00012 } from "./D3_00012";
export { verificarD3_00017 } from "./D3_00017";
export { verificarD3_00027 } from "./D3_00027";
export { verificarD3_00028 } from "./D3_00028";
export { verificarD3_00030 } from "./D3_00030";
export { verificarD3_00032 } from "./D3_00032";
export { verificarD3_00033 } from "./D3_00033";
export { verificarD3_00034 } from "./D3_00034";
export { verificarD3_00035 } from "./D3_00035";
export { verificarD3_00037 } from "./D3_00037";
export { verificarD3_00038 } from "./D3_00038";
export { verificarD3_00039 } from "./D3_00039";
export { verificarD3_00040 } from "./D3_00040";
export { verificarD3_00045 } from "./D3_00045";

import { VerificadorFn, VerificacaoMeta } from "./shared";
import { verificarD1_00001, meta as metaD1_00001 } from "./D1_00001";
import { verificarD1_00006, meta as metaD1_00006 } from "./D1_00006";
import { verificarD1_00011, meta as metaD1_00011 } from "./D1_00011";
import { verificarD3_00001, meta as metaD3_00001 } from "./D3_00001";
import { verificarD3_00002, meta as metaD3_00002 } from "./D3_00002";
import { verificarD3_00003, meta as metaD3_00003 } from "./D3_00003";
import { verificarD3_00007, meta as metaD3_00007 } from "./D3_00007";
import { verificarD3_00012, meta as metaD3_00012 } from "./D3_00012";
import { verificarD3_00017, meta as metaD3_00017 } from "./D3_00017";
import { verificarD3_00027, meta as metaD3_00027 } from "./D3_00027";
import { verificarD3_00028, meta as metaD3_00028 } from "./D3_00028";
import { verificarD3_00030, meta as metaD3_00030 } from "./D3_00030";
import { verificarD3_00032, meta as metaD3_00032 } from "./D3_00032";
import { verificarD3_00033, meta as metaD3_00033 } from "./D3_00033";
import { verificarD3_00034, meta as metaD3_00034 } from "./D3_00034";
import { verificarD3_00035, meta as metaD3_00035 } from "./D3_00035";
import { verificarD3_00037, meta as metaD3_00037 } from "./D3_00037";
import { verificarD3_00038, meta as metaD3_00038 } from "./D3_00038";
import { verificarD3_00039, meta as metaD3_00039 } from "./D3_00039";
import { verificarD3_00040, meta as metaD3_00040 } from "./D3_00040";
import { verificarD3_00045, meta as metaD3_00045 } from "./D3_00045";

export const verificadoresRREO: Record<string, VerificadorFn> = {
  "D1_00001": verificarD1_00001,
  "D1_00006": verificarD1_00006,
  "D1_00011": verificarD1_00011,
  "D3_00001": verificarD3_00001,
  "D3_00002": verificarD3_00002,
  "D3_00003": verificarD3_00003,
  "D3_00007": verificarD3_00007,
  "D3_00012": verificarD3_00012,
  "D3_00017": verificarD3_00017,
  "D3_00027": verificarD3_00027,
  "D3_00028": verificarD3_00028,
  "D3_00030": verificarD3_00030,
  "D3_00032": verificarD3_00032,
  "D3_00033": verificarD3_00033,
  "D3_00034": verificarD3_00034,
  "D3_00035": verificarD3_00035,
  "D3_00037": verificarD3_00037,
  "D3_00038": verificarD3_00038,
  "D3_00039": verificarD3_00039,
  "D3_00040": verificarD3_00040,
  "D3_00045": verificarD3_00045,
};

export const regrasList: VerificacaoMeta[] = [
  metaD1_00001,
  metaD1_00006,
  metaD1_00011,
  metaD3_00001,
  metaD3_00002,
  metaD3_00003,
  metaD3_00007,
  metaD3_00012,
  metaD3_00017,
  metaD3_00027,
  metaD3_00028,
  metaD3_00030,
  metaD3_00032,
  metaD3_00033,
  metaD3_00034,
  metaD3_00035,
  metaD3_00037,
  metaD3_00038,
  metaD3_00039,
  metaD3_00040,
  metaD3_00045,
];
