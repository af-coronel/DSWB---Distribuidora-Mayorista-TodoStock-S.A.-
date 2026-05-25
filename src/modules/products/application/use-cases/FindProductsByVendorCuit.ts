import { CuitValidator } from "../../../business-partner/domain/validators/CuitValidator.js";
import type { IProduct, IProductRepository } from "../../domain/index.js";

export class FindProductsByVendorCuit {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(vendorCuit: string): Promise<IProduct[]> {
    const cleanVendorCuit = CuitValidator.sanitize(vendorCuit);

    if (!CuitValidator.isValid(cleanVendorCuit)) {
      throw new Error(
        "El CUIT del proveedor no es válido. Debe contener exactamente 11 dígitos.",
      );
    }

    return this.productRepository.findByVendorCuit(cleanVendorCuit);
  }
}
