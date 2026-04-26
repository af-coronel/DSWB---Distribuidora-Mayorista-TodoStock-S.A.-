import type {
  IBusinessPartner,
  IBusinessPartnerRepository,
} from "../../domain/index.js";

export class FindByCuitPartner {
  constructor(private partnerRepository: IBusinessPartnerRepository) {}

  async execute(cuit: string): Promise<IBusinessPartner | null> {
    const existingPartner = await this.partnerRepository.findByCuit(cuit);

    return existingPartner;
  }
}
