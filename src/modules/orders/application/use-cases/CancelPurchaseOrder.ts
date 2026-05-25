import type { IOrderRepository } from "../../domain/index.js";
import type { IPaymentTransactionRepository } from "../../../transactions/domain/index.js";
import type { CancelTransaction } from "../../../transactions/application/index.js";

const CANCELLABLE_PURCHASE_STATUSES = ["PENDING_BUDGET", "CONFIRMED"] as const;

export class CancelPurchaseOrder {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly transactionRepository: IPaymentTransactionRepository,
    private readonly cancelTransactionUseCase: CancelTransaction,
  ) {}

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

    const transactions = await this.transactionRepository.findByOrderId(orderId);
    const pending = transactions.find((t) => t.status === "PENDING");

    if (pending?.id) {
      await this.cancelTransactionUseCase.execute(pending.id, updatedBy);
    }

    await this.orderRepository.updateStatus(orderId, "CANCELLED", updatedBy, new Date());
  }
}
