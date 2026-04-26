import type {
  IBusinessPartner,
  IBusinessPartnerRepository,
} from "../../domain/index.js";

export class GetAllPartners {
  constructor(private partnerRepository: IBusinessPartnerRepository) {}

  async execute(): Promise<IBusinessPartner[]> {
    const partners = await this.partnerRepository.findAll();
    return partners;
  }
}
