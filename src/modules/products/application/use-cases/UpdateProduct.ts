import { CuitValidator } from "../../../business-partner/domain/validators/CuitValidator.js";
import type { IProduct, IProductRepository } from "../../domain/index.js";

export class UpdateProduct {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(
    name: string,
    vendorCuit: string,
    updateData: Partial<IProduct>,
    userId: string,
  ): Promise<void> {
    const originalName = name.trim();
    const cleanVendorCuit = CuitValidator.sanitize(vendorCuit);

    if (!originalName) {
      throw new Error("El nombre del producto es obligatorio.");
    }

    if (!CuitValidator.isValid(cleanVendorCuit)) {
      throw new Error(
        "El CUIT del proveedor no es válido. Debe contener exactamente 11 dígitos.",
      );
    }

    const product = await this.productRepository.findByNameAndVendorCuit(
      originalName,
      cleanVendorCuit,
    );

    if (!product) {
      throw new Error("Producto no encontrado.");
    }

    const nextName = updateData.name?.trim() ?? product.name;
    const nextCategory = updateData.category?.trim() ?? product.category;
    const nextVendorPrice = updateData.vendor_price ?? product.vendor_price;
    const nextCustomerPrice =
      updateData.customer_price ?? product.customer_price;

    if (!nextName) {
      throw new Error("El nombre del producto es obligatorio.");
    }

    if (!nextCategory) {
      throw new Error("La categoría del producto es obligatoria.");
    }

    if (nextVendorPrice < 0 || nextCustomerPrice < 0) {
      throw new Error("Los precios del producto no pueden ser negativos.");
    }

    if (
      updateData.vendor_cuit &&
      CuitValidator.sanitize(updateData.vendor_cuit) !== cleanVendorCuit
    ) {
      throw new Error(
        "No se permite modificar el proveedor asociado al producto.",
      );
    }

    if (nextName !== product.name) {
      const existingProduct =
        await this.productRepository.findByNameAndVendorCuit(
          nextName,
          cleanVendorCuit,
        );

      if (existingProduct) {
        throw new Error(
          "Ya existe un producto con ese nombre para el proveedor indicado.",
        );
      }
    }

    const updatedProduct: IProduct = {
      ...product,
      ...updateData,
      name: nextName,
      category: nextCategory,
      vendor_cuit: product.vendor_cuit,
      vendor_price: nextVendorPrice,
      customer_price: nextCustomerPrice,
      created_at: product.created_at,
      created_by: product.created_by,
      updated_at: new Date(),
      updated_by: userId,
    };

    await this.productRepository.update(
      product.name,
      product.vendor_cuit,
      updatedProduct,
    );
  }
}
