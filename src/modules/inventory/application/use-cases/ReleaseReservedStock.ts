import type { IProductRepository } from "../../../products/domain/index.js";
import type {
  IInventoryLot,
  IInventoryRepository,
} from "../../domain/index.js";
import { sortLotsByFefoFifo } from "./helpers/inventoryLotSelection.js";

export class ReleaseReservedStock {
  constructor(
    private readonly inventoryRepository: IInventoryRepository,
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(
    productId: string,
    quantity: number,
    userId: string,
  ): Promise<IInventoryLot[]> {
    const normalizedProductId = productId.trim();

    if (!normalizedProductId) {
      throw new Error("El producto es obligatorio.");
    }

    if (quantity <= 0) {
      throw new Error("La cantidad a liberar debe ser mayor que cero.");
    }

    const product = await this.productRepository.findById(normalizedProductId);

    if (!product) {
      throw new Error("El producto indicado no existe.");
    }

    const lots =
      await this.inventoryRepository.findByProductId(normalizedProductId);
    const candidateLots = sortLotsByFefoFifo(
      lots.filter((lot) => lot.engaged_stock > 0),
    );
    const engagedStock = candidateLots.reduce(
      (total, lot) => total + lot.engaged_stock,
      0,
    );

    if (engagedStock < quantity) {
      throw new Error(
        "No hay stock reservado suficiente para liberar la cantidad indicada.",
      );
    }

    let remainingQuantity = quantity;
    const updatedLots: IInventoryLot[] = [];

    for (const lot of candidateLots) {
      if (remainingQuantity === 0) {
        break;
      }

      const releasedQuantity = Math.min(lot.engaged_stock, remainingQuantity);

      const updatedLot: IInventoryLot = {
        ...lot,
        engaged_stock: lot.engaged_stock - releasedQuantity,
        updated_at: new Date(),
        updated_by: userId,
      };

      await this.inventoryRepository.update(updatedLot);
      updatedLots.push(updatedLot);
      remainingQuantity -= releasedQuantity;
    }

    return updatedLots;
  }
}
