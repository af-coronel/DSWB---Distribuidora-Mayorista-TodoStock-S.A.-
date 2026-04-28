import type { IUser } from '../../domain/IUser.js';

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;
  findById(id: string): Promise<IUser | null>;
  save(user: IUser): Promise<void>;
}