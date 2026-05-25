import type { IPaymentTransactionRepository } from "../../domain/index.js";

export class CancelTransaction {
  constructor(
    private readonly transactionRepository: IPaymentTransactionRepository,
  ) {}

  async execute(transactionId: string, updatedBy: string): Promise<void> {
    const transaction =
      await this.transactionRepository.findById(transactionId);

    if (!transaction) {
      throw new Error("La transacción no existe.");
    }

    const cancellableStatuses = [
      "TO_VERIFY",
      "PENDING",
      "VERIFIED",
      "PENDING_PAYMENT",
    ] as const;

    if (!cancellableStatuses.includes(transaction.status as any)) {
      throw new Error(
        `No se puede cancelar una transacción en estado "${transaction.status}".`,
      );
    }

    await this.transactionRepository.update({
      ...transaction,
      status: "CANCELLED",
      updated_by: updatedBy,
      updated_at: new Date(),
    });
  }
}
