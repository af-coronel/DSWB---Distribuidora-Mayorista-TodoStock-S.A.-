import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? "Error interno del servidor";

  console.error(`[ERROR] ${req.method} ${req.path} →`, err);

  res.status(statusCode).json({
    error: true,
    message,
  });
}
