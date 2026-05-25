import type { IOrderRepository } from "../../domain/index.js";
import type { IPaymentTransactionRepository } from "../../../transactions/domain/index.js";

export class VerifyPurchaseBudget {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly transactionRepository: IPaymentTransactionRepository,
  ) {}

  async execute(orderId: string, updatedBy: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error("La orden no existe.");
    }

    if (order.order_type !== "PURCHASE") {
      throw new Error("La orden no es de tipo compra.");
    }

    const verifiableStatuses = ["TO_VERIFY_BUDGET", "PENDING_BUDGET"] as const;

    if (!verifiableStatuses.includes(order.status as any)) {
      throw new Error(
        `No se puede verificar presupuesto para una orden en estado "${order.status}".`,
      );
    }

    const transactions =
      await this.transactionRepository.findByOrderId(orderId);
    const paymentTransaction = transactions.find(
      (transaction) =>
        transaction.transaction_type === "PAYMENT" &&
        (transaction.status === "TO_VERIFY" ||
          transaction.status === "PENDING"),
    );

    if (!paymentTransaction) {
      throw new Error(
        "No existe una orden de pago en estado verificable para esta orden de compra.",
      );
    }

    await this.transactionRepository.update({
      ...paymentTransaction,
      status: "VERIFIED",
      updated_by: updatedBy,
      updated_at: new Date(),
    });

    await this.orderRepository.updateStatus(
      orderId,
      "TO_CONFIRM",
      updatedBy,
      new Date(),
    );
  }
}
