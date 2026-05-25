import mongoose, { Schema, type Document } from "mongoose";
import type { IProduct } from "../../domain/interfaces/IProduct.js";

export type ProductDocument = Omit<IProduct, "id"> & Document;

const ProductSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, trim: true },
    vendor_cuit: { type: String, required: true },
    vendor_price: { type: Number, required: true, min: 0 },
    customer_price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
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

ProductSchema.index({ name: 1, vendor_cuit: 1 }, { unique: true });

export const ProductModel = mongoose.model<ProductDocument>(
  "Product",
  ProductSchema,
);
