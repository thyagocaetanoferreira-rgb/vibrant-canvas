import { Router, Response } from "express";
import { db } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// GET /api/municipios?search=X  ou  ?ids=1,2,3
router.get("/", async (req: AuthRequest, res: Response) => {
  const { search, ids } = req.query;

  if (ids) {
    const idList = String(ids).split(",").map(Number).filter(Boolean);
    if (idList.length === 0) return res.json([]);
    const { rows } = await db.query(
      `SELECT id, nome, codigo_uf, codigo_ibge FROM municipios WHERE id = ANY($1) ORDER BY nome`,
      [idList]
    );
    return res.json(rows);
  }

  if (search) {
    const { rows } = await db.query(
      `SELECT id, nome, codigo_uf, codigo_ibge FROM municipios WHERE nome ILIKE $1 ORDER BY nome LIMIT 20`,
      [`%${search}%`]
    );
    return res.json(rows);
  }

  const { rows } = await db.query("SELECT id, nome FROM municipios ORDER BY nome");
  return res.json(rows);
});

// GET /api/municipios/modulos
router.get("/modulos", async (_req: AuthRequest, res: Response) => {
  const { rows } = await db.query("SELECT id, nome FROM modulos ORDER BY ordem");
  return res.json(rows);
});

// GET /api/municipios/permissoes-perfil/:perfil
router.get("/permissoes-perfil/:perfil", async (req: AuthRequest, res: Response) => {
  const { rows } = await db.query(
    "SELECT * FROM permissoes_perfil WHERE perfil = $1",
    [req.params.perfil]
  );
  return res.json(rows);
});

export default router;
