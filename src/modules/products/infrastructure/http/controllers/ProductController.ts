import type { Request, Response } from "express";
import { GetAllProducts } from "../../../application/index.js";

export class ProductController {
  constructor(private readonly getAllProductsUseCase: GetAllProducts) {}

  async renderCreateForm(req: Request, res: Response) {
    return res.render("products/create", {
      activeTab: "products",
    });
  }

  async getAll(req: Request, res: Response) {
    try {
      const products = await this.getAllProductsUseCase.execute();

      if (req.headers.accept?.includes("text/html")) {
        return res.render("products/list", {
          products,
          activeTab: "products",
        });
      }

      if (!products.length) {
        return res.status(200).json({
          message: "Aún no hay productos registrados",
          items: [],
        });
      }

      return res.status(200).json(products);
    } catch (error: any) {
      return res.status(500).json({
        error: true,
        message: error.message,
      });
    }
  }
}
