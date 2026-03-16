import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { db } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

function signToken(usuario: { id: string; email: string; perfil: string }) {
  return jwt.sign(
    { sub: usuario.id, email: usuario.email, perfil: usuario.perfil },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
}

async function loadMunicipios(usuarioId: string, perfil: string) {
  let rows: any[];

  if (perfil === "Administrador") {
    const { rows: r } = await db.query(
      `SELECT c.id AS "clienteId", c.municipio_id AS "municipioId", m.nome AS "municipioNome"
       FROM clientes c
       JOIN municipios m ON m.id = c.municipio_id
       WHERE c.status = true
       ORDER BY m.nome`
    );
    rows = r;
  } else {
    const { rows: r } = await db.query(
      `SELECT c.id AS "clienteId", c.municipio_id AS "municipioId", m.nome AS "municipioNome"
       FROM usuario_municipios um
       JOIN clientes c ON c.municipio_id = um.municipio_id AND c.status = true
       JOIN municipios m ON m.id = c.municipio_id
       WHERE um.usuario_id = $1
       ORDER BY m.nome`,
      [usuarioId]
    );
    rows = r;
  }

  return rows;
}

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { identifier, senha, password } = req.body;
  const pass = senha || password;
  if (!identifier || !pass) {
    return res.status(400).json({ message: "Campos obrigatórios ausentes" });
  }

  const isEmail = identifier.includes("@");
  const whereClause = isEmail ? "email = $1" : "username = $1";

  const { rows } = await db.query(
    `SELECT id, nome, email, username, perfil, foto_url, ativo, senha_hash
     FROM usuarios WHERE ${whereClause}`,
    [identifier]
  );

  const user = rows[0];
  if (!user) return res.status(401).json({ message: "E-mail ou senha incorretos" });
  if (!user.ativo) return res.status(403).json({ message: "Usuário inativo" });
  if (!user.senha_hash) return res.status(401).json({ message: "Usuário sem senha configurada" });

  const valid = await bcrypt.compare(pass, user.senha_hash);
  if (!valid) return res.status(401).json({ message: "E-mail ou senha incorretos" });

  const municipios = await loadMunicipios(user.id, user.perfil);
  const token = signToken(user);

  return res.json({
    token,
    usuario: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      username: user.username,
      perfil: user.perfil,
      foto_url: user.foto_url,
    },
    municipios,
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const { rows } = await db.query(
    `SELECT id, nome, email, username, perfil, foto_url, ativo FROM usuarios WHERE id = $1`,
    [req.usuario!.id]
  );
  const user = rows[0];
  if (!user || !user.ativo) return res.status(401).json({ message: "Usuário não encontrado" });

  const municipios = await loadMunicipios(user.id, user.perfil);

  return res.json({
    usuario: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      username: user.username,
      perfil: user.perfil,
      foto_url: user.foto_url,
    },
    municipios,
  });
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "E-mail obrigatório" });

  const { rows } = await db.query("SELECT id FROM usuarios WHERE email = $1", [email]);
  // Always return 200 to avoid user enumeration
  if (!rows[0]) return res.json({ message: "Se o e-mail existir, você receberá as instruções" });

  const token = uuidv4();
  const expiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h

  await db.query(
    "UPDATE usuarios SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3",
    [token, expiry, rows[0].id]
  );

  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  const resetLink = `${siteUrl}/reset-password?token=${token}`;

  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_SENDER_NAME || "IntraService",
      to: email,
      subject: "Redefinição de senha — IntraService",
      html: `<p>Clique no link para redefinir sua senha (válido por 2h):</p><a href="${resetLink}">${resetLink}</a>`,
    });
  } else {
    console.log(`[RESET LINK] ${resetLink}`);
  }

  return res.json({ message: "Se o e-mail existir, você receberá as instruções" });
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: "Dados incompletos" });
  if (password.length < 6) return res.status(400).json({ message: "Senha muito curta" });

  const { rows } = await db.query(
    "SELECT id FROM usuarios WHERE reset_token = $1 AND reset_token_expiry > NOW()",
    [token]
  );
  if (!rows[0]) return res.status(400).json({ message: "Token inválido ou expirado" });

  const hash = await bcrypt.hash(password, 12);
  await db.query(
    "UPDATE usuarios SET senha_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2",
    [hash, rows[0].id]
  );

  return res.json({ message: "Senha redefinida com sucesso" });
});

export default router;
