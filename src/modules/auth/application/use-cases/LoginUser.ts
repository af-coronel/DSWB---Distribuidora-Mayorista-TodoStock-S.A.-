import jwt from "jsonwebtoken";
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';

export interface LoginResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  token: string;
}

export class LoginUser {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(email: string, password: string): Promise<LoginResponse> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error("Credenciales inválidas");
    }

    if (user.passwordHash !== password) {
      throw new Error("Credenciales inválidas");
    }

    if (!user.active) {
      throw new Error("El usuario se encuentra desactivado");
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET no configurado");
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn: "1h" },
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }
}