import type { IOrderRepository } from "../../domain/index.js";

export class ConfirmSalePayment {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(orderId: string, updatedBy: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error("La orden no existe.");
    }

    if (order.order_type !== "SALE") {
      throw new Error("La orden no es de tipo venta.");
    }

    if (order.status !== "PENDING_PAYMENT") {
      throw new Error(
        `No se puede confirmar el pago de una orden en estado "${order.status}". Se requiere estado PENDING_PAYMENT.`,
      );
    }

    // TODO: integrar con inventory — reservar stock (engaged_stock) por cada ítem de la orden

    await this.orderRepository.updateStatus(orderId, "PENDING_ASSEMBLY", updatedBy, new Date());
  }
}
