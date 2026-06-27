import mongoose, { Schema, type Document } from "mongoose";
import type { IUser, UserRole } from "../../domain/interfaces/IUser.js";

export type UserDocument = IUser & Document;

const UserSchema = new Schema<UserDocument>(
  {
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["ADMIN", "COMMERCIAL", "INVENTORY", "FINANCE", "VENDOR", "CLIENT"] as UserRole[],
      required: true,
    },
    active: { type: Boolean, required: true, default: true },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true },
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

export const UserModel = mongoose.model<UserDocument>("User", UserSchema);
