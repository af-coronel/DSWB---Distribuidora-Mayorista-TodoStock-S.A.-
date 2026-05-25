import { CuitValidator } from "../../../business-partner/domain/validators/CuitValidator.js";
import type { IProduct, IProductRepository } from "../../domain/index.js";

export class FindProductByNameAndVendorCuit {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(name: string, vendorCuit: string): Promise<IProduct | null> {
    const normalizedName = name.trim();
    const cleanVendorCuit = CuitValidator.sanitize(vendorCuit);

    if (!normalizedName) {
      throw new Error("El nombre del producto es obligatorio.");
    }

    if (!CuitValidator.isValid(cleanVendorCuit)) {
      throw new Error(
        "El CUIT del proveedor no es válido. Debe contener exactamente 11 dígitos.",
      );
    }

    return this.productRepository.findByNameAndVendorCuit(
      normalizedName,
      cleanVendorCuit,
    );
  }
}
