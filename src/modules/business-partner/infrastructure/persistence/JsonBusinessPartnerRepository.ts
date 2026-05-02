import fs from "node:fs/promises";
import path from "node:path";
import type {
  IBusinessPartner,
  IBusinessPartnerRepository,
} from "../../domain/index.js";

// Módulo 6: Definimos un Diccionario (Objeto) donde la clave es el CUIT y el valor es el Partner
type PartnerDictionary = Record<string, IBusinessPartner>;

export class JsonBusinessPartnerRepository implements IBusinessPartnerRepository {
  private readonly filePath: string;

  constructor() {
    this.filePath = path.resolve(process.cwd(), "data", "partners.json");
  }

  private async readData(): Promise<PartnerDictionary> {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return {}; // Ahora devolvemos un Objeto vacío en lugar de un Array
      }
      throw error;
    }
  }

  private async writeData(data: PartnerDictionary): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  async save(partner: IBusinessPartner): Promise<void> {
    const partners = await this.readData();

    // Búsqueda directa O(1), ¡exactamente igual que tu "this.partners.get(partner.cuit)"!
    const existing = partners[partner.cuit];

    if (existing) {
      const merged: IBusinessPartner = {
        ...existing,
        ...partner,
        type: [...new Set([...existing.type, ...partner.type])],
        customer_data: partner.customer_data || existing.customer_data || null,
        vendor_data: partner.vendor_data || existing.vendor_data || null,
        updated_at: new Date(),
      };
      partners[partner.cuit] = merged;
    } else {
      partners[partner.cuit] = partner;
    }

    await this.writeData(partners);
  }

  async findByCuit(cuit: string): Promise<IBusinessPartner | null> {
    const partners = await this.readData();
    // Retornamos directamente accediendo por la clave
    return partners[cuit] || null;
  }

  async findAll(type?: "CLIENT" | "VENDOR"): Promise<IBusinessPartner[]> {
    const partners = await this.readData();
    // Object.values() extrae todos los valores del objeto y los convierte en un Array
    const all = Object.values(partners);
    if (!type) return all;
    return all.filter((p) => p.type.includes(type));
  }

  async deleteSoft(cuit: string): Promise<void> {
    const partners = await this.readData();
    const existing = partners[cuit];

    if (existing) {
      // Modificamos solo el active y guardamos
      partners[cuit] = { ...existing, active: false };
      await this.writeData(partners);
    }
  }

  async activate(cuit: string): Promise<void> {
    const partners = await this.readData();
    const existing = partners[cuit];

    if (existing) {
      partners[cuit] = { ...existing, active: true };
      await this.writeData(partners);
    }
  }
}
