import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetTransactionById } from "./GetTransactionById.js";
import type { IPaymentTransactionRepository } from "../../domain/index.js";
import type { IPaymentTransaction } from "../../domain/index.js";

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

describe("GetTransactionById", () => {
  let transactionRepository: IPaymentTransactionRepository;
  let getTransactionById: GetTransactionById;

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
    getTransactionById = new GetTransactionById(transactionRepository);
  });

  it("should return the transaction when found", async () => {
    const txn = makeTransaction();
    vi.mocked(transactionRepository.findById!).mockResolvedValue(txn);

    const result = await getTransactionById.execute("txn-1");

    expect(result).toEqual(txn);
    expect(transactionRepository.findById).toHaveBeenCalledWith("txn-1");
  });

  it("should throw error when transaction is not found", async () => {
    vi.mocked(transactionRepository.findById!).mockResolvedValue(null);

    await expect(getTransactionById.execute("txn-unknown")).rejects.toThrow(
      "La transacción no existe.",
    );
  });
});
