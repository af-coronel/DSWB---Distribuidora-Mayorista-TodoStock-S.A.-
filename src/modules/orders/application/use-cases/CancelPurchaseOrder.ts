import type { IOrderRepository } from "../../domain/index.js";

const CANCELLABLE_PURCHASE_STATUSES = ["PENDING_BUDGET", "CONFIRMED"] as const;

export class CancelPurchaseOrder {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(orderId: string, updatedBy: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error("La orden no existe.");
    }

    if (order.order_type !== "PURCHASE") {
      throw new Error("La orden no es de tipo compra.");
    }

    if (!CANCELLABLE_PURCHASE_STATUSES.includes(order.status as any)) {
      throw new Error(
        `No se puede cancelar una orden en estado "${order.status}".`,
      );
    }

    await this.orderRepository.updateStatus(orderId, "CANCELLED", updatedBy, new Date());
  }
}
