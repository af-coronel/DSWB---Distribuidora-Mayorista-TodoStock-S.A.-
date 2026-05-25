import mongoose, { Schema, type Document } from "mongoose";
import type { IOrder } from "../../domain/index.js";

export type OrderDocument = Omit<IOrder, "id"> & Document;

const OrderItemSchema = new Schema(
  {
    product_id: { type: String, required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit_price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const OrderSchema = new Schema<OrderDocument>(
  {
    order_type: { type: String, enum: ["PURCHASE", "SALE"], required: true },
    status: {
      type: String,
      enum: [
        "PENDING_BUDGET",
        "CONFIRMED",
        "RECEIVED",
        "PENDING_PAYMENT",
        "PENDING_ASSEMBLY",
        "DELIVERED",
        "CANCELLED",
      ],
      required: true,
    },
    partner_cuit: { type: String, required: true },
    items: { type: [OrderItemSchema], required: true },
    total_amount: { type: Number, required: true, min: 0 },
    scheduled_date: { type: Date, default: null },
    notes: { type: String, default: null },
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
        return { id: _id.toString(), ...rest };
      },
    },
  },
);

OrderSchema.index({ order_type: 1, status: 1 });
OrderSchema.index({ partner_cuit: 1 });

export const OrderModel = mongoose.model<OrderDocument>("Order", OrderSchema);
