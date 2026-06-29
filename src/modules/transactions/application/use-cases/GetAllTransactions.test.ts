import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetAllTransactions } from "./GetAllTransactions.js";
import type { IPaymentTransactionRepository } from "../../domain/index.js";
import type { IPaymentTransaction, TransactionType } from "../../domain/index.js";

const makeTransaction = (overrides?: Partial<IPaymentTransaction>): IPaymentTransaction => ({
  id: "txn-1",
  order_id: "order-1",
  transaction_type: "PAYMENT",
  status: "COMPLETED",
  total_amount: 1500,
  items: [],
  created_by: "user-1",
  created_at: new Date("2025-06-01"),
  updated_by: "user-1",
  updated_at: new Date("2025-06-01"),
  ...overrides,
});

describe("GetAllTransactions", () => {
  let transactionRepository: IPaymentTransactionRepository;
  let getAllTransactions: GetAllTransactions;

  beforeEach(() => {
    vi.clearAllMocks();
    transactionRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByOrderId: vi.fn(),
      findLatestDocumentNumberByType: vi.fn(),
      update: vi.fn(),
    };
    getAllTransactions = new GetAllTransactions(transactionRepository);
  });

  it("should return all transactions when no type filter is provided", async () => {
    const txns = [
      makeTransaction({ id: "txn-1", transaction_type: "PAYMENT" }),
      makeTransaction({ id: "txn-2", transaction_type: "COLLECTION" }),
      makeTransaction({ id: "txn-3", transaction_type: "PAYMENT" }),
    ];
    vi.mocked(transactionRepository.findAll!).mockResolvedValue(txns);

    const result = await getAllTransactions.execute();

    expect(result).toHaveLength(3);
    expect(result).toEqual(txns);
  });

  it("should filter transactions by type when provided", async () => {
    const txns = [
      makeTransaction({ id: "txn-1", transaction_type: "PAYMENT" }),
      makeTransaction({ id: "txn-2", transaction_type: "COLLECTION" }),
      makeTransaction({ id: "txn-3", transaction_type: "PAYMENT" }),
    ];
    vi.mocked(transactionRepository.findAll!).mockResolvedValue(txns);

    const result = await getAllTransactions.execute("PAYMENT" as TransactionType);

    expect(result).toHaveLength(2);
    expect(result[0]!.transaction_type).toBe("PAYMENT");
    expect(result[1]!.transaction_type).toBe("PAYMENT");
  });
});
