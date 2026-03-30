import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { db } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

// ── Template de e-mail branded ────────────────────────────────────────────────
function buildResetEmail(resetLink: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#033e66,#008ded);padding:28px 32px;text-align:center">
            <p style="margin:0;color:rgba(255,255,255,.7);font-size:11px;letter-spacing:2px;text-transform:uppercase">VH Contabilidade Pública</p>
            <p style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.5px">Verus</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px">
            <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#033e66">Redefinição de senha</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">
              Recebemos uma solicitação para redefinir a senha da sua conta no Verus.
              Clique no botão abaixo para criar uma nova senha.
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:4px 0 28px">
                <a href="${resetLink}"
                   style="display:inline-block;background:#033e66;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:.3px">
                  Redefinir minha senha
                </a>
              </td></tr>
            </table>

            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f0f4f8;border-radius:8px;padding:16px 20px">
                  <p style="margin:0 0 6px;font-size:12px;color:#6b7280">
                    ⏱ Este link é válido por <strong style="color:#033e66">2 horas</strong>.
                  </p>
                  <p style="margin:0 0 6px;font-size:12px;color:#6b7280">
                    🔒 Se você não solicitou a redefinição, ignore este e-mail. Sua senha permanece a mesma.
                  </p>
                  <p style="margin:0;font-size:12px;color:#6b7280">
                    🔗 Se o botão não funcionar, copie e cole este link no navegador:<br>
                    <span style="color:#008ded;word-break:break-all;font-size:11px">${resetLink}</span>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center">
            <p style="margin:0;font-size:11px;color:#9ca3af">
              Verus · VH Contabilidade Pública &nbsp;·&nbsp; Este é um e-mail automático, não responda.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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
      `SELECT c.id AS "clienteId", c.municipio_id AS "municipioId", m.nome AS "municipioNome",
              c.municipio_tcmgo_id AS "municipioTcmgoId"
       FROM clientes c
       JOIN municipios m ON m.id = c.municipio_id
       WHERE c.status = true
       ORDER BY m.nome`
    );
    rows = r;
  } else {
    const { rows: r } = await db.query(
      `SELECT c.id AS "clienteId", c.municipio_id AS "municipioId", m.nome AS "municipioNome",
              c.municipio_tcmgo_id AS "municipioTcmgoId"
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
  if (!valid) {
    logger.warn("auth", "login_failed", "Senha inválida", {
      identifier,
      ip: req.ip,
    });
    return res.status(401).json({ message: "E-mail ou senha incorretos" });
  }

  const municipios = await loadMunicipios(user.id, user.perfil);
  const token = signToken(user);

  // Audit: login bem-sucedido (usuario_id explícito pois req.usuario ainda não existe)
  try {
    await db.query(
      `INSERT INTO audit_log (usuario_id, acao, modulo, ip, user_agent, request_id)
       VALUES ($1, 'login', 'auth', $2::inet, $3, $4)`,
      [
        user.id,
        req.ip ?? null,
        req.headers["user-agent"] ?? null,
        req.headers["x-request-id"] ?? null,
      ]
    );
  } catch { /* audit nunca derruba o login */ }

  logger.info("auth", "login", "Login bem-sucedido", { user_id: user.id, perfil: user.perfil });

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
  // Sempre retorna 200 — evita enumeração de e-mails
  if (!rows[0]) {
    logger.info("auth", "reset_email_not_found", "Recuperação solicitada para e-mail não cadastrado", { email });
    return res.json({ message: "Se o e-mail existir, você receberá as instruções" });
  }

  const token = uuidv4();
  const expiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h

  await db.query(
    "UPDATE usuarios SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3",
    [token, expiry, rows[0].id]
  );

  const siteUrl   = process.env.SITE_URL || "http://localhost";
  const resetLink = `${siteUrl}/reset-password?token=${token}`;

  if (process.env.SMTP_HOST) {
    try {
      const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      await transporter.sendMail({
        from:    `"Verus — VH Contabilidade Pública" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to:      email,
        subject: "Redefinição de senha — Verus",
        html:    buildResetEmail(resetLink),
      });

      logger.info("auth", "reset_email_sent", "E-mail de recuperação enviado", { email });
    } catch (mailErr: any) {
      logger.error("auth", "reset_email_failed", "Falha ao enviar e-mail de recuperação", {
        error: mailErr?.message,
        email,
      });
      // Não expõe o erro ao usuário — resposta neutra mesmo assim
    }
  } else {
    // Sem SMTP configurado: exibe o link no log estruturado (dev/homologação)
    logger.info("auth", "reset_link_dev", "Link de recuperação gerado (sem SMTP)", {
      email,
      link: resetLink,
      expira_em: expiry.toISOString(),
    });
  }

  // Audit: solicitação registrada
  try {
    await db.query(
      `INSERT INTO audit_log (usuario_id, acao, modulo, ip, user_agent, request_id)
       VALUES ($1, 'reset_password_requested', 'auth', $2::inet, $3, $4)`,
      [rows[0].id, req.ip ?? null, req.headers["user-agent"] ?? null, req.headers["x-request-id"] ?? null]
    );
  } catch { /* audit nunca derruba o fluxo */ }

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

  logger.info("auth", "reset_password_done", "Senha redefinida com sucesso", { user_id: rows[0].id });

  try {
    await db.query(
      `INSERT INTO audit_log (usuario_id, acao, modulo, ip, user_agent, request_id)
       VALUES ($1, 'reset_password_done', 'auth', $2::inet, $3, $4)`,
      [rows[0].id, req.ip ?? null, req.headers["user-agent"] ?? null, req.headers["x-request-id"] ?? null]
    );
  } catch { /* audit nunca derruba o fluxo */ }

  return res.json({ message: "Senha redefinida com sucesso" });
});

export default router;
