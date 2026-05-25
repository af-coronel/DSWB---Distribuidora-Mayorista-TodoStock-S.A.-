import type { IOrderRepository } from "../../domain/index.js";
import type { ConfirmSale } from "../../../inventory/application/index.js";
import type { IPaymentTransactionRepository } from "../../../transactions/domain/index.js";

const COLLECTION_POS_NUMBER = "0001";
const COLLECTION_DOCUMENT_LENGTH = 8;

export class ConfirmSalePayment {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly confirmSaleUseCase: ConfirmSale,
    private readonly transactionRepository: IPaymentTransactionRepository,
  ) {}

  async execute(orderId: string, updatedBy: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error("La orden no existe.");
    }

    if (order.order_type !== "SALE") {
      throw new Error("La orden no es de tipo venta.");
    }

    if (
      order.status !== "TO_VERIFY_COLLECTION" &&
      order.status !== "PENDING_PAYMENT"
    ) {
      throw new Error(
        `No se puede confirmar el pago de una orden en estado "${order.status}". Se requiere estado TO_VERIFY_COLLECTION.`,
      );
    }

    for (const item of order.items) {
      await this.confirmSaleUseCase.execute(
        item.product_id,
        item.quantity,
        updatedBy,
      );
    }

    const transactions =
      await this.transactionRepository.findByOrderId(orderId);
    const pendingCollection = transactions.find(
      (t) =>
        t.transaction_type === "COLLECTION" &&
        (t.status === "PENDING" || t.status === "TO_VERIFY"),
    );
    if (pendingCollection) {
      const lastDocumentNumber =
        await this.transactionRepository.findLatestDocumentNumberByType(
          "COLLECTION",
          COLLECTION_POS_NUMBER,
        );
      const nextDocumentNumber = this.getNextDocumentNumber(lastDocumentNumber);

      await this.transactionRepository.update({
        ...pendingCollection,
        status: "COMPLETED",
        pos_number: COLLECTION_POS_NUMBER,
        document_number: nextDocumentNumber,
        updated_by: updatedBy,
        updated_at: new Date(),
      });
    }

    await this.orderRepository.updateStatus(
      orderId,
      "PENDING_ASSEMBLY",
      updatedBy,
      new Date(),
    );
  }

  private getNextDocumentNumber(lastDocumentNumber: string | null): string {
    const numericValue = Number.parseInt(lastDocumentNumber ?? "0", 10);
    const nextValue = Number.isNaN(numericValue) ? 1 : numericValue + 1;
    return String(nextValue).padStart(COLLECTION_DOCUMENT_LENGTH, "0");
  }
}
