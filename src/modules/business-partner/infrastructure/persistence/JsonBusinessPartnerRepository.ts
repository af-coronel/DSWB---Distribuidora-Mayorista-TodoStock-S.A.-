import fs from 'node:fs/promises';
import path from 'node:path';
import type { IBusinessPartner, IBusinessPartnerRepository } from '../../domain/index.js';

export class JsonBusinessPartnerRepository implements IBusinessPartnerRepository {
  private readonly filePath: string;

  constructor() {
    // process.cwd() obtiene la ruta raíz del proyecto dinámicamente
    this.filePath = path.join(process.cwd(), 'data', 'partners.json');
  }

  // Método auxiliar privado para leer el archivo de forma asíncrona
  private async readData(): Promise<IBusinessPartner[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      // Si el archivo no existe, devolvemos un array vacío en lugar de romper la app
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  // Método auxiliar privado para escribir en el archivo de forma asíncrona
  private async writeData(data: IBusinessPartner[]): Promise<void> {
    // JSON.stringify con null, 2 para que el archivo sea legible por humanos
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async save(partner: IBusinessPartner): Promise<void> {
    const partners = await this.readData();
    const index = partners.findIndex((p) => p.cuit === partner.cuit);
    
    // 1. Extraemos el elemento a una variable
    const existing = partners[index];

    // 2. Comprobamos no solo que el índice exista, sino que 'existing' no sea undefined
    if (index !== -1 && existing) {
      const merged: IBusinessPartner = {
        ...existing,
        ...partner,
        type: [...new Set([...existing.type, ...partner.type])],
        customer_data: partner.customer_data || existing.customer_data || null,
        vendor_data: partner.vendor_data || existing.vendor_data || null,
        updated_at: new Date(),
      };
      partners[index] = merged;
    } else {
      partners.push(partner);
    }

    await this.writeData(partners);
  }

  async findByCuit(cuit: string): Promise<IBusinessPartner | null> {
    const partners = await this.readData();
    return partners.find((p) => p.cuit === cuit) || null;
  }

  async findAll(type?: "CLIENT" | "VENDOR"): Promise<IBusinessPartner[]> {
    const partners = await this.readData();
    if (!type) return partners;
    return partners.filter((p) => p.type.includes(type));
  }

  async deleteSoft(cuit: string): Promise<void> {
    const partners = await this.readData();
    const index = partners.findIndex((p) => p.cuit === cuit);
    
    // 3. Misma comprobación de seguridad aquí para evitar el error de [Ln 71]
    const existing = partners[index];
    if (index !== -1 && existing) {
      existing.active = false;
      await this.writeData(partners);
    }
  }
}