import type { IOrderRepository } from "../../domain/index.js";
import type { CreateInventoryLot } from "../../../inventory/application/index.js";

export interface AuditItemInput {
  product_id: string;
  expiration_date: Date | null;
}

export class AuditPurchaseOrder {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly createInventoryLotUseCase: CreateInventoryLot,
  ) {}

  async execute(
    orderId: string,
    auditItems: AuditItemInput[],
    updatedBy: string,
  ): Promise<void> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error("La orden no existe.");
    }

    if (order.order_type !== "PURCHASE") {
      throw new Error("La orden no es de tipo compra.");
    }

    if (order.status !== "RECEIVED") {
      throw new Error(
        `No se puede auditar una orden en estado "${order.status}". Se requiere estado RECEIVED.`,
      );
    }

    const orderProductIds = new Set(order.items.map((i) => i.product_id));

    for (const auditItem of auditItems) {
      if (!orderProductIds.has(auditItem.product_id)) {
        throw new Error(
          `El producto "${auditItem.product_id}" no pertenece a esta orden de compra.`,
        );
      }
    }

    const now = new Date();
    const expirationMap = new Map(auditItems.map((i) => [i.product_id, i.expiration_date]));

    for (const orderItem of order.items) {
      await this.createInventoryLotUseCase.execute({
        product_id: orderItem.product_id,
        stock: orderItem.quantity,
        engaged_stock: 0,
        expiration_date: expirationMap.get(orderItem.product_id) ?? null,
        created_by: updatedBy,
        created_at: now,
        updated_by: updatedBy,
        updated_at: now,
      });
    }

    await this.orderRepository.updateStatus(orderId, "AUDITED", updatedBy, new Date());
  }
}
