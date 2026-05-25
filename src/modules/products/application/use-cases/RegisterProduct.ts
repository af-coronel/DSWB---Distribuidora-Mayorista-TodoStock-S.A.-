import type { IBusinessPartnerRepository } from "../../../business-partner/domain/index.js";
import { CuitValidator } from "../../../business-partner/domain/validators/CuitValidator.js";
import type { IProduct, IProductRepository } from "../../domain/index.js";

export class RegisterProduct {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly businessPartnerRepository: IBusinessPartnerRepository,
  ) {}

  async execute(productData: IProduct): Promise<IProduct> {
    const normalizedName = productData.name.trim();
    const normalizedCategory = productData.category.trim();
    const cleanVendorCuit = CuitValidator.sanitize(productData.vendor_cuit);

    if (!normalizedName) {
      throw new Error("El nombre del producto es obligatorio.");
    }

    if (!normalizedCategory) {
      throw new Error("La categoría del producto es obligatoria.");
    }

    if (!CuitValidator.isValid(cleanVendorCuit)) {
      throw new Error(
        "El CUIT del proveedor no es válido. Debe contener exactamente 11 dígitos.",
      );
    }

    if (productData.vendor_price < 0 || productData.customer_price < 0) {
      throw new Error("Los precios del producto no pueden ser negativos.");
    }

    if (productData.customer_price < productData.vendor_price) {
      throw new Error(
        "El precio al cliente no puede ser menor que el precio del proveedor.",
      );
    }

    const vendor =
      await this.businessPartnerRepository.findByCuit(cleanVendorCuit);

    if (!vendor || !vendor.type.includes("VENDOR")) {
      throw new Error(
        "El proveedor indicado no existe o no está registrado como proveedor.",
      );
    }

    const productToSave: IProduct = {
      ...productData,
      name: normalizedName,
      category: normalizedCategory,
      vendor_cuit: cleanVendorCuit,
    };

    const existingProduct =
      await this.productRepository.findByNameAndVendorCuit(
        productToSave.name,
        productToSave.vendor_cuit,
      );

    if (existingProduct) {
      throw new Error(
        "Ya existe un producto con ese nombre para el proveedor indicado.",
      );
    }

    await this.productRepository.save(productToSave);

    return productToSave;
  }
}
