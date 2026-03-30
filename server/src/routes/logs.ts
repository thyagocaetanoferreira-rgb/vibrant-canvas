/**
 * POST /api/logs/frontend
 *
 * Recebe eventos de warn/error do verusLog.ts do frontend
 * e os registra no log técnico do backend (stdout/Docker).
 *
 * - Aceita array de até 20 eventos por request (batch)
 * - Nunca armazena dados sensíveis: token, senha, CPF
 * - Requer autenticação (Bearer token)
 */

import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();
router.use(requireAuth);

const SENSITIVE_KEYS = /token|senha|password|cpf|cnpj|secret/i;

function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    clean[k] = SENSITIVE_KEYS.test(k) ? "[omitido]" : sanitize(v);
  }
  return clean;
}

router.post("/frontend", async (req: AuthRequest, res: Response) => {
  const body   = req.body;
  const events = (Array.isArray(body) ? body : [body]).slice(0, 20);

  for (const ev of events) {
    if (!ev?.level || !ev?.mensagem) continue;

    const level = ["info", "warn", "error"].includes(ev.level) ? ev.level as "info" | "warn" | "error" : "info";
    const module = `frontend:${(ev.modulo as string) ?? "app"}`;

    logger[level](module, "frontend_event", ev.mensagem as string, {
      user_id:   req.usuario?.id,
      ts_client: ev.ts,
      dados:     sanitize(ev.dados),
      stack:     ev.stack ?? undefined,
    });
  }

  return res.status(204).end();
});

export default router;
