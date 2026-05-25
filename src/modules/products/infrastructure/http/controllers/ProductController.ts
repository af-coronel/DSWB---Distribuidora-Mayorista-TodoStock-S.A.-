import type { Request, Response } from "express";
import { GetAllPartners } from "../../../../business-partner/application/index.js";
import type { IBusinessPartner } from "../../../../business-partner/domain/index.js";
import type { IProduct } from "../../../domain/index.js";
import { GetAllProducts, RegisterProduct } from "../../../application/index.js";

export class ProductController {
  constructor(
    private readonly registerProductUseCase: RegisterProduct,
    private readonly getAllProductsUseCase: GetAllProducts,
    private readonly getAllPartnersUseCase: GetAllPartners,
  ) {}

  private getCategoryOptions(): string[] {
    return ["Alimentos", "Limpieza", "Bebidas", "Bazar", "General"];
  }

  private async getVendors(): Promise<IBusinessPartner[]> {
    const partners = await this.getAllPartnersUseCase.execute();
    return partners.filter(
      (partner) => partner.active && partner.type.includes("VENDOR"),
    );
  }

  private async renderCreateView(
    res: Response,
    formData?: Partial<IProduct>,
    errorMessage?: string,
  ) {
    const vendors = await this.getVendors();

    return res.render("products/create", {
      activeTab: "products",
      vendors,
      categories: this.getCategoryOptions(),
      formData,
      errorMessage,
    });
  }

  async renderCreateForm(req: Request, res: Response) {
    return this.renderCreateView(res);
  }

  async create(req: Request, res: Response) {
    try {
      const { name, vendor_cuit, vendor_price, customer_price, category } =
        req.body;

      const newProduct: IProduct = {
        name,
        vendor_cuit,
        vendor_price: Number(vendor_price),
        customer_price: Number(customer_price),
        category,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: req.user?.id || "unknown",
        updated_by: req.user?.id || "unknown",
      };

      const createdProduct =
        await this.registerProductUseCase.execute(newProduct);

      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        return res.redirect("/api/products");
      }

      return res.status(201).json({
        message: "Producto registrado exitosamente",
        item: createdProduct,
      });
    } catch (error: any) {
      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        return this.renderCreateView(res.status(400), req.body, error.message);
      }

      return res.status(400).json({
        error: true,
        message: error.message,
      });
    }
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
