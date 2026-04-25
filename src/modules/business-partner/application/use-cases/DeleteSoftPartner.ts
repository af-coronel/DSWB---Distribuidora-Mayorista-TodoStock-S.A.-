import type {
  IBusinessPartner,
  IBusinessPartnerRepository,
} from "../../domain/index.js";

export class DeleteSoftPartner {
  constructor(private partnerRepository: IBusinessPartnerRepository) {}

  async execute(cuit: string): Promise<void> {
    const partner = await this.partnerRepository.findByCuit(cuit);

    if (!partner) {
      throw new Error("Socio de negocio no encontrado");
    }

    // Regla de negocio: Soft Delete
    partner.active = false;
    partner.updated_at = new Date();
    partner.updated_by = "system_admin"; // Esto vendrá luego de la sesión

    await this.partnerRepository.save(partner);
  }
}
