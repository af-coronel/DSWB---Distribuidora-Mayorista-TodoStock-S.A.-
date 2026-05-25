import type { IPaymentTransactionRepository } from "../../domain/index.js";

export class CompleteTransaction {
  constructor(
    private readonly transactionRepository: IPaymentTransactionRepository,
  ) {}

  async execute(
    transactionId: string,
    updatedBy: string,
    posNumber?: string,
    documentNumber?: string,
  ): Promise<void> {
    const transaction = await this.transactionRepository.findById(transactionId);

    if (!transaction) {
      throw new Error("La transacción no existe.");
    }

    if (transaction.status !== "PENDING") {
      throw new Error(
        `No se puede completar una transacción en estado "${transaction.status}". Se requiere estado PENDING.`,
      );
    }

    if (transaction.transaction_type === "PAYMENT") {
      if (!posNumber?.trim()) {
        throw new Error(
          "El número de POS es obligatorio para completar una orden de pago.",
        );
      }
      if (!documentNumber?.trim()) {
        throw new Error(
          "El número de documento es obligatorio para completar una orden de pago.",
        );
      }
    }

    await this.transactionRepository.update({
      ...transaction,
      status: "COMPLETED",
      pos_number: posNumber?.trim(),
      document_number: documentNumber?.trim(),
      updated_by: updatedBy,
      updated_at: new Date(),
    });
  }
}
