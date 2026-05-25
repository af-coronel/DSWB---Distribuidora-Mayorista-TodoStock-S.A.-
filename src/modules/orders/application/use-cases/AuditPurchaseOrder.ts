import type { IOrderRepository } from "../../domain/index.js";
import type { CreateInventoryLot } from "../../../inventory/application/index.js";
import type { IPaymentTransactionRepository } from "../../../transactions/domain/index.js";

export interface AuditItemInput {
  product_id: string;
  received_quantity: number;
  expiration_date: Date | null;
}

export class AuditPurchaseOrder {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly createInventoryLotUseCase: CreateInventoryLot,
    private readonly transactionRepository: IPaymentTransactionRepository,
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

      if (auditItem.received_quantity < 0) {
        throw new Error(
          `La cantidad recibida para el producto "${auditItem.product_id}" no puede ser negativa.`,
        );
      }
    }

    const auditMap = new Map(auditItems.map((i) => [i.product_id, i]));

    for (const orderItem of order.items) {
      const audit = auditMap.get(orderItem.product_id);
      const received = audit?.received_quantity ?? orderItem.quantity;

      if (received > orderItem.quantity) {
        throw new Error(
          `La cantidad recibida (${received}) para "${orderItem.product_name}" supera la cantidad pedida (${orderItem.quantity}).`,
        );
      }
    }

    const now = new Date();
    let auditedTotal = 0;
    const auditedItems = [];

    for (const orderItem of order.items) {
      const audit = auditMap.get(orderItem.product_id);
      const received = audit?.received_quantity ?? orderItem.quantity;

      auditedTotal += received * orderItem.unit_price;
      auditedItems.push({
        product_id: orderItem.product_id,
        product_name: orderItem.product_name,
        quantity: received,
        unit_price: orderItem.unit_price,
      });

      if (received > 0) {
        await this.createInventoryLotUseCase.execute({
          product_id: orderItem.product_id,
          stock: received,
          engaged_stock: 0,
          expiration_date: audit?.expiration_date ?? null,
          created_by: updatedBy,
          created_at: now,
          updated_by: updatedBy,
          updated_at: now,
        });
      }
    }

    const transactions =
      await this.transactionRepository.findByOrderId(orderId);
    const paymentTransaction = transactions.find(
      (transaction) =>
        transaction.transaction_type === "PAYMENT" &&
        (transaction.status === "VERIFIED" ||
          transaction.status === "TO_VERIFY" ||
          transaction.status === "PENDING"),
    );

    if (paymentTransaction) {
      await this.transactionRepository.update({
        ...paymentTransaction,
        status: "PENDING_PAYMENT",
        total_amount: auditedTotal,
        items: auditedItems,
        updated_by: updatedBy,
        updated_at: now,
      });
    }

    await this.orderRepository.updateStatus(orderId, "AUDITED", updatedBy, now);
  }
}
