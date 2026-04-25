import { RegisterPartner } from "../../../application/use-cases/RegisterPartner.js";
import type { IBusinessPartner } from "../../../domain/interfaces/IBusinessPartner.js";
import type { Request, Response } from "express";
export class ClientController {
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
        customer_data,
      } = req.body;

      const newClient: IBusinessPartner = {
        cuit,
        legal_name,
        phone,
        email,
        legal_address,
        vat_condition,
        active: true,
        type: ["CLIENT"], // Forzamos el tipo
        customer_data: customer_data || { credit_limit: 0, current_balance: 0 },
        vendor_data: null,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: "system_admin", // TODO: actualizar con la info del middleware de Auth
        updated_by: "system_admin", // TODO: actualizar con la info del middleware de Auth
      };

      await this.registerUseCase.execute(newClient);

      return res.status(201).json({
        message: "Cliente registrado exitosamente",
        cuit: newClient.cuit,
      });
    } catch (error: any) {
      return res.status(400).json({
        error: true,
        message: error.message,
      });
    }
  }
}
