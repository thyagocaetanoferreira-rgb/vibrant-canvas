import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

import authRouter from "./routes/auth";
import usuariosRouter from "./routes/usuarios";
import clientesRouter from "./routes/clientes";
import municipiosRouter from "./routes/municipios";
import lancamentosRouter from "./routes/lancamentos";
import tcmgoRouter from "./routes/tcmgo";
import uploadRouter from "./routes/upload";
import siconfiRouter, { importarCauc } from "./routes/siconfi";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" }));

// Serve uploaded files
const UPLOAD_DIR = process.env.UPLOAD_DIR || "/uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/usuarios", usuariosRouter);
app.use("/api/clientes", clientesRouter);
app.use("/api/municipios", municipiosRouter);
app.use("/api/lancamentos", lancamentosRouter);
app.use("/api/tcmgo", tcmgoRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/siconfi", siconfiRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  scheduleCaucDaily();
});

// Agenda importação do CAUC todos os dias às 06:00
function scheduleCaucDaily() {
  function scheduleNext() {
    const now = new Date();
    const next = new Date();
    next.setHours(6, 0, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    const ms = next.getTime() - now.getTime();
    const horas = Math.round(ms / 3600000 * 10) / 10;
    console.log(`[SICONFI] Próxima importação CAUC em ${horas}h (${next.toLocaleString("pt-BR")})`);
    setTimeout(async () => {
      console.log("[SICONFI] Iniciando importação automática do CAUC...");
      try {
        const { total } = await importarCauc();
        console.log(`[SICONFI] Importação automática concluída: ${total} municípios`);
      } catch (err: any) {
        console.error(`[SICONFI] Falha na importação automática: ${err.message}`);
      }
      scheduleNext();
    }, ms);
  }
  scheduleNext();
}
