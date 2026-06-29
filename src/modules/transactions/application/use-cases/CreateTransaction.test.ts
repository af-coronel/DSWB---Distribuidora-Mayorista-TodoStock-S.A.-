import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateTransaction } from "./CreateTransaction.js";
import type { IOrderRepository } from "../../../orders/domain/index.js";
import type { IPaymentTransactionRepository } from "../../domain/index.js";
import type { IPaymentTransaction, TransactionType } from "../../domain/index.js";
import type { IOrder } from "../../../orders/domain/index.js";

const makeOrder = (overrides?: Partial<IOrder>): IOrder => ({
  id: "order-1",
  order_type: "PURCHASE",
  status: "CONFIRMED",
  partner_cuit: "30-12345678-9",
  total_amount: 1500,
  items: [
    { product_id: "prod-1", product_name: "Product A", quantity: 2, unit_price: 500 },
    { product_id: "prod-2", product_name: "Product B", quantity: 1, unit_price: 500 },
  ],
  created_by: "user-1",
  created_at: new Date("2025-06-01"),
  updated_by: "user-1",
  updated_at: new Date("2025-06-01"),
  ...overrides,
});

describe("CreateTransaction", () => {
  let transactionRepository: IPaymentTransactionRepository;
  let orderRepository: IOrderRepository;
  let createTransaction: CreateTransaction;

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

    orderRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByOrderType: vi.fn(),
      findByPartnerCuit: vi.fn(),
      updateStatus: vi.fn(),
      updateTotalAmount: vi.fn(),
    };

    createTransaction = new CreateTransaction(transactionRepository, orderRepository);
  });

  it("should create a PAYMENT transaction for a purchase order with status TO_VERIFY", async () => {
    const order = makeOrder({ order_type: "PURCHASE" });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.save!).mockImplementation(async (t) => t as IPaymentTransaction);

    const result = await createTransaction.execute("order-1", "PAYMENT" as TransactionType, "user-1");

    expect(result.order_id).toBe("order-1");
    expect(result.transaction_type).toBe("PAYMENT");
    expect(result.status).toBe("TO_VERIFY");
    expect(result.created_by).toBe("user-1");
  });

  it("should create a COLLECTION transaction for a sale order with status PENDING", async () => {
    const order = makeOrder({ order_type: "SALE" });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.save!).mockImplementation(async (t) => t as IPaymentTransaction);

    const result = await createTransaction.execute("order-1", "COLLECTION" as TransactionType, "user-1");

    expect(result.order_id).toBe("order-1");
    expect(result.transaction_type).toBe("COLLECTION");
    expect(result.status).toBe("PENDING");
    expect(result.created_by).toBe("user-1");
  });

  it("should throw error when orderId is empty", async () => {
    await expect(
      createTransaction.execute("", "PAYMENT" as TransactionType, "user-1"),
    ).rejects.toThrow("El ID de la orden es obligatorio.");

    await expect(
      createTransaction.execute("   ", "PAYMENT" as TransactionType, "user-1"),
    ).rejects.toThrow("El ID de la orden es obligatorio.");
  });

  it("should throw error when order is not found", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(null);

    await expect(
      createTransaction.execute("order-unknown", "PAYMENT" as TransactionType, "user-1"),
    ).rejects.toThrow("La orden indicada no existe.");
  });

  it("should throw error when PAYMENT is used on a non-purchase order", async () => {
    const order = makeOrder({ order_type: "SALE" });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await expect(
      createTransaction.execute("order-1", "PAYMENT" as TransactionType, "user-1"),
    ).rejects.toThrow("Una orden de pago solo puede asociarse a una orden de compra.");
  });

  it("should throw error when COLLECTION is used on a non-sale order", async () => {
    const order = makeOrder({ order_type: "PURCHASE" });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await expect(
      createTransaction.execute("order-1", "COLLECTION" as TransactionType, "user-1"),
    ).rejects.toThrow("Una orden de cobro solo puede asociarse a una orden de venta.");
  });

  it("should map order items to transaction items correctly", async () => {
    const order = makeOrder({
      order_type: "PURCHASE",
      items: [
        { product_id: "p1", product_name: "Alpha", quantity: 3, unit_price: 100 },
        { product_id: "p2", product_name: "Beta", quantity: 5, unit_price: 200 },
      ],
    });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.save!).mockImplementation(async (t) => t as IPaymentTransaction);

    const result = await createTransaction.execute("order-1", "PAYMENT" as TransactionType, "user-1");

    expect(result.items).toEqual([
      { product_id: "p1", product_name: "Alpha", quantity: 3, unit_price: 100 },
      { product_id: "p2", product_name: "Beta", quantity: 5, unit_price: 200 },
    ]);
    expect(result.total_amount).toBe(1500);
  });
});
