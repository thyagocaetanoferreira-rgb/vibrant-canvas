/**
 * logger — logger estruturado do Verus Backend
 *
 * Gera JSON em stdout/stderr → Docker captura automaticamente.
 * Zero dependências externas.
 *
 * Uso:
 *   import { logger } from "@/lib/logger";
 *   logger.info("siconfi", "executar_validacao", "Validação concluída", { municipio_id: 5, duracao_ms: 342 });
 *   logger.error("auth", "login", "Senha inválida", { user_id: null, ip: "10.0.0.1" });
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: "verus-api";
  module: string;
  action: string;
  message: string;
  [key: string]: unknown;
}

const ENV = process.env.NODE_ENV ?? "production";
const IS_DEV = ENV === "development";

function emit(level: LogLevel, module: string, action: string, message: string, extra?: Record<string, unknown>): void {
  // Em dev, ignora debug para não poluir
  if (level === "debug" && !IS_DEV) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: "verus-api",
    module,
    action,
    message,
    ...extra,
  };

  const line = JSON.stringify(entry);

  if (level === "error" || level === "fatal") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  debug: (module: string, action: string, message: string, extra?: Record<string, unknown>) =>
    emit("debug", module, action, message, extra),

  info: (module: string, action: string, message: string, extra?: Record<string, unknown>) =>
    emit("info", module, action, message, extra),

  warn: (module: string, action: string, message: string, extra?: Record<string, unknown>) =>
    emit("warn", module, action, message, extra),

  error: (module: string, action: string, message: string, extra?: Record<string, unknown>) =>
    emit("error", module, action, message, extra),

  fatal: (module: string, action: string, message: string, extra?: Record<string, unknown>) =>
    emit("fatal", module, action, message, extra),
};
