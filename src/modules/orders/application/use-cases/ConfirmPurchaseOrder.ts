import type { IOrder, IOrderRepository } from "../../domain/index.js";

export class ConfirmPurchaseOrder {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(orderId: string, updatedBy: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error("La orden no existe.");
    }

    if (order.order_type !== "PURCHASE") {
      throw new Error("La orden no es de tipo compra.");
    }

    if (order.status !== "PENDING_BUDGET") {
      throw new Error(
        `No se puede confirmar una orden en estado "${order.status}". Se requiere estado PENDING_BUDGET.`,
      );
    }

    await this.orderRepository.updateStatus(orderId, "CONFIRMED", updatedBy, new Date());
  }
}
