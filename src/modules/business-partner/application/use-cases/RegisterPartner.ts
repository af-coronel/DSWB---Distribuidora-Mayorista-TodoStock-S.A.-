import type {
  IBusinessPartner,
  IBusinessPartnerRepository,
} from "../../domain/index.js";

export class RegisterPartner {
  constructor(private partnerRepository: IBusinessPartnerRepository) {}

  async execute(data: IBusinessPartner): Promise<void> {
    // Para no duplicar CUITs
    const existingPartner = await this.partnerRepository.findByCuit(data.cuit);

    if (
      existingPartner &&
      existingPartner.type.some((t) => data.type.includes(t))
    ) {
      // Verifico si el tipo de socio de negocio ya existe para ese CUIT
      throw new Error(
        `Ya existe un socio de negocio con el CUIT ${existingPartner.cuit} y de tipo ${existingPartner.type.join(", ")}`,
      );
    }

    if (data.customer_data && data.customer_data.credit_limit < 0) {
      throw new Error("El límite de crédito no puede ser negativo");
    }

    // Guardo
    await this.partnerRepository.save(data);
  }
}
