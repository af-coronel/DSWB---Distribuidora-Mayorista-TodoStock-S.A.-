import type { Request, Response } from "express";
import type { IBusinessPartner } from "../../../domain/interfaces/IBusinessPartner.js";
import { RegisterPartner } from "../../../application/use-cases/RegisterPartner.js";

export class VendorController {
  constructor(private registerUseCase: RegisterPartner) {}

  async create(req: Request, res: Response) {
    try {
      const {
        cuit,
        legal_name,
        phone,
        email,
        legal_address,
        vat_condition,
        vendor_data,
      } = req.body;

      // Construimos el objeto asegurando el rol VENDOR
      const newVendor: IBusinessPartner = {
        cuit,
        legal_name,
        phone,
        email,
        legal_address,
        vat_condition,
        active: true,
        type: ["VENDOR"],
        customer_data: null,
        vendor_data: {
          lead_time: vendor_data?.lead_time || 0,
          category: vendor_data?.category || "General",
        },
        created_at: new Date(),
        updated_at: new Date(),
        created_by: "system_admin",
        updated_by: "system_admin",
      };

      await this.registerUseCase.execute(newVendor);

      return res.status(201).json({
        message: "Proveedor registrado exitosamente",
        cuit: newVendor.cuit,
      });
    } catch (error: any) {
      return res.status(400).json({
        error: true,
        message: error.message,
      });
    }
  }
}
