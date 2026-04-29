import type {
  IBusinessPartner,
  IBusinessPartnerRepository,
} from "../../domain/index.js";

export class UpdatePartner {
  constructor(private partnerRepository: IBusinessPartnerRepository) {}

  // Usamos Partial<IBusinessPartner> porque podrían enviarnos solo 1 o 2 campos a actualizar
  async execute(cuit: string, updateData: Partial<IBusinessPartner>, userId: string): Promise<void> {
    const partner = await this.partnerRepository.findByCuit(cuit);

    if (!partner) {
      throw new Error("Socio de negocio no encontrado");
    }

    // Fusionamos los datos antiguos con los nuevos, pero protegemos campos críticos
    const updatedPartner: IBusinessPartner = {
      ...partner,          // Datos antiguos
      ...updateData,       // Datos nuevos enviados en el body
      cuit: partner.cuit,  // Bloqueamos la modificación del CUIT
      created_at: partner.created_at, // Bloqueamos la fecha de creación
      created_by: partner.created_by, // Bloqueamos al creador original
      updated_at: new Date(),         // Actualizamos la fecha de modificación
      updated_by: userId,             // Registramos al empleado que actualizó
    };

    // Nuestro repositorio JSON ya tiene la lógica perfecta para sobreescribir
    await this.partnerRepository.save(updatedPartner);
  }
}