import type { Request, Response } from "express";
import type { CreateInventoryLot } from "../../../application/use-cases/CreateInventoryLot.js";
import type { GetAllInventoryLots } from "../../../application/use-cases/GetAllInventoryLots.js";
import type { GetAllProducts } from "../../../../products/application/index.js";

type AuthenticatedRequest = Request & {
  user?: { id?: string };
};

const isFormRequest = (req: Request) =>
  req.headers["content-type"]?.includes("application/x-www-form-urlencoded");

export class InventoryController {
  constructor(
    private readonly createInventoryLotUseCase: CreateInventoryLot,
    private readonly getAllInventoryLotsUseCase: GetAllInventoryLots,
    private readonly getAllProductsUseCase: GetAllProducts,
  ) {}

  async getAll(req: Request, res: Response) {
    try {
      const lots = await this.getAllInventoryLotsUseCase.execute();

      if (req.headers.accept?.includes("text/html")) {
        const products = await this.getAllProductsUseCase.execute();
        const productMap = Object.fromEntries(
          products.map((p) => [p.id, p.name]),
        );
        return res.render("inventory/list", {
          activeTab: "inventory",
          lots,
          productMap,
        });
      }

      return res.status(200).json(lots);
    } catch (error: any) {
      return res.status(500).json({ error: true, message: error.message });
    }
  }

  async renderCreateForm(req: Request, res: Response) {
    const products = await this.getAllProductsUseCase.execute();
    return res.render("inventory/create", {
      activeTab: "inventory",
      products,
      errorMessage: undefined,
    });
  }

  async createLot(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { product_id, stock, expiration_date } = req.body;
      const userId = request.user?.id || "unknown";
      const now = new Date();

      await this.createInventoryLotUseCase.execute({
        product_id,
        stock: Number(stock),
        engaged_stock: 0,
        expiration_date: expiration_date ? new Date(expiration_date) : null,
        created_by: userId,
        created_at: now,
        updated_by: userId,
        updated_at: now,
      });

      if (isFormRequest(req)) return res.redirect("/api/inventory");
      return res.status(201).json({ message: "Lote de inventario creado correctamente" });
    } catch (error: any) {
      if (isFormRequest(req)) {
        const products = await this.getAllProductsUseCase.execute();
        return res.status(400).render("inventory/create", {
          activeTab: "inventory",
          products,
          formData: req.body,
          errorMessage: error.message,
        });
      }
      return res.status(400).json({ error: true, message: error.message });
    }
  }
}
