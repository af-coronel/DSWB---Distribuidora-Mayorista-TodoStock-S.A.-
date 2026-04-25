import type { IBusinessPartner } from "../../domain/interfaces/IBusinessPartner.js";
import type { IBusinessPartnerRepository } from "../../domain/repositories/IBusinessPartnerRepository.js";

export class FindByCuitPartner {
  constructor(private partnerRepository: IBusinessPartnerRepository) {}

  async execute(cuit: string): Promise<IBusinessPartner | null> {
    const existingPartner = await this.partnerRepository.findByCuit(cuit);

    return existingPartner;
  }
}
