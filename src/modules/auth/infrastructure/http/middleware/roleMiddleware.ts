import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../../../domain/interfaces/IUser.js';

// Le pasamos un array de roles y nos devuelve el middleware configurado.
export const authorizeRoles = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    // Si por alguna razón llega aquí sin pasar por 'authenticate', lo bloqueamos.
    if (!user) {
      return res.status(401).json({ error: true, message: 'Usuario no autenticado.' });
    }

    // Verificamos si el rol del usuario está dentro de la lista de permitidos
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        error: true, 
        message: `Acceso denegado. Se requiere ser: ${allowedRoles.join(', ')}` 
      });
    }

    // Si tiene permiso, lo dejamos pasar.
    next();
  };
};