import type { IProductRepository } from "../../../products/domain/index.js";
import type {
  IInventoryLot,
  IInventoryRepository,
} from "../../domain/index.js";
import {
  isExpiredLot,
  sortLotsByFefoFifo,
} from "./helpers/inventoryLotSelection.js";

export class ReserveStock {
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
      throw new Error("La cantidad a reservar debe ser mayor que cero.");
    }

    const product = await this.productRepository.findById(normalizedProductId);

    if (!product) {
      throw new Error("El producto indicado no existe.");
    }

    const lots =
      await this.inventoryRepository.findByProductId(normalizedProductId);
    const candidateLots = sortLotsByFefoFifo(
      lots.filter(
        (lot) => !isExpiredLot(lot) && lot.stock - lot.engaged_stock > 0,
      ),
    );

    const availableStock = candidateLots.reduce(
      (total, lot) => total + (lot.stock - lot.engaged_stock),
      0,
    );

    if (availableStock < quantity) {
      throw new Error(
        "No hay stock disponible suficiente para realizar la reserva.",
      );
    }

    let remainingQuantity = quantity;
    const updatedLots: IInventoryLot[] = [];

    for (const lot of candidateLots) {
      if (remainingQuantity === 0) {
        break;
      }

      const availableInLot = lot.stock - lot.engaged_stock;
      const reservedQuantity = Math.min(availableInLot, remainingQuantity);

      const updatedLot: IInventoryLot = {
        ...lot,
        engaged_stock: lot.engaged_stock + reservedQuantity,
        updated_at: new Date(),
        updated_by: userId,
      };

      await this.inventoryRepository.update(updatedLot);
      updatedLots.push(updatedLot);
      remainingQuantity -= reservedQuantity;
    }

    return updatedLots;
  }
}
