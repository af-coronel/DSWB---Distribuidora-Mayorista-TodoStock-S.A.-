import type { IInventoryLot } from "../interfaces/IInventoryLot.js";

export interface IInventoryRepository {
  save(lot: IInventoryLot): Promise<void>;

  findByProductId(productId: string): Promise<IInventoryLot[]>;
}
