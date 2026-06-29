import { describe, it, expect, vi, beforeEach } from "vitest";
import { VerifyPurchaseBudget } from "./VerifyPurchaseBudget.js";
import type { IOrderRepository } from "../../domain/index.js";
import type { IPaymentTransactionRepository } from "../../../transactions/domain/index.js";
import type { IOrder } from "../../domain/index.js";
import type { IPaymentTransaction } from "../../../transactions/domain/index.js";

const makeOrder = (overrides?: Partial<IOrder>): IOrder => ({
  id: "order-1",
  order_type: "PURCHASE",
  status: "TO_VERIFY_BUDGET",
  partner_cuit: "30-12345678-9",
  total_amount: 1500,
  items: [
    { product_id: "prod-1", product_name: "Product A", quantity: 2, unit_price: 500 },
  ],
  created_by: "user-1",
  created_at: new Date("2025-06-01"),
  updated_by: "user-1",
  updated_at: new Date("2025-06-01"),
  ...overrides,
});

const makeTransaction = (overrides?: Partial<IPaymentTransaction>): IPaymentTransaction => ({
  id: "txn-1",
  order_id: "order-1",
  transaction_type: "PAYMENT",
  status: "TO_VERIFY",
  total_amount: 1500,
  items: [],
  created_by: "user-1",
  created_at: new Date("2025-06-01"),
  updated_by: "user-1",
  updated_at: new Date("2025-06-01"),
  ...overrides,
});

describe("VerifyPurchaseBudget", () => {
  let orderRepository: IOrderRepository;
  let transactionRepository: IPaymentTransactionRepository;
  let verifyPurchaseBudget: VerifyPurchaseBudget;

  beforeEach(() => {
    vi.clearAllMocks();

    orderRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByOrderType: vi.fn(),
      findByPartnerCuit: vi.fn(),
      updateStatus: vi.fn(),
      updateTotalAmount: vi.fn(),
    };

    transactionRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByOrderId: vi.fn(),
      findLatestDocumentNumberByType: vi.fn(),
      update: vi.fn(),
    };

    verifyPurchaseBudget = new VerifyPurchaseBudget(
      orderRepository,
      transactionRepository,
    );
  });

  it("should verify budget from TO_VERIFY_BUDGET status", async () => {
    const order = makeOrder({ status: "TO_VERIFY_BUDGET" });
    const txn = makeTransaction({ status: "TO_VERIFY" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([txn]);

    await verifyPurchaseBudget.execute("order-1", "user-1");

    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "VERIFIED", updated_by: "user-1" }),
    );
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1",
      "TO_CONFIRM",
      "user-1",
      expect.any(Date),
    );
  });

  it("should verify budget from PENDING_BUDGET status", async () => {
    const order = makeOrder({ status: "PENDING_BUDGET" });
    const txn = makeTransaction({ status: "PENDING" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([txn]);

    await verifyPurchaseBudget.execute("order-1", "user-1");

    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "VERIFIED" }),
    );
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1",
      "TO_CONFIRM",
      "user-1",
      expect.any(Date),
    );
  });

  it("should throw error when order is not found", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(null);

    await expect(
      verifyPurchaseBudget.execute("order-unknown", "user-1"),
    ).rejects.toThrow("La orden no existe.");
  });

  it("should throw error when order is not PURCHASE type", async () => {
    const order = makeOrder({ order_type: "SALE" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await expect(
      verifyPurchaseBudget.execute("order-1", "user-1"),
    ).rejects.toThrow("La orden no es de tipo compra.");
  });

  it("should throw error when order status is not verifiable", async () => {
    const order = makeOrder({ status: "CONFIRMED" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await expect(
      verifyPurchaseBudget.execute("order-1", "user-1"),
    ).rejects.toThrow(
      'No se puede verificar presupuesto para una orden en estado "CONFIRMED".',
    );
  });

  it("should throw error when no verifiable payment transaction exists", async () => {
    const order = makeOrder({ status: "TO_VERIFY_BUDGET" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([]);

    await expect(
      verifyPurchaseBudget.execute("order-1", "user-1"),
    ).rejects.toThrow(
      "No existe una orden de pago en estado verificable para esta orden de compra.",
    );
  });
});
