import type { IInventoryLot, IInventoryRepository } from "../../domain/index.js";

export class GetAllInventoryLots {
  constructor(private readonly inventoryRepository: IInventoryRepository) {}

  async execute(): Promise<IInventoryLot[]> {
    return this.inventoryRepository.findAll();
  }
}
