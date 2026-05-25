import type {
  IPaymentTransaction,
  IPaymentTransactionRepository,
} from "../../domain/index.js";

export class GetTransactionById {
  constructor(
    private readonly transactionRepository: IPaymentTransactionRepository,
  ) {}

  async execute(id: string): Promise<IPaymentTransaction> {
    const transaction = await this.transactionRepository.findById(id);

    if (!transaction) {
      throw new Error("La transacción no existe.");
    }

    return transaction;
  }
}
