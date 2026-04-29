import type {
  IBusinessPartner,
  IBusinessPartnerRepository,
} from "../../domain/index.js";

export class DeleteSoftPartner {
  constructor(private partnerRepository: IBusinessPartnerRepository) {}

  async execute(cuit: string, userId: string): Promise<void> {
    const partner = await this.partnerRepository.findByCuit(cuit);

    if (!partner) {
      throw new Error("Socio de negocio no encontrado");
    }

    // Regla de negocio: Soft Delete y Auditoria
    partner.active = false;
    partner.updated_at = new Date();
    partner.updated_by =  userId;

    await this.partnerRepository.save(partner);
  }
}
