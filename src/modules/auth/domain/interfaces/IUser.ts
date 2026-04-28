// Definimos los roles permitidos según el requerimiento del caso
export type UserRole = 'ADMIN' | 'SELLER' | 'WAREHOUSE';

export interface IUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // La contraseña nunca se guarda en texto plano
  role: UserRole;       // Atribución del rol para autorización
  active: boolean;
  created_at: Date;
  updated_at: Date;
}