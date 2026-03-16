import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  usuario?: { id: string; email: string; perfil: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.usuario = { id: payload.sub, email: payload.email, perfil: payload.perfil };
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
}
