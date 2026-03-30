import express from "express";
import cors from "cors";
import fs from "fs";

import { logger } from "./lib/logger";
import { requestLogger } from "./middleware/requestLogger";

import authRouter from "./routes/auth";
import usuariosRouter from "./routes/usuarios";
import clientesRouter from "./routes/clientes";
import municipiosRouter from "./routes/municipios";
import lancamentosRouter from "./routes/lancamentos";
import tcmgoRouter from "./routes/tcmgo";
import uploadRouter from "./routes/upload";
import siconfiRouter, { importarCauc } from "./routes/siconfi";
import importacaoRouter from "./routes/importacao";
import pbiRouter from "./routes/pbi";
import paineisRouter from "./routes/paineis";
import logsRouter from "./routes/logs";

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" }));

// ── Logging de requests (antes das rotas) ─────────────────────────────────────
app.use(requestLogger);

// Serve uploaded files
const UPLOAD_DIR = process.env.UPLOAD_DIR || "/uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

// ── Rotas ─────────────────────────────────────────────────────────────────────
app.use("/api/auth",             authRouter);
app.use("/api/usuarios",         usuariosRouter);
app.use("/api/clientes",         clientesRouter);
app.use("/api/municipios",       municipiosRouter);
app.use("/api/lancamentos",      lancamentosRouter);
app.use("/api/tcmgo",            tcmgoRouter);
app.use("/api/tcmgo/importacao", importacaoRouter);
app.use("/api/tcmgo/pbi",        pbiRouter);
app.use("/api/upload",           uploadRouter);
app.use("/api/siconfi",          siconfiRouter);
app.use("/api/paineis",          paineisRouter);
app.use("/api/logs",             logsRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ── Servidor ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info("server", "startup", `Verus API iniciada na porta ${PORT}`, {
    port: PORT,
    env: process.env.NODE_ENV ?? "production",
  });
  scheduleCaucDaily();
});

// ── Job: importação automática do CAUC às 06:00 ───────────────────────────────
function scheduleCaucDaily() {
  function scheduleNext() {
    const now  = new Date();
    const next = new Date();
    next.setHours(6, 0, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    const ms    = next.getTime() - now.getTime();
    const horas = Math.round((ms / 3_600_000) * 10) / 10;

    logger.info("siconfi", "cauc_scheduled", `Próxima importação CAUC em ${horas}h`, {
      proxima: next.toISOString(),
    });

    setTimeout(async () => {
      logger.info("siconfi", "cauc_start", "Iniciando importação automática do CAUC");
      try {
        const { total } = await importarCauc();
        logger.info("siconfi", "cauc_done", `Importação automática concluída: ${total} municípios`, { total });
      } catch (err: any) {
        logger.error("siconfi", "cauc_failed", "Falha na importação automática do CAUC", {
          error: err?.message,
        });
      }
      scheduleNext();
    }, ms);
  }
  scheduleNext();
}
