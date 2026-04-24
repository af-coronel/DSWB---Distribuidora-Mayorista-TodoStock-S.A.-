import type { IBusinessPartner } from "../interfaces/IBusinessPartner.js";

export interface IBusinessPartnerRepository {
  save(partner: IBusinessPartner): Promise<void>;

  findByCuit(cuit: string): Promise<IBusinessPartner | null>;

  findAll(type?: "CLIENT" | "VENDOR"): Promise<IBusinessPartner[]>;

  delete(cuit: string): Promise<void>;
}
