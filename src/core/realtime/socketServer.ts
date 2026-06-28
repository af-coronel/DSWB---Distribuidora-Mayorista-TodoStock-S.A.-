import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { MongoUserRepository } from "../../modules/auth/infrastructure/persistence/MongoUserRepository.js";

interface JwtPayload {
  id: string;
  role: string;
}

export interface DomainNotification {
  kind: string;
  title: string;
  message: string;
  link?: string | undefined;
  entityId?: string | undefined;
  entityType?: string | undefined;
  createdAt: string;
}

let io: Server | null = null;

const parseCookieHeader = (cookieHeader?: string) => {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  cookieHeader.split(";").forEach((entry) => {
    const [rawKey, ...rawValue] = entry.trim().split("=");
    if (!rawKey) {
      return;
    }
    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
  });

  return cookies;
};

export const initializeSocketServer = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token;
      const bearerToken =
        typeof authHeader === "string"
          ? authHeader.replace(/^Bearer\s+/i, "")
          : undefined;
      const cookies = parseCookieHeader(socket.handshake.headers.cookie);
      const token = bearerToken || cookies.token;

      if (!token) {
        return next(new Error("Acceso denegado"));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error("JWT_SECRET no configurado"));
      }

      const decoded = jwt.verify(token, secret) as JwtPayload;
      const userRepository = new MongoUserRepository();
      const user = await userRepository.findById(decoded.id);

      if (!user || !user.active) {
        return next(new Error("Usuario inválido"));
      }

      socket.data.user = {
        id: user.id,
        role: user.role,
      };

      socket.join(`role:${user.role}`);
      socket.join(`user:${user.id}`);

      return next();
    } catch {
      return next(new Error("Token inválido o expirado"));
    }
  });

  io.on("connection", (socket) => {
    const role = socket.data.user?.role;
    const userId = socket.data.user?.id;

    if (role && userId) {
      socket.emit("realtime:ready", {
        role,
        userId,
        connectedAt: new Date().toISOString(),
      });
    }
  });

  return io;
};

export const emitRoleNotification = (
  role: string,
  notification: DomainNotification,
) => {
  if (!io) {
    return;
  }

  io.to(`role:${role}`).emit("domain:notification", notification);
};
