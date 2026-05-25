import type { IOrderRepository } from "../../domain/index.js";

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

    const confirmableStatuses = ["TO_CONFIRM"] as const;

    if (!confirmableStatuses.includes(order.status as any)) {
      throw new Error(
        `No se puede confirmar una orden en estado "${order.status}". Se requiere estado TO_CONFIRM.`,
      );
    }

    await this.orderRepository.updateStatus(
      orderId,
      "CONFIRMED",
      updatedBy,
      new Date(),
    );
  }
}
