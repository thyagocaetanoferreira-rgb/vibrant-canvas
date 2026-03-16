import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// GET /api/usuarios
router.get("/", async (req: AuthRequest, res: Response) => {
  const { rows } = await db.query(
    `SELECT u.*, m.nome AS municipio_nome
     FROM usuarios u
     LEFT JOIN municipios m ON m.id = u.municipio_id
     ORDER BY u.nome`
  );
  return res.json(rows);
});

// GET /api/usuarios/:id
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const { rows } = await db.query("SELECT * FROM usuarios WHERE id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Usuário não encontrado" });
  return res.json(rows[0]);
});

// POST /api/usuarios
router.post("/", async (req: AuthRequest, res: Response) => {
  const { nome, username, email, senha, telefone, perfil, municipio_id, ativo, foto_url } = req.body;

  if (!senha) return res.status(400).json({ message: "Senha obrigatória" });
  const senha_hash = await bcrypt.hash(senha, 12);

  try {
    const { rows } = await db.query(
      `INSERT INTO usuarios (nome, username, email, telefone, perfil, municipio_id, ativo, foto_url, senha_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [nome, username, email, telefone || null, perfil, municipio_id, ativo ?? true, foto_url || null, senha_hash]
    );
    return res.status(201).json(rows[0]);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
});

// PUT /api/usuarios/:id
router.put("/:id", async (req: AuthRequest, res: Response) => {
  const { nome, username, email, senha, telefone, perfil, municipio_id, ativo, foto_url } = req.body;
  const { id } = req.params;

  try {
    if (senha) {
      const senha_hash = await bcrypt.hash(senha, 12);
      await db.query(
        `UPDATE usuarios SET nome=$1, username=$2, email=$3, telefone=$4, perfil=$5,
         municipio_id=$6, ativo=$7, foto_url=$8, senha_hash=$9, atualizado_em=NOW()
         WHERE id=$10`,
        [nome, username, email, telefone || null, perfil, municipio_id, ativo, foto_url || null, senha_hash, id]
      );
    } else {
      await db.query(
        `UPDATE usuarios SET nome=$1, username=$2, email=$3, telefone=$4, perfil=$5,
         municipio_id=$6, ativo=$7, foto_url=$8, atualizado_em=NOW()
         WHERE id=$9`,
        [nome, username, email, telefone || null, perfil, municipio_id, ativo, foto_url || null, id]
      );
    }

    const { rows } = await db.query("SELECT * FROM usuarios WHERE id = $1", [id]);
    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
});

// PATCH /api/usuarios/:id/ativo
router.patch("/:id/ativo", async (req: AuthRequest, res: Response) => {
  const { ativo } = req.body;
  await db.query("UPDATE usuarios SET ativo=$1, atualizado_em=NOW() WHERE id=$2", [ativo, req.params.id]);
  return res.json({ success: true });
});

// GET /api/usuarios/:id/municipios
router.get("/:id/municipios", async (req: AuthRequest, res: Response) => {
  const { rows } = await db.query(
    "SELECT municipio_id FROM usuario_municipios WHERE usuario_id = $1",
    [req.params.id]
  );
  return res.json(rows.map((r: any) => r.municipio_id));
});

// PUT /api/usuarios/:id/municipios
router.put("/:id/municipios", async (req: AuthRequest, res: Response) => {
  const { municipio_ids } = req.body;
  const { id } = req.params;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM usuario_municipios WHERE usuario_id = $1", [id]);
    if (municipio_ids?.length > 0) {
      for (const mid of municipio_ids) {
        await client.query(
          "INSERT INTO usuario_municipios (usuario_id, municipio_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [id, mid]
        );
      }
    }
    await client.query("COMMIT");
    return res.json({ success: true });
  } catch (err: any) {
    await client.query("ROLLBACK");
    return res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

// GET /api/usuarios/:id/permissoes
router.get("/:id/permissoes", async (req: AuthRequest, res: Response) => {
  const { rows } = await db.query(
    "SELECT * FROM permissoes_usuario WHERE usuario_id = $1",
    [req.params.id]
  );
  return res.json(rows);
});

// PUT /api/usuarios/:id/permissoes
router.put("/:id/permissoes", async (req: AuthRequest, res: Response) => {
  const { permissoes } = req.body;
  const { id } = req.params;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM permissoes_usuario WHERE usuario_id = $1", [id]);
    for (const p of permissoes) {
      await client.query(
        `INSERT INTO permissoes_usuario (usuario_id, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, p.modulo_id, p.pode_ver, p.pode_criar, p.pode_editar, p.pode_excluir]
      );
    }
    await client.query("COMMIT");
    return res.json({ success: true });
  } catch (err: any) {
    await client.query("ROLLBACK");
    return res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

// POST /api/usuarios/:id/restaurar-permissoes
router.post("/:id/restaurar-permissoes", async (req: AuthRequest, res: Response) => {
  const { perfil } = req.body;
  const { id } = req.params;

  try {
    await db.query("SELECT copiar_permissoes_perfil($1, $2)", [id, perfil]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
