import type { IOrder, IOrderRepository } from "../../domain/index.js";

export class GetOrderById {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(orderId: string): Promise<IOrder> {
    if (!orderId?.trim()) {
      throw new Error("El ID de la orden es obligatorio.");
    }

    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error("La orden no existe.");
    }

    return order;
  }
}
