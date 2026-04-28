import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { IUser } from '../../domain/interfaces/IUser.ts';

// Definimos qué datos vamos a devolver si el login es exitoso
export interface LoginResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  token: string; // Simulado para este Sprint
}

export class LoginUser {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(email: string, passwordHash: string): Promise<LoginResponse> {
    // 1. Buscamos al usuario por email
    const user = await this.userRepository.findByEmail(email);

    // 2. Validación de existencia
    if (!user) {
      throw new Error("Credenciales inválidas"); // No decimos si fue el email o la clave por seguridad
    }

    // 3. Validación de contraseña (actualmente en texto plano por el admin semilla)
    if (user.passwordHash !== passwordHash) {
      throw new Error("Credenciales inválidas");
    }

    // 4. Validación de estado
    if (!user.active) {
      throw new Error("El usuario se encuentra desactivado");
    }

    // 5. Retornamos un DTO (Data Transfer Object) con el token simulado
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token: `todostock-fake-jwt-token-for-${user.id}`
    };
  }
}