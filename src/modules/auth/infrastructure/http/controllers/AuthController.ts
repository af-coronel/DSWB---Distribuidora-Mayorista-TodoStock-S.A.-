import type { Request, Response } from 'express';
import type { LoginUser } from '../../../application/use-cases/LoginUser.js';

export class AuthController {
  constructor(private readonly loginUserUseCase: LoginUser) {}

  async login(req: Request, res: Response) {
    try {
      const { email, passwordHash } = req.body;

      // Pequeña validación de entrada
      if (!email || !passwordHash) {
        return res.status(400).json({
          error: true,
          message: "Debe ingresar un email y contraseña válidos"
        });
      }

      // Llamamos a nuestra lógica de negocio (Caso de Uso)
      const response = await this.loginUserUseCase.execute(email, passwordHash);

      return res.status(200).json(response);

    } catch (error: any) {
      // Si el caso de uso lanza un error (por ejemplo: "Credenciales inválidas"), devolvemos un 401 (Unauthorized)
      return res.status(401).json({
        error: true,
        message: error.message
      });
    }
  }
}