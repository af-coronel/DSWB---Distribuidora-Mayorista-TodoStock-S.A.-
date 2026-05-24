import mongoose, { Schema, type Document } from "mongoose";
import type { IBusinessPartner } from "../../domain/interfaces/IBusinessPartner.js";

export type BusinessPartnerDocument = IBusinessPartner & Document;

const CustomerDataSchema = new Schema(
  {
    credit_limit: { type: Number, required: true },
    current_balance: { type: Number, required: true },
    payment_terms: { type: Number },
  },
  { _id: false }
);

const VendorDataSchema = new Schema(
  {
    lead_time: { type: Number, required: true },
    category: { type: String, required: true },
  },
  { _id: false }
);

const BusinessPartnerSchema = new Schema<BusinessPartnerDocument>(
  {
    cuit: { type: String, required: true, unique: true },
    legal_name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    legal_address: { type: String, required: true },
    active: { type: Boolean, required: true, default: true },
    vat_condition: { type: String, required: true },
    type: {
      type: [{ type: String, enum: ["CLIENT", "VENDOR"] }],
      required: true,
    },
    customer_data: { type: CustomerDataSchema, default: null },
    vendor_data: { type: VendorDataSchema, default: null },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true },
    created_by: { type: String, required: true },
    updated_by: { type: String, required: true },
  },
  {
    versionKey: false,
    toObject: {
      transform: (_doc, ret) => {
        const { _id, ...rest } = ret;
        return rest;
      },
    },
  }
);

export const BusinessPartnerModel = mongoose.model<BusinessPartnerDocument>(
  "BusinessPartner",
  BusinessPartnerSchema
);
