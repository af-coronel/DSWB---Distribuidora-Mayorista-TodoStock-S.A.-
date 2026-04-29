import type { Request, Response } from "express";
import type { IBusinessPartner } from "../../../domain/index.js";
import {
  RegisterPartner,
  FindByCuitPartner,
  GetAllPartners,
  DeleteSoftPartner,
} from "../../../application/index.js";

export class VendorController {
  constructor(
    private registerUseCase: RegisterPartner,
    private findByCuitUseCase: FindByCuitPartner,
    private getAllPartnersUseCase: GetAllPartners,
    private deleteSoftUseCase: DeleteSoftPartner,
  ) {}

  async renderCreateForm(req: Request, res: Response) {
    return res.render("partners/create_vendor");
  }
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
        lead_time,
        category,
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
          lead_time: lead_time || 0,
          category: category || "General",
        },
        created_at: new Date(),
        updated_at: new Date(),
        created_by: "system_admin",
        updated_by: "system_admin",
      };

      await this.registerUseCase.execute(newVendor);

      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        return res.redirect("/api/vendors");
      }

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

  async getByCuit(req: Request, res: Response) {
    try {
      const { cuit } = req.params;

      if (Array.isArray(cuit)) {
        return res.status(400).json({
          error: true,
          message: "El CUIT no puede ser un arreglo",
        });
      }

      if (typeof cuit !== "string" || !/^\d{11}$/.test(cuit)) {
        return res.status(400).json({
          error: true,
          message: "CUIT inválido",
        });
      }

      const vendor = await this.findByCuitUseCase.execute(cuit);

      if (!vendor || !vendor.type.includes("VENDOR")) {
        return res.status(404).json({
          error: true,
          message: "Proveedor no encontrado",
        });
      }

      return res.status(200).json(vendor);
    } catch (error: any) {
      return res.status(500).json({
        error: true,
        message: error.message,
      });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const vendors = await this.getAllPartnersUseCase.execute();
      const onlyVendors = vendors.filter((partner) =>
        partner.type.includes("VENDOR"),
      );
      if (req.headers.accept?.includes("text/html")) {
        return res.render("partners/list", {
          partners: onlyVendors,
          activeTab: "vendors", // Identificador para la pestaña
        });
      }
      if (!onlyVendors.length) {
        return res.status(200).json({
          message: "Aún no hay proveedores registrados",
        });
      }
      return res.status(200).json(onlyVendors);
    } catch (error: any) {
      return res.status(500).json({
        error: true,
        message: error.message,
      });
    }
  }

  async deleteSoft(req: Request, res: Response) {
    try {
      const { cuit } = req.params;

      // Validaciones pueden pasar a middleware aparte
      if (Array.isArray(cuit)) {
        return res.status(400).json({
          error: true,
          message: "El CUIT no puede ser un arreglo",
        });
      }

      if (typeof cuit !== "string" || !/^\d{11}$/.test(cuit)) {
        return res.status(400).json({
          error: true,
          message: "CUIT inválido",
        });
      }
      // Reutilizamos la lógica del caso de uso general
      await this.deleteSoftUseCase.execute(cuit);

      return res.status(200).json({
        message: "Proveedor desactivado correctamente",
      });
    } catch (error: any) {
      return res.status(400).json({
        error: true,
        message: error.message,
      });
    }
  }
}
