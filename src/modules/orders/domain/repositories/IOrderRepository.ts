import type { IOrder, OrderStatus, OrderType } from "../interfaces/IOrder.js";

export interface IOrderRepository {
  save(order: IOrder): Promise<IOrder>;
  findById(id: string): Promise<IOrder | null>;
  findAll(): Promise<IOrder[]>;
  findByOrderType(type: OrderType): Promise<IOrder[]>;
  findByPartnerCuit(cuit: string): Promise<IOrder[]>;
  updateStatus(id: string, status: OrderStatus, updatedBy: string, updatedAt: Date): Promise<void>;
}
