import mongoose, { Schema, type Document } from "mongoose";
import type { IInventoryLot } from "../../domain/interfaces/IInventoryLot.js";

export type InventoryLotDocument = Omit<IInventoryLot, "id"> & Document;

const InventoryLotSchema = new Schema<InventoryLotDocument>(
  {
    product_id: { type: String, required: true, index: true },
    stock: { type: Number, required: true, min: 0 },
    engaged_stock: { type: Number, required: true, min: 0, default: 0 },
    expiration_date: { type: Date, default: null },
    created_by: { type: String, required: true },
    created_at: { type: Date, required: true },
    updated_by: { type: String, required: true },
    updated_at: { type: Date, required: true },
  },
  {
    versionKey: false,
    toObject: {
      transform: (
        _doc: unknown,
        ret: { _id: { toString(): string } } & Record<string, unknown>,
      ) => {
        const { _id, ...rest } = ret;

        return {
          id: _id.toString(),
          ...rest,
        };
      },
    },
  },
);

InventoryLotSchema.index({ product_id: 1, expiration_date: 1, created_at: 1 });

export const InventoryLotModel = mongoose.model<InventoryLotDocument>(
  "InventoryLot",
  InventoryLotSchema,
);
