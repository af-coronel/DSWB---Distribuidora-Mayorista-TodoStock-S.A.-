import type { IOrder, IOrderRepository, OrderType } from "../../domain/index.js";

export class GetAllOrders {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(orderType?: OrderType): Promise<IOrder[]> {
    if (orderType) {
      return this.orderRepository.findByOrderType(orderType);
    }
    return this.orderRepository.findAll();
  }
}
