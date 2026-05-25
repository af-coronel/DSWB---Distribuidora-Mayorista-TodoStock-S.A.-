import type { IPaymentTransaction } from "../interfaces/IPaymentTransaction.js";

export interface IPaymentTransactionRepository {
  save(transaction: IPaymentTransaction): Promise<IPaymentTransaction>;
  findById(id: string): Promise<IPaymentTransaction | null>;
  findAll(): Promise<IPaymentTransaction[]>;
  findByOrderId(orderId: string): Promise<IPaymentTransaction[]>;
  findLatestDocumentNumberByType(
    transactionType: IPaymentTransaction["transaction_type"],
    posNumber: string,
  ): Promise<string | null>;
  update(transaction: IPaymentTransaction): Promise<void>;
}
