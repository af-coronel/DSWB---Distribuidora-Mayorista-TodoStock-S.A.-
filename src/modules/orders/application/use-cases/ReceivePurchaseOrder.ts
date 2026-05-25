import type { IOrderRepository } from "../../domain/index.js";

export class ReceivePurchaseOrder {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(orderId: string, updatedBy: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error("La orden no existe.");
    }

    if (order.order_type !== "PURCHASE") {
      throw new Error("La orden no es de tipo compra.");
    }

    if (order.status !== "CONFIRMED") {
      throw new Error(
        `No se puede marcar como recibida una orden en estado "${order.status}". Se requiere estado CONFIRMED.`,
      );
    }

    await this.orderRepository.updateStatus(orderId, "RECEIVED", updatedBy, new Date());
  }
}
