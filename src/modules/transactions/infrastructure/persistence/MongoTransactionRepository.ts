import type {
  IPaymentTransaction,
  IPaymentTransactionRepository,
} from "../../domain/index.js";
import {
  TransactionModel,
  type TransactionDocument,
} from "./TransactionModel.js";

export class MongoTransactionRepository implements IPaymentTransactionRepository {
  async save(transaction: IPaymentTransaction): Promise<IPaymentTransaction> {
    const doc = await TransactionModel.create(transaction);
    return doc.toObject() as IPaymentTransaction;
  }

  async findById(id: string): Promise<IPaymentTransaction | null> {
    try {
      const doc = await TransactionModel.findById(id);
      return doc ? (doc.toObject() as IPaymentTransaction) : null;
    } catch {
      return null;
    }
  }

  async findAll(): Promise<IPaymentTransaction[]> {
    const docs = await TransactionModel.find().sort({ created_at: -1 });
    return docs.map(
      (doc: TransactionDocument) => doc.toObject() as IPaymentTransaction,
    );
  }

  async findByOrderId(orderId: string): Promise<IPaymentTransaction[]> {
    const docs = await TransactionModel.find({ order_id: orderId }).sort({
      created_at: -1,
    });
    return docs.map(
      (doc: TransactionDocument) => doc.toObject() as IPaymentTransaction,
    );
  }

  async findLatestDocumentNumberByType(
    transactionType: IPaymentTransaction["transaction_type"],
    posNumber: string,
  ): Promise<string | null> {
    const doc = await TransactionModel.findOne({
      transaction_type: transactionType,
      status: "COMPLETED",
      pos_number: posNumber,
      document_number: { $exists: true, $ne: null },
    }).sort({ document_number: -1, updated_at: -1 });

    return doc?.document_number ?? null;
  }

  async update(transaction: IPaymentTransaction): Promise<void> {
    await TransactionModel.findByIdAndUpdate(transaction.id, {
      $set: transaction,
    });
  }
}
