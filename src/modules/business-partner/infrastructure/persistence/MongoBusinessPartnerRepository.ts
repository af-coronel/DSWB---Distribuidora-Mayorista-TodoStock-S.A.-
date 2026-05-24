import type { IBusinessPartner, IBusinessPartnerRepository } from "../../domain/index.js";
import { BusinessPartnerModel } from "./BusinessPartnerModel.js";

export class MongoBusinessPartnerRepository implements IBusinessPartnerRepository {
  async save(partner: IBusinessPartner): Promise<void> {
    const existing = await BusinessPartnerModel.findOne({ cuit: partner.cuit });

    if (existing) {
      await BusinessPartnerModel.findOneAndUpdate(
        { cuit: partner.cuit },
        {
          $set: {
            ...partner,
            type: [...new Set([...existing.type, ...partner.type])],
            customer_data: partner.customer_data ?? existing.customer_data ?? null,
            vendor_data: partner.vendor_data ?? existing.vendor_data ?? null,
            updated_at: new Date(),
          },
        }
      );
    } else {
      await BusinessPartnerModel.create(partner);
    }
  }

  async findByCuit(cuit: string): Promise<IBusinessPartner | null> {
    const doc = await BusinessPartnerModel.findOne({ cuit });
    return doc ? (doc.toObject() as IBusinessPartner) : null;
  }

  async findAll(type?: "CLIENT" | "VENDOR"): Promise<IBusinessPartner[]> {
    const filter = type ? { type: { $in: [type] } } : {};
    const docs = await BusinessPartnerModel.find(filter);
    return docs.map((doc) => doc.toObject() as IBusinessPartner);
  }

  async deleteSoft(cuit: string): Promise<void> {
    await BusinessPartnerModel.findOneAndUpdate(
      { cuit },
      { $set: { active: false, updated_at: new Date() } }
    );
  }

  async activate(cuit: string): Promise<void> {
    await BusinessPartnerModel.findOneAndUpdate(
      { cuit },
      { $set: { active: true, updated_at: new Date() } }
    );
  }
}
