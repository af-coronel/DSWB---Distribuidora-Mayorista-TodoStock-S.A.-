import type { Request, Response } from "express";
import type {
  DeleteSoftPartner,
  FindByCuitPartner,
  GetAllPartners,
  RegisterPartner,
} from "../../../application/index.js";
import type { IBusinessPartner } from "../../../domain/index.js";
export class ClientController {
  constructor(
    private registerUseCase: RegisterPartner,
    private findByCuitUseCase: FindByCuitPartner,
    private getAllPartnersUseCase: GetAllPartners,
    private deleteSoftUseCase: DeleteSoftPartner,
  ) {}

  async renderCreateForm(req: Request, res: Response) {
    return res.render("partners/create_clients");
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
        customer_data,
        credit_limit,
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
        customer_data: customer_data || {
          credit_limit: Number(credit_limit) || 0,
          current_balance: 0,
        },
        vendor_data: null,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: "system_admin", // TODO: actualizar con la info del middleware de Auth
        updated_by: "system_admin", // TODO: actualizar con la info del middleware de Auth
      };

      await this.registerUseCase?.execute(newClient);

      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        return res.redirect("/api/clients");
      }

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

      const client = await this.findByCuitUseCase?.execute(cuit);

      if (!client || !client.type.includes("CLIENT")) {
        return res.status(404).json({
          error: true,
          message: "Cliente no encontrado",
        });
      }
      return res.render("partners/detail", { client });
    } catch (error: any) {
      return res.status(500).json({
        error: true,
        message: error.message,
      });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const clients = await this.getAllPartnersUseCase.execute();
      const onlyClients = clients.filter((partner) =>
        partner.type.includes("CLIENT"),
      );
      // Si el cliente pide HTML (Navegador)
      if (req.headers.accept?.includes("text/html")) {
        return res.render("partners/list", {
          partners: onlyClients,
          activeTab: "clients",
        });
      }

      // Si pide JSON (Postman / App)
      if (!onlyClients.length) {
        return res.status(200).json({
          message: "Aún no hay clientes registrados",
        });
      }

      return res.status(200).json(onlyClients);
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
        message: "Socio de negocio desactivado correctamente",
      });
    } catch (error: any) {
      return res.status(400).json({
        error: true,
        message: error.message,
      });
    }
  }
}
