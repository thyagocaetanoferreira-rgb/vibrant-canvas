/**
 * audit — registra ações de negócio na tabela audit_log.
 *
 * Nunca lança exceção — uma falha no audit não deve derrubar a request principal.
 *
 * Uso nas rotas:
 *   await audit(req, {
 *     acao:         "executar_validacao",
 *     modulo:       "simulador",
 *     municipio_id: 5,
 *     exercicio:    2024,
 *     detalhes:     { tipo_analise: "RREO Conformidade", total: 42 },
 *   });
 */

import { db } from "../db";
import { logger } from "../lib/logger";
import { AuthRequest } from "./auth";

export interface AuditParams {
  acao:          string;
  modulo:        string;
  /** Sobrescreve req.usuario?.id — útil no login, antes do JWT ser definido no req */
  user_id?:      string | number | null;
  municipio_id?: number | null;
  exercicio?:    number | null;
  entidade?:     string | null;
  entidade_id?:  string | null;
  detalhes?:     Record<string, unknown> | null;
}

export async function audit(req: AuthRequest, params: AuditParams): Promise<void> {
  try {
    const userId    = params.user_id !== undefined ? params.user_id : (req.usuario?.id ?? null);
    const ip        = req.ip ?? (req.socket?.remoteAddress ?? null);
    const userAgent = (req.headers["user-agent"] as string) ?? null;
    const requestId = (req.headers["x-request-id"] as string) ?? null;

    await db.query(
      `INSERT INTO audit_log
         (usuario_id, acao, modulo, municipio_id, exercicio, entidade, entidade_id, detalhes, ip, user_agent, request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::inet, $10, $11)`,
      [
        userId,
        params.acao,
        params.modulo,
        params.municipio_id  ?? null,
        params.exercicio     ?? null,
        params.entidade      ?? null,
        params.entidade_id   ?? null,
        params.detalhes ? JSON.stringify(params.detalhes) : null,
        ip,
        userAgent,
        requestId,
      ]
    );
  } catch (err: any) {
    // Log técnico do erro — não propaga para não quebrar a request
    logger.warn("audit", "insert_failed", "Falha ao gravar audit_log", {
      error:  err?.message,
      acao:   params.acao,
      modulo: params.modulo,
    });
  }
}
