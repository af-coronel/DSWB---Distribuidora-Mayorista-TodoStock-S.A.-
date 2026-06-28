import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { MongoUserRepository } from "../../persistence/MongoUserRepository.js";
import type { IUser } from "../../../domain/interfaces/IUser.js";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface JwtPayload {
  id: string;
  role: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token = req.headers.authorization?.split(" ")[1];

    if (!token && req.cookies) {
      token = req.cookies.token;
    }

    if (!token) {
      if (req.headers.accept?.includes("text/html")) {
        return res.redirect("/?sessionExpired=true");
      }
      return res.status(401).json({ error: true, message: "Acceso denegado" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: true, message: "JWT_SECRET no configurado" });
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, secret) as JwtPayload;
    } catch {
      if (req.headers.accept?.includes("text/html")) {
        return res.redirect("/?sessionExpired=true");
      }
      return res.status(401).json({ error: true, message: "Token inválido o expirado" });
    }

    const userRepository = new MongoUserRepository();
    const user = await userRepository.findById(decoded.id);

    if (!user || !user.active) {
      if (req.headers.accept?.includes("text/html")) {
        return res.redirect("/?sessionExpired=true");
      }
      return res.status(401).json({ error: true, message: "Usuario incorrecto" });
    }

    req.user = user;
    res.locals.currentUser = user;

    next();
  } catch (error) {
    if (req.headers.accept?.includes("text/html")) {
      return res.redirect("/?sessionExpired=true");
    }
    return res.status(500).json({ error: true, message: "Error en el servidor" });
  }
};
