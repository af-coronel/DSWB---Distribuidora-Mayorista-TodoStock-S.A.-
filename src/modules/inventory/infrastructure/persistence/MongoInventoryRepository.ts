import type {
  IInventoryLot,
  IInventoryRepository,
} from "../../domain/index.js";
import {
  InventoryLotModel,
  type InventoryLotDocument,
} from "./InventoryLotModel.js";

export class MongoInventoryRepository implements IInventoryRepository {
  async save(lot: IInventoryLot): Promise<void> {
    await InventoryLotModel.create(lot);
  }

  async findByProductId(productId: string): Promise<IInventoryLot[]> {
    const docs = await InventoryLotModel.find({ product_id: productId }).sort({
      expiration_date: 1,
      created_at: 1,
    });

    return docs.map(
      (doc: InventoryLotDocument) => doc.toObject() as IInventoryLot,
    );
  }
}
