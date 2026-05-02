import type {
  IBusinessPartner,
  IBusinessPartnerRepository,
} from "../../domain/index.js";

export class ActivatePartner {
  constructor(private partnerRepository: IBusinessPartnerRepository) {}

  async execute(cuit: string, userId: string): Promise<void> {
    const partner = await this.partnerRepository.findByCuit(cuit);

    if (!partner) {
      throw new Error("Socio de negocio no encontrado");
    }

    if (partner.active) {
      throw new Error("El socio de negocio ya se encuentra activo");
    }

    // Regla de negocio: Reactivar y Auditar
    partner.active = true;
    partner.updated_at = new Date();
    partner.updated_by = userId;

    await this.partnerRepository.save(partner);
  }
}
