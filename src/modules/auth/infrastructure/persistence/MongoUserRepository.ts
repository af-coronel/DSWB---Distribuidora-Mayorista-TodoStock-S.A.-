import type { IUser } from "../../domain/interfaces/IUser.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import { UserModel } from "./UserModel.js";

export class MongoUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    const doc = await UserModel.findOne({ email });
    return doc ? (doc.toObject() as IUser) : null;
  }

  async findById(id: string): Promise<IUser | null> {
    const doc = await UserModel.findOne({ id });
    return doc ? (doc.toObject() as IUser) : null;
  }

  async save(user: IUser): Promise<void> {
    await UserModel.findOneAndUpdate({ id: user.id }, { $set: user }, { upsert: true });
  }
}
