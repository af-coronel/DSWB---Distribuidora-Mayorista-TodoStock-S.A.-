import type { Request, Response } from "express";
import type { GetAllInventoryLots } from "../../../application/use-cases/GetAllInventoryLots.js";
import type { GetAllProducts } from "../../../../products/application/index.js";

export class InventoryController {
  constructor(
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
}
