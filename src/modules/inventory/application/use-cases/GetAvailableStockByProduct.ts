import type { IProductRepository } from "../../../products/domain/index.js";
import type { IInventoryRepository } from "../../domain/index.js";

export class GetAvailableStockByProduct {
  constructor(
    private readonly inventoryRepository: IInventoryRepository,
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(productId: string): Promise<number> {
    const normalizedProductId = productId.trim();

    if (!normalizedProductId) {
      throw new Error("El producto es obligatorio.");
    }

    const product = await this.productRepository.findById(normalizedProductId);

    if (!product) {
      throw new Error("El producto indicado no existe.");
    }

    const lots =
      await this.inventoryRepository.findByProductId(normalizedProductId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return lots
      .filter(
        (lot) => !lot.expiration_date || new Date(lot.expiration_date) >= today,
      )
      .reduce(
        (total, lot) => total + Math.max(lot.stock - lot.engaged_stock, 0),
        0,
      );
  }
}
