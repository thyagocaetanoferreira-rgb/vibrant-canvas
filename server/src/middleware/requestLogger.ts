/**
 * requestLogger — middleware Express que loga todo request automaticamente.
 *
 * Gera um request_id único por request, adiciona no header de resposta
 * (x-request-id) e correlaciona com o log do audit_log.
 */

import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger";
import { AuthRequest } from "./auth";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start      = Date.now();
  const requestId  = uuidv4();

  // Propaga o request_id para que rotas possam acessar via req.headers
  req.headers["x-request-id"] = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    // Não loga health check para não poluir
    if (req.path === "/api/health") return;

    const durationMs = Date.now() - start;
    const userId     = (req as AuthRequest).usuario?.id ?? null;
    const status     = res.statusCode;
    const level      = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    logger[level]("http", "request", `${req.method} ${req.path}`, {
      method:      req.method,
      path:        req.path,
      status,
      duration_ms: durationMs,
      user_id:     userId,
      request_id:  requestId,
      ip:          req.ip ?? req.socket?.remoteAddress,
    });
  });

  next();
}
