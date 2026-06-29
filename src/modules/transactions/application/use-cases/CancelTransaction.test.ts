import { describe, it, expect, vi, beforeEach } from "vitest";
import { CancelTransaction } from "./CancelTransaction.js";
import type { IPaymentTransactionRepository } from "../../domain/index.js";
import type { IPaymentTransaction } from "../../domain/index.js";

const makeTransaction = (overrides?: Partial<IPaymentTransaction>): IPaymentTransaction => ({
  id: "txn-1",
  order_id: "order-1",
  transaction_type: "PAYMENT",
  status: "PENDING",
  total_amount: 1500,
  items: [],
  created_by: "user-1",
  created_at: new Date("2025-06-01"),
  updated_by: "user-1",
  updated_at: new Date("2025-06-01"),
  ...overrides,
});

describe("CancelTransaction", () => {
  let transactionRepository: IPaymentTransactionRepository;
  let cancelTransaction: CancelTransaction;

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
    cancelTransaction = new CancelTransaction(transactionRepository);
  });

  it.each(["TO_VERIFY", "PENDING", "VERIFIED", "PENDING_PAYMENT"] as const)(
    "should cancel a transaction from %s status",
    async (status) => {
      const txn = makeTransaction({ status });
      vi.mocked(transactionRepository.findById!).mockResolvedValue(txn);

      await cancelTransaction.execute("txn-1", "user-1");

      expect(transactionRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "CANCELLED", updated_by: "user-1" }),
      );
    },
  );

  it("should throw error when transaction is not found", async () => {
    vi.mocked(transactionRepository.findById!).mockResolvedValue(null);

    await expect(cancelTransaction.execute("txn-unknown", "user-1")).rejects.toThrow(
      "La transacción no existe.",
    );
  });

  it("should throw error when transaction status is COMPLETED", async () => {
    const txn = makeTransaction({ status: "COMPLETED" });
    vi.mocked(transactionRepository.findById!).mockResolvedValue(txn);

    await expect(cancelTransaction.execute("txn-1", "user-1")).rejects.toThrow(
      'No se puede cancelar una transacción en estado "COMPLETED".',
    );
  });
});
