// infrastructure/persistence/MemoryBusinessPartnerRepository.ts

import type { IBusinessPartner } from "../../domain/interfaces/IBusinessPartner.js";
import type { IBusinessPartnerRepository } from "../../domain/repositories/IBusinessPartnerRepository.js";

export class MemoryBusinessPartnerRepository implements IBusinessPartnerRepository {
  // Usamos un Map con el CUIT como clave para mayor velocidad
  private partners = new Map<string, IBusinessPartner>();

  async save(partner: IBusinessPartner): Promise<void> {
    this.partners.set(partner.cuit, partner);
  }

  async findByCuit(cuit: string): Promise<IBusinessPartner | null> {
    return this.partners.get(cuit) || null;
  }

  async findAll(type?: "CLIENT" | "VENDOR"): Promise<IBusinessPartner[]> {
    const all = Array.from(this.partners.values());
    if (!type) return all;
    return all.filter((p) => p.type.includes(type));
  }

  async delete(cuit: string): Promise<void> {
    this.partners.delete(cuit);
  }
}
