import type { Request, Response, NextFunction } from "express";

function sanitizeError(err: any): { statusCode: number; message: string } {
  const statusCode = err.statusCode ?? 500;

  if (err.name === "CastError") {
    return { statusCode: 400, message: "El ID proporcionado no es válido." };
  }

  if (err.name === "ValidationError" && err.errors) {
    const messages: string[] = Object.values(err.errors).map(
      (e: any) => e.message as string,
    );
    return { statusCode: 400, message: messages.join(", ") };
  }

  if (err.code === 11000) {
    return { statusCode: 409, message: "Ya existe un registro con esos datos." };
  }

  return { statusCode, message: err.message ?? "Error interno del servidor" };
}

const isHtmlRequest = (req: Request) =>
  req.headers.accept?.includes("text/html") ?? false;

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { statusCode, message } = sanitizeError(err);

  console.error(`[ERROR] ${req.method} ${req.path} →`, err);

  if (isHtmlRequest(req)) {
    if (statusCode === 404) {
      return res.status(404).render("errors/404");
    }
    return res.status(500).render("errors/500", { errorMessage: message });
  }

  return res.status(statusCode).json({ error: true, message });
}
