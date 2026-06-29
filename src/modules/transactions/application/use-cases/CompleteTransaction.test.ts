import { describe, it, expect, vi, beforeEach } from "vitest";
import { CompleteTransaction } from "./CompleteTransaction.js";
import type { IPaymentTransactionRepository } from "../../domain/index.js";
import type { IPaymentTransaction, TransactionType, TransactionStatus } from "../../domain/index.js";

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

describe("CompleteTransaction", () => {
  let transactionRepository: IPaymentTransactionRepository;
  let completeTransaction: CompleteTransaction;

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
    completeTransaction = new CompleteTransaction(transactionRepository);
  });

  it("should complete a PAYMENT transaction from PENDING_PAYMENT status", async () => {
    const txn = makeTransaction({ transaction_type: "PAYMENT", status: "PENDING_PAYMENT" });
    vi.mocked(transactionRepository.findById!).mockResolvedValue(txn);

    await completeTransaction.execute("txn-1", "user-1");

    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "COMPLETED", updated_by: "user-1" }),
    );
  });

  it("should complete a PAYMENT transaction from PENDING status", async () => {
    const txn = makeTransaction({ transaction_type: "PAYMENT", status: "PENDING" });
    vi.mocked(transactionRepository.findById!).mockResolvedValue(txn);

    await completeTransaction.execute("txn-1", "user-1");

    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "COMPLETED" }),
    );
  });

  it("should complete a COLLECTION transaction from TO_VERIFY status", async () => {
    const txn = makeTransaction({ transaction_type: "COLLECTION", status: "TO_VERIFY" });
    vi.mocked(transactionRepository.findById!).mockResolvedValue(txn);

    await completeTransaction.execute("txn-1", "user-1");

    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "COMPLETED" }),
    );
  });

  it("should complete a COLLECTION transaction from PENDING status", async () => {
    const txn = makeTransaction({ transaction_type: "COLLECTION", status: "PENDING" });
    vi.mocked(transactionRepository.findById!).mockResolvedValue(txn);

    await completeTransaction.execute("txn-1", "user-1");

    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "COMPLETED" }),
    );
  });

  it("should throw error when transaction is not found", async () => {
    vi.mocked(transactionRepository.findById!).mockResolvedValue(null);

    await expect(completeTransaction.execute("txn-unknown", "user-1")).rejects.toThrow(
      "La transacción no existe.",
    );
  });

  it("should throw error when status is not completable", async () => {
    const txn = makeTransaction({ status: "CANCELLED" });
    vi.mocked(transactionRepository.findById!).mockResolvedValue(txn);

    await expect(completeTransaction.execute("txn-1", "user-1")).rejects.toThrow(
      'No se puede completar una transacción en estado "CANCELLED".',
    );
  });

  it("should include optional posNumber and documentNumber when provided", async () => {
    const txn = makeTransaction({ transaction_type: "PAYMENT", status: "PENDING" });
    vi.mocked(transactionRepository.findById!).mockResolvedValue(txn);

    await completeTransaction.execute("txn-1", "user-1", "POS-001", "DOC-001");

    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ pos_number: "POS-001", document_number: "DOC-001" }),
    );
  });

  it("should skip posNumber and documentNumber when not provided", async () => {
    const txn = makeTransaction({ transaction_type: "PAYMENT", status: "PENDING" });
    vi.mocked(transactionRepository.findById!).mockResolvedValue(txn);

    await completeTransaction.execute("txn-1", "user-1");

    const updateCall = vi.mocked(transactionRepository.update!).mock.calls[0]![0]!;
    expect(updateCall.pos_number).toBeUndefined();
    expect(updateCall.document_number).toBeUndefined();
  });
});
