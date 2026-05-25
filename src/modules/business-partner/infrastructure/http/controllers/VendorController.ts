import type { Request, Response } from "express";
import type { IBusinessPartner } from "../../../domain/index.js";
import {
  RegisterPartner,
  FindByCuitPartner,
  GetAllPartners,
  DeleteSoftPartner,
  UpdatePartner,
  ActivatePartner,
} from "../../../application/index.js";

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
  };
};

export class VendorController {
  constructor(
    private registerUseCase: RegisterPartner,
    private findByCuitUseCase: FindByCuitPartner,
    private getAllPartnersUseCase: GetAllPartners,
    private deleteSoftUseCase: DeleteSoftPartner,
    private updateUseCase: UpdatePartner,
    private activateUseCase: ActivatePartner,
  ) {}

  async renderCreateForm(req: Request, res: Response) {
    return res.render("partners/create_vendor", {
      errorMessage:
        typeof req.query.error === "string" ? req.query.error : undefined,
    });
  }

  async renderEditForm(req: Request, res: Response) {
    try {
      const { cuit } = req.params;

      if (typeof cuit !== "string" || !/^\d{11}$/.test(cuit)) {
        return res.status(400).json({ error: true, message: "CUIT inválido" });
      }

      const vendor = await this.findByCuitUseCase.execute(cuit);

      if (!vendor || !vendor.type.includes("VENDOR")) {
        return res.status(404).json({
          error: true,
          message: "Proveedor no encontrado",
        });
      }

      return res.render("partners/edit", {
        partner: vendor,
        activeTab: "vendors",
        errorMessage:
          typeof req.query.error === "string" ? req.query.error : undefined,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: true,
        message: error.message,
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
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

      // Construimos el objeto forzando el rol VENDOR
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
        created_by: request.user?.id || "unknown",
        updated_by: request.user?.id || "unknown",
      };

      await this.registerUseCase.execute(newVendor);

      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        return res.redirect("/api/vendors?created=1");
      }

      return res.status(201).json({
        message: "Proveedor registrado exitosamente",
        cuit: newVendor.cuit,
      });
    } catch (error: any) {
      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        return res.status(400).render("partners/create_vendor", {
          errorMessage: error.message,
          formData: req.body,
        });
      }

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

      if (req.headers.accept?.includes("text/html")) {
        return res.render("partners/detail", {
          partner: vendor,
          activeTab: "vendors",
          successMessage:
            req.query.updated === "1"
              ? "Proveedor actualizado correctamente."
              : req.query.activated === "1"
                ? "Proveedor activado correctamente."
                : req.query.deactivated === "1"
                  ? "Proveedor desactivado correctamente."
                  : undefined,
          errorMessage:
            typeof req.query.error === "string" ? req.query.error : undefined,
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
          successMessage:
            req.query.created === "1"
              ? "Proveedor registrado correctamente."
              : req.query.activated === "1"
                ? "Proveedor activado correctamente."
                : req.query.deactivated === "1"
                  ? "Proveedor desactivado correctamente."
                  : undefined,
          errorMessage:
            typeof req.query.error === "string" ? req.query.error : undefined,
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

  async update(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
      const { cuit } = req.params;
      const userId = request.user?.id || "unknown";

      if (typeof cuit !== "string" || !/^\d{11}$/.test(cuit)) {
        return res.status(400).json({ error: true, message: "CUIT inválido" });
      }

      const currentVendor = await this.findByCuitUseCase.execute(cuit);

      if (!currentVendor || !currentVendor.type.includes("VENDOR")) {
        return res.status(404).json({
          error: true,
          message: "Proveedor no encontrado",
        });
      }

      const updatePayload: Partial<IBusinessPartner> = {
        legal_name: req.body.legal_name,
        phone: req.body.phone,
        email: req.body.email,
        legal_address: req.body.legal_address,
        vat_condition: req.body.vat_condition,
      };

      if (
        typeof req.body.lead_time !== "undefined" ||
        typeof req.body.category !== "undefined"
      ) {
        updatePayload.vendor_data = {
          lead_time:
            typeof req.body.lead_time !== "undefined"
              ? Number(req.body.lead_time) || 0
              : currentVendor.vendor_data?.lead_time || 0,
          category:
            req.body.category ||
            currentVendor.vendor_data?.category ||
            "General",
        };
      }

      await this.updateUseCase.execute(cuit, updatePayload, userId);

      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        return res.redirect(`/api/vendors/${cuit}?updated=1`);
      }

      return res.status(200).json({
        message: "Proveedor actualizado correctamente",
      });
    } catch (error: any) {
      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        const { cuit } = req.params;

        if (typeof cuit === "string") {
          const currentVendor = await this.findByCuitUseCase.execute(cuit);

          if (currentVendor && currentVendor.type.includes("VENDOR")) {
            const partner = {
              ...currentVendor,
              legal_name: req.body.legal_name ?? currentVendor.legal_name,
              phone: req.body.phone ?? currentVendor.phone,
              email: req.body.email ?? currentVendor.email,
              legal_address:
                req.body.legal_address ?? currentVendor.legal_address,
              vat_condition:
                req.body.vat_condition ?? currentVendor.vat_condition,
              vendor_data: {
                lead_time:
                  typeof req.body.lead_time !== "undefined"
                    ? Number(req.body.lead_time) || 0
                    : currentVendor.vendor_data?.lead_time || 0,
                category:
                  req.body.category ||
                  currentVendor.vendor_data?.category ||
                  "General",
              },
            };

            return res.status(400).render("partners/edit", {
              partner,
              activeTab: "vendors",
              errorMessage: error.message,
            });
          }
        }
      }

      return res.status(400).json({
        error: true,
        message: error.message,
      });
    }
  }

  async deleteSoft(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
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

      const userId = request.user?.id || "unknown";
      // Reutilizamos la lógica del caso de uso general
      await this.deleteSoftUseCase.execute(cuit, userId);

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

  async activate(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
      const { cuit } = req.params;
      const userId = request.user?.id || "unknown";

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

      await this.activateUseCase.execute(cuit, userId);

      return res.status(200).json({
        message: "Proveedor activado correctamente",
      });
    } catch (error: any) {
      return res.status(400).json({
        error: true,
        message: error.message,
      });
    }
  }
}
