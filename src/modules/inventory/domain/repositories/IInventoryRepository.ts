import type { IInventoryLot } from "../interfaces/IInventoryLot.js";

export interface IInventoryRepository {
  save(lot: IInventoryLot): Promise<void>;

  update(lot: IInventoryLot): Promise<void>;

  findAll(): Promise<IInventoryLot[]>;

  findByProductId(productId: string): Promise<IInventoryLot[]>;
}
