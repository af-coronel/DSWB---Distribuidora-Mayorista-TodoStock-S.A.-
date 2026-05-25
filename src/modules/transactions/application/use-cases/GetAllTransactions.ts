import type {
  IPaymentTransaction,
  IPaymentTransactionRepository,
  TransactionType,
} from "../../domain/index.js";

export class GetAllTransactions {
  constructor(
    private readonly transactionRepository: IPaymentTransactionRepository,
  ) {}

  async execute(type?: TransactionType): Promise<IPaymentTransaction[]> {
    const all = await this.transactionRepository.findAll();
    if (!type) return all;
    return all.filter((t) => t.transaction_type === type);
  }
}
