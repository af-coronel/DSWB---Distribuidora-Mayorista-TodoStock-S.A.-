import type { IOrderRepository } from "../../domain/index.js";
import type { ConfirmSale } from "../../../inventory/application/index.js";

export class MarkOrderDelivered {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly confirmSaleUseCase: ConfirmSale,
  ) {}

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

    for (const item of order.items) {
      await this.confirmSaleUseCase.execute(item.product_id, item.quantity, updatedBy);
    }

    await this.orderRepository.updateStatus(orderId, "DELIVERED", updatedBy, new Date());
  }
}
