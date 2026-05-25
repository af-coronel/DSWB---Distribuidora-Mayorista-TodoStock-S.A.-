import type { IOrderRepository } from "../../domain/index.js";
import type { ReserveStock } from "../../../inventory/application/index.js";

export class ConfirmSalePayment {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly reserveStockUseCase: ReserveStock,
  ) {}

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

    for (const item of order.items) {
      await this.reserveStockUseCase.execute(item.product_id, item.quantity, updatedBy);
    }

    await this.orderRepository.updateStatus(orderId, "PENDING_ASSEMBLY", updatedBy, new Date());
  }
}
