import type { IOrderRepository } from "../../domain/index.js";

const CANCELLABLE_SALE_STATUSES = ["PENDING_PAYMENT", "PENDING_ASSEMBLY"] as const;

export class CancelSaleOrder {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(orderId: string, updatedBy: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error("La orden no existe.");
    }

    if (order.order_type !== "SALE") {
      throw new Error("La orden no es de tipo venta.");
    }

    if (!CANCELLABLE_SALE_STATUSES.includes(order.status as any)) {
      throw new Error(
        `No se puede cancelar una orden en estado "${order.status}".`,
      );
    }

    // TODO: integrar con inventory — liberar stock reservado (engaged_stock) si el estado era PENDING_ASSEMBLY

    await this.orderRepository.updateStatus(orderId, "CANCELLED", updatedBy, new Date());
  }
}
