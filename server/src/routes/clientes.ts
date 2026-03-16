import { Router, Response } from "express";
import { db } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

function xorCipher(text: string, key: string): string {
  const result: number[] = [];
  for (let i = 0; i < text.length; i++) {
    result.push(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(result).toString("base64");
}

function xorDecipher(encoded: string, key: string): string {
  const buf = Buffer.from(encoded, "base64");
  const result: number[] = [];
  for (let i = 0; i < buf.length; i++) {
    result.push(buf[i] ^ key.charCodeAt(i % key.length));
  }
  return String.fromCharCode(...result);
}

// GET /api/clientes
router.get("/", async (_req: AuthRequest, res: Response) => {
  const { rows } = await db.query(
    `SELECT c.*, m.nome AS municipio_nome, m.codigo_uf AS municipio_uf
     FROM clientes c
     LEFT JOIN municipios m ON m.id = c.municipio_id
     ORDER BY c.criado_em DESC`
  );
  return res.json(rows);
});

// GET /api/clientes/:id
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const { rows } = await db.query(
    `SELECT c.*, m.nome AS municipio_nome, m.codigo_uf, m.codigo_ibge
     FROM clientes c LEFT JOIN municipios m ON m.id = c.municipio_id
     WHERE c.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: "Cliente não encontrado" });
  return res.json(rows[0]);
});

// POST /api/clientes
router.post("/", async (req: AuthRequest, res: Response) => {
  const { municipio_id, tipos_servico, status, link_sistema, login_sistema, municipio_tcmgo_id } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO clientes (municipio_id, tipos_servico, status, link_sistema, login_sistema, municipio_tcmgo_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [municipio_id, tipos_servico, status ?? true, link_sistema || null, login_sistema || null, municipio_tcmgo_id || null]
    );
    return res.status(201).json(rows[0]);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
});

// PUT /api/clientes/:id
router.put("/:id", async (req: AuthRequest, res: Response) => {
  const { tipos_servico, status, link_sistema, login_sistema, municipio_tcmgo_id } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE clientes SET tipos_servico=$1, status=$2, link_sistema=$3, login_sistema=$4,
       municipio_tcmgo_id=$5, atualizado_em=NOW() WHERE id=$6 RETURNING *`,
      [tipos_servico, status, link_sistema || null, login_sistema || null, municipio_tcmgo_id || null, req.params.id]
    );
    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
});

// PATCH /api/clientes/:id/status
router.patch("/:id/status", async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  await db.query("UPDATE clientes SET status=$1, atualizado_em=NOW() WHERE id=$2", [status, req.params.id]);
  return res.json({ success: true });
});

// GET /api/clientes/:id/count-usuarios
router.get("/:id/count-usuarios", async (req: AuthRequest, res: Response) => {
  const { rows: clienteRows } = await db.query("SELECT municipio_id FROM clientes WHERE id = $1", [req.params.id]);
  if (!clienteRows[0]) return res.json({ count: 0 });
  const { rows } = await db.query(
    "SELECT COUNT(*) AS count FROM usuarios WHERE municipio_id = $1",
    [clienteRows[0].municipio_id]
  );
  return res.json({ count: Number(rows[0].count) });
});

// POST /api/clientes/:id/senha  (encrypt and store ERP password)
router.post("/:id/senha", async (req: AuthRequest, res: Response) => {
  const { action, senha } = req.body;
  const encKey = process.env.ENCRYPTION_KEY;
  if (!encKey) return res.status(500).json({ message: "ENCRYPTION_KEY não configurada" });

  if (action === "encrypt") {
    const encrypted = xorCipher(senha, encKey);
    await db.query("UPDATE clientes SET senha_sistema=$1 WHERE id=$2", [encrypted, req.params.id]);
    return res.json({ success: true });
  }

  if (action === "decrypt") {
    const { rows } = await db.query("SELECT senha_sistema FROM clientes WHERE id=$1", [req.params.id]);
    const enc = rows[0]?.senha_sistema;
    if (!enc) return res.json({ senha: null });
    const decrypted = xorDecipher(enc, encKey);

    await db.query(
      `INSERT INTO audit_log (usuario_id, cliente_id, acao, detalhes)
       VALUES ($1, $2, 'senha_revelada', $3)`,
      [req.usuario!.id, req.params.id, JSON.stringify({ timestamp: new Date().toISOString() })]
    );

    return res.json({ senha: decrypted });
  }

  return res.status(400).json({ message: "Ação inválida" });
});

export default router;
