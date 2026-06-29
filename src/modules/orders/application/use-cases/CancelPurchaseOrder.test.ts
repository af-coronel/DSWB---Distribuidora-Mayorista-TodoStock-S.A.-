import { describe, it, expect, vi, beforeEach } from "vitest";
import { CancelPurchaseOrder } from "./CancelPurchaseOrder.js";
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

describe("CancelPurchaseOrder", () => {
  let orderRepository: IOrderRepository;
  let transactionRepository: IPaymentTransactionRepository;
  let cancelTransactionUseCase: { execute: ReturnType<typeof vi.fn> };
  let cancelPurchaseOrder: CancelPurchaseOrder;

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

    cancelTransactionUseCase = { execute: vi.fn() };

    cancelPurchaseOrder = new CancelPurchaseOrder(
      orderRepository,
      transactionRepository,
      cancelTransactionUseCase as any,
    );
  });

  it.each(["TO_VERIFY_BUDGET", "PENDING_BUDGET", "TO_CONFIRM", "CONFIRMED"] as const)(
    "should cancel an order from %s status",
    async (status) => {
      const order = makeOrder({ status });

      vi.mocked(orderRepository.findById!).mockResolvedValue(order);
      vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([]);

      await cancelPurchaseOrder.execute("order-1", "user-1");

      expect(orderRepository.updateStatus).toHaveBeenCalledWith(
        "order-1",
        "CANCELLED",
        "user-1",
        expect.any(Date),
      );
    },
  );

  it("should cancel the associated verifiable transaction when it exists", async () => {
    const order = makeOrder({ status: "TO_VERIFY_BUDGET" });
    const txn = makeTransaction({ status: "VERIFIED" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([txn]);

    await cancelPurchaseOrder.execute("order-1", "user-1");

    expect(cancelTransactionUseCase.execute).toHaveBeenCalledWith("txn-1", "user-1");
  });

  it("should not cancel transaction when none is verifiable", async () => {
    const order = makeOrder({ status: "TO_CONFIRM" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([]);

    await cancelPurchaseOrder.execute("order-1", "user-1");

    expect(cancelTransactionUseCase.execute).not.toHaveBeenCalled();
  });

  it("should throw error when order is not found", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(null);

    await expect(
      cancelPurchaseOrder.execute("order-unknown", "user-1"),
    ).rejects.toThrow("La orden no existe.");
  });

  it("should throw error when order is not PURCHASE type", async () => {
    const order = makeOrder({ order_type: "SALE" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await expect(
      cancelPurchaseOrder.execute("order-1", "user-1"),
    ).rejects.toThrow("La orden no es de tipo compra.");
  });

  it("should throw error when order status is not cancellable", async () => {
    const order = makeOrder({ status: "RECEIVED" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await expect(
      cancelPurchaseOrder.execute("order-1", "user-1"),
    ).rejects.toThrow(
      'No se puede cancelar una orden en estado "RECEIVED".',
    );
  });
});
