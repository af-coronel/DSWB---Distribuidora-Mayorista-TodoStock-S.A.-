import type { Request, Response } from "express";
import type {
  ActivatePartner,
  DeleteSoftPartner,
  FindByCuitPartner,
  GetAllPartners,
  RegisterPartner,
  UpdatePartner,
} from "../../../application/index.js";
import type { IBusinessPartner } from "../../../domain/index.js";

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
  };
};

export class ClientController {
  constructor(
    private registerUseCase: RegisterPartner,
    private findByCuitUseCase: FindByCuitPartner,
    private getAllPartnersUseCase: GetAllPartners,
    private deleteSoftUseCase: DeleteSoftPartner,
    private updateUseCase: UpdatePartner,
    private activateUseCase: ActivatePartner,
  ) {}

  async renderCreateForm(req: Request, res: Response) {
    return res.render("partners/create_clients", {
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

      const client = await this.findByCuitUseCase.execute(cuit);

      if (!client || !client.type.includes("CLIENT")) {
        return res.status(404).json({
          error: true,
          message: "Cliente no encontrado",
        });
      }

      return res.render("partners/edit", {
        partner: client,
        activeTab: "clients",
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
        created_by: request.user?.id || "unknown",
        updated_by: request.user?.id || "unknown",
      };

      await this.registerUseCase?.execute(newClient);

      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        return res.redirect("/api/clients?created=1");
      }

      return res.status(201).json({
        message: "Cliente registrado exitosamente",
        cuit: newClient.cuit,
      });
    } catch (error: any) {
      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        return res.status(400).render("partners/create_clients", {
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

      const client = await this.findByCuitUseCase?.execute(cuit);

      if (!client || !client.type.includes("CLIENT")) {
        return res.status(404).json({
          error: true,
          message: "Cliente no encontrado",
        });
      }
      return res.render("partners/detail", {
        partner: client,
        activeTab: "clients",
        successMessage:
          req.query.updated === "1"
            ? "Cliente actualizado correctamente."
            : req.query.activated === "1"
              ? "Cliente activado correctamente."
              : req.query.deactivated === "1"
                ? "Cliente desactivado correctamente."
                : undefined,
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
          successMessage:
            req.query.created === "1"
              ? "Cliente registrado correctamente."
              : req.query.activated === "1"
                ? "Cliente activado correctamente."
                : req.query.deactivated === "1"
                  ? "Cliente desactivado correctamente."
                  : undefined,
          errorMessage:
            typeof req.query.error === "string" ? req.query.error : undefined,
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

  async update(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
      const { cuit } = req.params;
      const userId = request.user?.id || "unknown";

      if (typeof cuit !== "string" || !/^\d{11}$/.test(cuit)) {
        return res.status(400).json({ error: true, message: "CUIT inválido" });
      }

      const currentClient = await this.findByCuitUseCase.execute(cuit);

      if (!currentClient || !currentClient.type.includes("CLIENT")) {
        return res.status(404).json({
          error: true,
          message: "Cliente no encontrado",
        });
      }

      const updatePayload: Partial<IBusinessPartner> = {
        legal_name: req.body.legal_name,
        phone: req.body.phone,
        email: req.body.email,
        legal_address: req.body.legal_address,
        vat_condition: req.body.vat_condition,
      };

      if (typeof req.body.credit_limit !== "undefined") {
        updatePayload.customer_data = {
          credit_limit: Number(req.body.credit_limit) || 0,
          current_balance: currentClient.customer_data?.current_balance || 0,
        };

        if (typeof currentClient.customer_data?.payment_terms !== "undefined") {
          updatePayload.customer_data.payment_terms =
            currentClient.customer_data.payment_terms;
        }
      }

      await this.updateUseCase.execute(cuit, updatePayload, userId);

      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        return res.redirect(`/api/clients/${cuit}?updated=1`);
      }

      return res.status(200).json({
        message: "Cliente actualizado correctamente",
      });
    } catch (error: any) {
      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        const { cuit } = req.params;

        if (typeof cuit === "string") {
          const currentClient = await this.findByCuitUseCase.execute(cuit);

          if (currentClient && currentClient.type.includes("CLIENT")) {
            const partner: IBusinessPartner = {
              ...currentClient,
              legal_name: req.body.legal_name ?? currentClient.legal_name,
              phone: req.body.phone ?? currentClient.phone,
              email: req.body.email ?? currentClient.email,
              legal_address:
                req.body.legal_address ?? currentClient.legal_address,
              vat_condition:
                req.body.vat_condition ?? currentClient.vat_condition,
              customer_data: {
                credit_limit:
                  typeof req.body.credit_limit !== "undefined"
                    ? Number(req.body.credit_limit) || 0
                    : currentClient.customer_data?.credit_limit || 0,
                current_balance:
                  currentClient.customer_data?.current_balance || 0,
              },
            };

            if (
              partner.customer_data &&
              typeof currentClient.customer_data?.payment_terms !== "undefined"
            ) {
              partner.customer_data.payment_terms =
                currentClient.customer_data.payment_terms;
            }

            return res.status(400).render("partners/edit", {
              partner,
              activeTab: "clients",
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

      // 1. Extraemos el ID del usuario que hizo la petición
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

      // 2. Le pasamos 'cuit' y 'userId' separados por una coma
      await this.deleteSoftUseCase.execute(cuit, userId);

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
        message: "Cliente activado correctamente",
      });
    } catch (error: any) {
      return res.status(400).json({
        error: true,
        message: error.message,
      });
    }
  }
}
