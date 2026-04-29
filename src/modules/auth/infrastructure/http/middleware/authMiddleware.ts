import type { Request, Response, NextFunction } from 'express';
import { JsonUserRepository } from '../../persistence/JsonUserRepository.js';
import type { IUser } from '../../../domain/interfaces/IUser.js';

// Truco avanzado de TypeScript: Extendemos la interfaz Request de Express 
// para decirle que ahora TODAS las peticiones pueden traer un objeto "user".
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Buscamos el header "Authorization"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, message: 'Acceso denegado' });
    }

    // 2. Extraemos el token (formato: "Bearer todostock-fake-jwt-token-for-admin_1")
    const token = authHeader.split(' ')[1];
    
    // Como nuestro token simulado termina con el ID del usuario, lo extraemos:
    const userId = token?.split('-for-')[1];

    if (!userId) {
      return res.status(401).json({ error: true, message: 'Token inválido.' });
    }

    // 3. Verificamos que el usuario realmente exista en la base de datos JSON
    const userRepository = new JsonUserRepository();
    const user = await userRepository.findById(userId);

    if (!user || !user.active) {
      return res.status(401).json({ error: true, message: 'Usuario incorrecto' });
    }

    // 4. Inyectamos el usuario real en la petición para que el Controlador lo use.
    req.user = user;

    // 5. next() abre paso al siguiente middleware.
    next();
  } catch (error) {
    return res.status(500).json({ error: true, message: 'Error en el servidor' });
  }
};