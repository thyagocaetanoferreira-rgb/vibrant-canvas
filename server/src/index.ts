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

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
