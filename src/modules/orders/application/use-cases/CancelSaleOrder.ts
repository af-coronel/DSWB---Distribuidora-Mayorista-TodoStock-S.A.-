import type { IOrderRepository } from "../../domain/index.js";
import type { ReleaseReservedStock } from "../../../inventory/application/index.js";

const CANCELLABLE_SALE_STATUSES = [
  "TO_VERIFY_COLLECTION",
  "PENDING_PAYMENT",
  "PENDING_ASSEMBLY",
  "DISPATCHING",
] as const;

export class CancelSaleOrder {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly releaseReservedStockUseCase: ReleaseReservedStock,
  ) {}

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

    // Solo libera reserva si todavía no se confirmó el pago (stock aún no fue descontado)
    if (
      order.status === "TO_VERIFY_COLLECTION" ||
      order.status === "PENDING_PAYMENT"
    ) {
      for (const item of order.items) {
        await this.releaseReservedStockUseCase.execute(
          item.product_id,
          item.quantity,
          updatedBy,
        );
      }
    }

    await this.orderRepository.updateStatus(
      orderId,
      "CANCELLED",
      updatedBy,
      new Date(),
    );
  }
}
