import mongoose, { type Document, Schema } from "mongoose";
import type { IPaymentTransaction } from "../../domain/index.js";

export type TransactionDocument = IPaymentTransaction & Document;

const TransactionSchema = new Schema<TransactionDocument>(
  {
    order_id: { type: String, required: true },
    transaction_type: {
      type: String,
      enum: ["PAYMENT", "COLLECTION"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "TO_VERIFY",
        "VERIFIED",
        "PENDING_PAYMENT",
        "PENDING",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "TO_VERIFY",
      required: true,
    },
    total_amount: { type: Number, min: 0 },
    items: [
      {
        _id: false,
        product_id: { type: String, required: true },
        product_name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
        unit_price: { type: Number, required: true, min: 0 },
      },
    ],
    pos_number: { type: String },
    document_number: { type: String },
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

TransactionSchema.index({ transaction_type: 1, status: 1 });
TransactionSchema.index({ order_id: 1 });

export const TransactionModel = mongoose.model<TransactionDocument>(
  "Transaction",
  TransactionSchema,
);
