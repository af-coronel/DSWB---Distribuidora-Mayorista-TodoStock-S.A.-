import type { IOrderRepository } from "../../domain/index.js";

export class MarkOrderDelivered {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(orderId: string, updatedBy: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error("La orden no existe.");
    }

    if (order.order_type !== "SALE") {
      throw new Error("La orden no es de tipo venta.");
    }

    if (order.status !== "PENDING_ASSEMBLY") {
      throw new Error(
        `No se puede marcar como entregada una orden en estado "${order.status}". Se requiere estado PENDING_ASSEMBLY.`,
      );
    }

    // TODO: integrar con inventory — decrementar stock real (FEFO/FIFO) por cada ítem de la orden

    await this.orderRepository.updateStatus(orderId, "DELIVERED", updatedBy, new Date());
  }
}
