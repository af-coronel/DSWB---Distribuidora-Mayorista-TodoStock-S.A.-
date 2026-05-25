import type { Request, Response } from "express";
import { GetAllPartners } from "../../../../business-partner/application/index.js";
import type { IBusinessPartner } from "../../../../business-partner/domain/index.js";
import type { IProduct } from "../../../domain/index.js";
import {
  FindProductByNameAndVendorCuit,
  GetAllProducts,
  RegisterProduct,
  UpdateProduct,
} from "../../../application/index.js";

type ProductViewModel = IProduct & {
  vendor_name?: string;
};

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
  };
};

export class ProductController {
  private readonly publicSaleCategories = new Set(["Limpieza", "Bazar"]);

  constructor(
    private readonly registerProductUseCase: RegisterProduct,
    private readonly getAllProductsUseCase: GetAllProducts,
    private readonly getAllPartnersUseCase: GetAllPartners,
    private readonly findProductByNameAndVendorCuitUseCase: FindProductByNameAndVendorCuit,
    private readonly updateProductUseCase: UpdateProduct,
  ) {}

  private getCategoryOptions(): string[] {
    return ["Alimentos", "Limpieza", "Bebidas", "Bazar", "General"];
  }

  private isPublicSaleProduct(product: IProduct): boolean {
    return this.publicSaleCategories.has(product.category);
  }

  private getListViewMode(
    value: unknown,
  ): "all" | "public_sale" | "internal_use" {
    if (value === "public_sale" || value === "internal_use") {
      return value;
    }

    return "all";
  }

  private getPageNumber(value: unknown): number {
    const rawPage = typeof value === "string" ? Number(value) : Number.NaN;

    if (!Number.isInteger(rawPage) || rawPage < 1) {
      return 1;
    }

    return rawPage;
  }

  private async getVendors(): Promise<IBusinessPartner[]> {
    const partners = await this.getAllPartnersUseCase.execute();
    return partners.filter(
      (partner) => partner.active && partner.type.includes("VENDOR"),
    );
  }

  private async getVendorNameByCuit(vendorCuit: string): Promise<string> {
    const partners = await this.getAllPartnersUseCase.execute();
    const vendor = partners.find((partner) => partner.cuit === vendorCuit);

    return vendor?.legal_name || vendorCuit;
  }

  private async enrichProductsWithVendorName(
    products: IProduct[],
  ): Promise<ProductViewModel[]> {
    const partners = await this.getAllPartnersUseCase.execute();
    const vendorNames = new Map(
      partners.map((partner) => [partner.cuit, partner.legal_name]),
    );

    return products.map((product) => ({
      ...product,
      vendor_name: vendorNames.get(product.vendor_cuit) || product.vendor_cuit,
    }));
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

  private async renderEditView(
    res: Response,
    product: IProduct,
    formData?: Partial<IProduct>,
    errorMessage?: string,
  ) {
    const vendorName = await this.getVendorNameByCuit(product.vendor_cuit);

    return res.render("products/edit", {
      activeTab: "products",
      categories: this.getCategoryOptions(),
      product,
      vendorName,
      formData: formData ?? product,
      errorMessage,
      encodedName: encodeURIComponent(product.name),
    });
  }

  async renderCreateForm(req: Request, res: Response) {
    return this.renderCreateView(res);
  }

  async create(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
      const { name, vendor_cuit, vendor_price, customer_price, category } =
        req.body;

      const vendorPriceNum = Number(vendor_price);
      const customerPriceNum = Number(customer_price);

      if (!vendor_price || isNaN(vendorPriceNum) || vendorPriceNum < 0) {
        throw new Error("El precio proveedor debe ser un número válido mayor o igual a cero.");
      }
      if (!customer_price || isNaN(customerPriceNum) || customerPriceNum < 0) {
        throw new Error("El precio cliente debe ser un número válido mayor o igual a cero.");
      }

      const newProduct: IProduct = {
        name,
        vendor_cuit,
        vendor_price: vendorPriceNum,
        customer_price: customerPriceNum,
        category,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: request.user?.id || "unknown",
        updated_by: request.user?.id || "unknown",
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

  async renderEditForm(req: Request, res: Response) {
    try {
      const { vendor_cuit, name } = req.params;

      if (typeof vendor_cuit !== "string" || typeof name !== "string") {
        return res.status(400).json({
          error: true,
          message: "Parámetros inválidos para editar el producto.",
        });
      }

      const product = await this.findProductByNameAndVendorCuitUseCase.execute(
        decodeURIComponent(name),
        vendor_cuit,
      );

      if (!product) {
        return res.status(404).json({
          error: true,
          message: "Producto no encontrado.",
        });
      }

      return this.renderEditView(res, product);
    } catch (error: any) {
      return res.status(400).json({
        error: true,
        message: error.message,
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
      const { vendor_cuit, name } = req.params;
      const userId = request.user?.id || "unknown";

      if (typeof vendor_cuit !== "string" || typeof name !== "string") {
        return res.status(400).json({
          error: true,
          message: "Parámetros inválidos para editar el producto.",
        });
      }

      const originalName = decodeURIComponent(name);

      const updatedVendorPrice = Number(req.body.vendor_price);
      const updatedCustomerPrice = Number(req.body.customer_price);

      if (!req.body.vendor_price || isNaN(updatedVendorPrice) || updatedVendorPrice < 0) {
        throw new Error("El precio proveedor debe ser un número válido mayor o igual a cero.");
      }
      if (!req.body.customer_price || isNaN(updatedCustomerPrice) || updatedCustomerPrice < 0) {
        throw new Error("El precio cliente debe ser un número válido mayor o igual a cero.");
      }

      await this.updateProductUseCase.execute(
        originalName,
        vendor_cuit,
        {
          name: req.body.name,
          vendor_cuit: req.body.vendor_cuit,
          vendor_price: updatedVendorPrice,
          customer_price: updatedCustomerPrice,
          category: req.body.category,
        },
        userId,
      );

      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        return res.redirect("/api/products");
      }

      return res.status(200).json({
        message: "Producto actualizado correctamente",
      });
    } catch (error: any) {
      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        const { vendor_cuit, name } = req.params;

        if (typeof vendor_cuit === "string" && typeof name === "string") {
          const product =
            await this.findProductByNameAndVendorCuitUseCase.execute(
              decodeURIComponent(name),
              vendor_cuit,
            );

          if (product) {
            return this.renderEditView(
              res.status(400),
              product,
              req.body,
              error.message,
            );
          }
        }
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

      if (req.headers.accept?.includes("text/html") || req.headers["hx-request"] === "true") {
        const productsView = await this.enrichProductsWithVendorName(products);
        const viewMode = this.getListViewMode(req.query.view);
        const searchTerm =
          typeof req.query.search === "string" ? req.query.search.trim() : "";
        const filteredProducts = productsView.filter((product) => {
          const matchesView =
            viewMode === "public_sale"
              ? this.isPublicSaleProduct(product)
              : viewMode === "internal_use"
                ? !this.isPublicSaleProduct(product)
                : true;
          const matchesSearch =
            searchTerm.length === 0 ||
            product.name.toLowerCase().includes(searchTerm.toLowerCase());

          return matchesView && matchesSearch;
        });
        const pageSize = 20;
        const totalItems = filteredProducts.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const currentPage = Math.min(
          this.getPageNumber(req.query.page),
          totalPages,
        );
        const startIndex = (currentPage - 1) * pageSize;
        const paginatedProducts = filteredProducts.slice(
          startIndex,
          startIndex + pageSize,
        );

        const viewData = {
          products: paginatedProducts,
          activeTab: "products",
          viewMode,
          searchTerm,
          currentPage,
          totalPages,
          totalItems,
          pageSize,
        };

        const view =
          req.headers["hx-request"] === "true"
            ? "products/_table"
            : "products/list";

        return res.render(view, viewData);
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
