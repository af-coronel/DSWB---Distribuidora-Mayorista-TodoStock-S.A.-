import mongoose, { type Document, Schema } from "mongoose";
import type { IPaymentTransaction } from "../../domain/index.js";

export type TransactionDocument = IPaymentTransaction & Document;

const TransactionSchema = new Schema<TransactionDocument>(
  {
    order_id: { type: String, required: true },
    transaction_type: { type: String, enum: ["PAYMENT", "COLLECTION"], required: true },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "CANCELLED"],
      default: "PENDING",
      required: true,
    },
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
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
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
