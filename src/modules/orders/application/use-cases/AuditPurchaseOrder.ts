import type { IOrderRepository } from "../../domain/index.js";
import type { CreateInventoryLot } from "../../../inventory/application/index.js";

export interface AuditItemInput {
  product_id: string;
  quantity: number;
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

    const now = new Date();

    for (const auditItem of auditItems) {
      await this.createInventoryLotUseCase.execute({
        product_id: auditItem.product_id,
        stock: auditItem.quantity,
        engaged_stock: 0,
        expiration_date: auditItem.expiration_date,
        created_by: updatedBy,
        created_at: now,
        updated_by: updatedBy,
        updated_at: now,
      });
    }

    await this.orderRepository.updateStatus(orderId, "AUDITED", updatedBy, new Date());
  }
}
