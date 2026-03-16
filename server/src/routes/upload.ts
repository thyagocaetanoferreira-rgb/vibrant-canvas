import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/png", "image/jpeg"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("Formato inválido. Use PNG ou JPG."));
  },
});

router.post("/foto", upload.single("foto"), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ message: "Arquivo não enviado" });
  const url = `/uploads/${req.file.filename}`;
  return res.json({ url });
});

export default router;
