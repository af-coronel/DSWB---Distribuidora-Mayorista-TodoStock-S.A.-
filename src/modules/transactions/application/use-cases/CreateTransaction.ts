import type { IOrderRepository } from "../../../orders/domain/index.js";
import type {
  IPaymentTransaction,
  IPaymentTransactionRepository,
  TransactionType,
} from "../../domain/index.js";

export class CreateTransaction {
  constructor(
    private readonly transactionRepository: IPaymentTransactionRepository,
    private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(
    orderId: string,
    transactionType: TransactionType,
    createdBy: string,
  ): Promise<IPaymentTransaction> {
    if (!orderId?.trim()) {
      throw new Error("El ID de la orden es obligatorio.");
    }

    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error("La orden indicada no existe.");
    }

    if (transactionType === "PAYMENT" && order.order_type !== "PURCHASE") {
      throw new Error(
        "Una orden de pago solo puede asociarse a una orden de compra.",
      );
    }

    if (transactionType === "COLLECTION" && order.order_type !== "SALE") {
      throw new Error(
        "Una orden de cobro solo puede asociarse a una orden de venta.",
      );
    }

    const now = new Date();

    const transaction: IPaymentTransaction = {
      order_id: orderId,
      transaction_type: transactionType,
      status: transactionType === "PAYMENT" ? "TO_VERIFY" : "PENDING",
      created_by: createdBy,
      created_at: now,
      updated_by: createdBy,
      updated_at: now,
    };

    return this.transactionRepository.save(transaction);
  }
}
