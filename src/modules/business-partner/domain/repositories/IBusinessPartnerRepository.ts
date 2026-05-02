import type { IBusinessPartner } from "../index.js";

export interface IBusinessPartnerRepository {
  save(partner: IBusinessPartner): Promise<void>;

  findByCuit(cuit: string): Promise<IBusinessPartner | null>;

  findAll(type?: "CLIENT" | "VENDOR"): Promise<IBusinessPartner[]>;

  deleteSoft(cuit: string): Promise<void>;

  activate(cuit: string): Promise<void>;
}
