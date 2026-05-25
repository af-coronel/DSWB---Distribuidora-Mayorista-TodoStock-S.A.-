import type { IProductRepository } from "../../../products/domain/index.js";
import type {
  IInventoryLot,
  IInventoryRepository,
} from "../../domain/index.js";
import {
  isExpiredLot,
  sortLotsByFefoFifo,
} from "./helpers/inventoryLotSelection.js";

export class ConfirmSale {
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
      throw new Error("La cantidad a vender debe ser mayor que cero.");
    }

    const product = await this.productRepository.findById(normalizedProductId);

    if (!product) {
      throw new Error("El producto indicado no existe.");
    }

    const lots =
      await this.inventoryRepository.findByProductId(normalizedProductId);
    const candidateLots = sortLotsByFefoFifo(
      lots.filter((lot) => !isExpiredLot(lot) && lot.engaged_stock > 0),
    );
    const engagedStock = candidateLots.reduce(
      (total, lot) => total + lot.engaged_stock,
      0,
    );

    if (engagedStock < quantity) {
      throw new Error(
        "No hay stock reservado suficiente para confirmar la venta.",
      );
    }

    let remainingQuantity = quantity;
    const updatedLots: IInventoryLot[] = [];

    for (const lot of candidateLots) {
      if (remainingQuantity === 0) {
        break;
      }

      const confirmedQuantity = Math.min(lot.engaged_stock, remainingQuantity);

      const updatedLot: IInventoryLot = {
        ...lot,
        stock: lot.stock - confirmedQuantity,
        engaged_stock: lot.engaged_stock - confirmedQuantity,
        updated_at: new Date(),
        updated_by: userId,
      };

      await this.inventoryRepository.update(updatedLot);
      updatedLots.push(updatedLot);
      remainingQuantity -= confirmedQuantity;
    }

    return updatedLots;
  }
}
