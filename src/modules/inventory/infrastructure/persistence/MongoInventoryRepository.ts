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

  async update(lot: IInventoryLot): Promise<void> {
    if (!lot.id) {
      throw new Error("No se puede actualizar un lote sin identificador.");
    }

    await InventoryLotModel.findByIdAndUpdate(lot.id, {
      $set: {
        product_id: lot.product_id,
        stock: lot.stock,
        engaged_stock: lot.engaged_stock,
        expiration_date: lot.expiration_date,
        created_by: lot.created_by,
        created_at: lot.created_at,
        updated_by: lot.updated_by,
        updated_at: lot.updated_at,
      },
    });
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
