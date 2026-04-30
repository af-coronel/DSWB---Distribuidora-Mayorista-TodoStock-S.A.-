import type { Request, Response, NextFunction } from "express";
import { JsonUserRepository } from "../../persistence/JsonUserRepository.js";
import type { IUser } from "../../../domain/interfaces/IUser.js";

// Truco avanzado de TypeScript: Extendemos la interfaz Request de Express
// para decirle que ahora TODAS las peticiones pueden traer un objeto "user".
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Intentamos sacar el token del Header (Postman/Apps)
    let token = req.headers.authorization?.split(" ")[1];

    // 2. Si no hay Header, intentamos sacarlo de la Cookie (Navegador/Pug)
    if (!token && req.cookies) {
      token = req.cookies.token;
    }

    if (!token) {
      if (req.headers.accept?.includes("text/html")) {
        return res.redirect("/api/auth/login"); // Al login si es humano
      }
      return res.status(401).json({ error: true, message: "Acceso denegado" }); // JSON si es máquina
    }

    // Como nuestro token simulado termina con el ID del usuario, lo extraemos:
    const userId = token?.split("-for-")[1];

    if (!userId) {
      return res.status(401).json({ error: true, message: "Token inválido." });
    }

    // 3. Verificamos que el usuario realmente exista en la base de datos JSON
    const userRepository = new JsonUserRepository();
    const user = await userRepository.findById(userId);

    if (!user || !user.active) {
      return res
        .status(401)
        .json({ error: true, message: "Usuario incorrecto" });
    }

    // 4. Inyectamos el usuario real en la petición para que el Controlador lo use.
    req.user = user;

    // 5. next() abre paso al siguiente middleware.
    next();
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Error en el servidor" });
  }
};
