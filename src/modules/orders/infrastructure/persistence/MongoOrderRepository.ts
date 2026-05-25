import type { IOrder, IOrderRepository, OrderStatus, OrderType } from "../../domain/index.js";
import { OrderModel, type OrderDocument } from "./OrderModel.js";

export class MongoOrderRepository implements IOrderRepository {
  async save(order: IOrder): Promise<IOrder> {
    const doc = await OrderModel.create(order);
    return doc.toObject() as IOrder;
  }

  async findById(id: string): Promise<IOrder | null> {
    const doc = await OrderModel.findById(id);
    return doc ? (doc.toObject() as IOrder) : null;
  }

  async findAll(): Promise<IOrder[]> {
    const docs = await OrderModel.find().sort({ created_at: -1 });
    return docs.map((doc: OrderDocument) => doc.toObject() as IOrder);
  }

  async findByOrderType(type: OrderType): Promise<IOrder[]> {
    const docs = await OrderModel.find({ order_type: type }).sort({ created_at: -1 });
    return docs.map((doc: OrderDocument) => doc.toObject() as IOrder);
  }

  async findByPartnerCuit(cuit: string): Promise<IOrder[]> {
    const docs = await OrderModel.find({ partner_cuit: cuit }).sort({ created_at: -1 });
    return docs.map((doc: OrderDocument) => doc.toObject() as IOrder);
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    updatedBy: string,
    updatedAt: Date,
  ): Promise<void> {
    await OrderModel.findByIdAndUpdate(id, {
      $set: { status, updated_by: updatedBy, updated_at: updatedAt },
    });
  }

  async updateTotalAmount(
    id: string,
    total: number,
    updatedBy: string,
    updatedAt: Date,
  ): Promise<void> {
    await OrderModel.findByIdAndUpdate(id, {
      $set: { total_amount: total, updated_by: updatedBy, updated_at: updatedAt },
    });
  }
}
