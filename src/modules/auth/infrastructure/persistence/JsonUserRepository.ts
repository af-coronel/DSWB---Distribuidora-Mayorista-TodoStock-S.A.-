import fs from 'node:fs/promises';
import path from 'node:path';
import type { IUser } from '../../domain/interfaces/IUser.js';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';

// Módulo 6: Diccionario para búsquedas ultrarrápidas por ID
type UserDictionary = Record<string, IUser>;

export class JsonUserRepository implements IUserRepository {
  private readonly filePath: string;

  constructor() {
    this.filePath = path.resolve(process.cwd(), 'data', 'users.json');
  }

  private async readData(): Promise<UserDictionary> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  private async writeData(data: UserDictionary): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async findById(id: string): Promise<IUser | null> {
    const users = await this.readData();
    return users[id] || null; // Búsqueda directa O(1)
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const users = await this.readData();
    // Como el email no es la clave principal, extraemos los valores y buscamos (O(N))
    const user = Object.values(users).find((u) => u.email === email);
    return user || null;
  }

  async save(user: IUser): Promise<void> {
    const users = await this.readData();
    users[user.id] = user; // Guarda o actualiza usando el ID como llave
    await this.writeData(users);
  }
}