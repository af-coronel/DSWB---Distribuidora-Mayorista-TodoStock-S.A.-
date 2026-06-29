import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditPurchaseOrder } from "./AuditPurchaseOrder.js";
import type { IOrderRepository } from "../../domain/index.js";
import type { IPaymentTransactionRepository } from "../../../transactions/domain/index.js";
import type { IOrder, IOrderItem } from "../../domain/index.js";
import type { IPaymentTransaction } from "../../../transactions/domain/index.js";
import type { CreateInventoryLot } from "../../../inventory/application/index.js";

function makeOrderItem(overrides?: Partial<IOrderItem>): IOrderItem {
  return {
    product_id: "prod-1",
    product_name: "Producto 1",
    quantity: 10,
    unit_price: 100,
    ...overrides,
  };
}

function makeMockOrder(overrides?: Partial<IOrder>): IOrder {
  return {
    id: "order-1",
    order_type: "PURCHASE" as const,
    status: "RECEIVED" as const,
    partner_cuit: "20-12345678-9",
    items: [makeOrderItem()],
    total_amount: 1000,
    created_by: "user-1",
    created_at: new Date("2025-06-01"),
    updated_by: "user-1",
    updated_at: new Date("2025-06-01"),
    ...overrides,
  };
}

function makeMockTransaction(overrides?: Partial<IPaymentTransaction>): IPaymentTransaction {
  return {
    id: "txn-1",
    order_id: "order-1",
    transaction_type: "PAYMENT",
    status: "VERIFIED",
    total_amount: 1000,
    items: [],
    created_by: "user-1",
    created_at: new Date("2025-06-01"),
    updated_by: "user-1",
    updated_at: new Date("2025-06-01"),
    ...overrides,
  };
}

describe("AuditPurchaseOrder", () => {
  let orderRepository: IOrderRepository;
  let transactionRepository: IPaymentTransactionRepository;
  let createInventoryLotUseCase: { execute: ReturnType<typeof vi.fn> };
  let auditPurchaseOrder: AuditPurchaseOrder;

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
    createInventoryLotUseCase = { execute: vi.fn() };
    auditPurchaseOrder = new AuditPurchaseOrder(
      orderRepository as IOrderRepository,
      createInventoryLotUseCase as unknown as CreateInventoryLot,
      transactionRepository as IPaymentTransactionRepository,
    );
  });

  it("should successfully audit a purchase order with all items received", async () => {
    const order = makeMockOrder();
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([makeMockTransaction()]);
    const now = new Date("2025-06-15");

    vi.useFakeTimers();
    vi.setSystemTime(now);

    await auditPurchaseOrder.execute("order-1", [
      { product_id: "prod-1", received_quantity: 10, expiration_date: null },
    ], "user-2");

    expect(orderRepository.findById).toHaveBeenCalledWith("order-1");
    expect(createInventoryLotUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: "prod-1",
        stock: 10,
        engaged_stock: 0,
        created_by: "user-2",
      }),
    );
    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PENDING_PAYMENT",
        total_amount: 1000,
      }),
    );
    expect(orderRepository.updateStatus).toHaveBeenCalledWith("order-1", "AUDITED", "user-2", now);

    vi.useRealTimers();
  });

  it("should throw error when order is not found", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(null);

    await expect(
      auditPurchaseOrder.execute("unknown", [], "user-1"),
    ).rejects.toThrow("La orden no existe.");
  });

  it("should throw error when order is not PURCHASE type", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(
      makeMockOrder({ order_type: "SALE" }),
    );

    await expect(
      auditPurchaseOrder.execute("order-1", [], "user-1"),
    ).rejects.toThrow("La orden no es de tipo compra.");
  });

  it("should throw error when order status is not RECEIVED", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(
      makeMockOrder({ status: "CONFIRMED" }),
    );

    await expect(
      auditPurchaseOrder.execute("order-1", [], "user-1"),
    ).rejects.toThrow('Se requiere estado RECEIVED.');
  });

  it("should throw error when product is not in the order", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(makeMockOrder());

    await expect(
      auditPurchaseOrder.execute("order-1", [
        { product_id: "prod-999", received_quantity: 5, expiration_date: null },
      ], "user-1"),
    ).rejects.toThrow('El producto "prod-999" no pertenece a esta orden de compra.');
  });

  it("should throw error when received_quantity is negative", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(makeMockOrder());

    await expect(
      auditPurchaseOrder.execute("order-1", [
        { product_id: "prod-1", received_quantity: -1, expiration_date: null },
      ], "user-1"),
    ).rejects.toThrow(
      'La cantidad recibida para el producto "prod-1" no puede ser negativa.',
    );
  });

  it("should throw error when received quantity exceeds ordered quantity", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(makeMockOrder());

    await expect(
      auditPurchaseOrder.execute("order-1", [
        { product_id: "prod-1", received_quantity: 15, expiration_date: null },
      ], "user-1"),
    ).rejects.toThrow(
      'supera la cantidad pedida',
    );
  });

  it("should accept partial quantities less than ordered", async () => {
    const order = makeMockOrder();
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([makeMockTransaction()]);

    await auditPurchaseOrder.execute("order-1", [
      { product_id: "prod-1", received_quantity: 7, expiration_date: null },
    ], "user-1");

    expect(createInventoryLotUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ stock: 7 }),
    );
    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ total_amount: 700 }),
    );
    expect(orderRepository.updateStatus).toHaveBeenCalled();
  });

  it("should not create inventory lot when received = 0", async () => {
    const order = makeMockOrder();
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([makeMockTransaction()]);

    await auditPurchaseOrder.execute("order-1", [
      { product_id: "prod-1", received_quantity: 0, expiration_date: null },
    ], "user-1");

    expect(createInventoryLotUseCase.execute).not.toHaveBeenCalled();
    expect(orderRepository.updateStatus).toHaveBeenCalled();
  });

  it("should default to ordered quantity when audit item is not provided for a product", async () => {
    const order = makeMockOrder({
      items: [makeOrderItem({ product_id: "prod-1", product_name: "Producto 1", quantity: 10 })],
    });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([makeMockTransaction()]);

    await auditPurchaseOrder.execute("order-1", [], "user-1");

    expect(createInventoryLotUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ stock: 10 }),
    );
    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ total_amount: 1000 }),
    );
  });

  it("should update the payment transaction when found", async () => {
    const order = makeMockOrder();
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([
      makeMockTransaction({ status: "TO_VERIFY" }),
    ]);

    await auditPurchaseOrder.execute("order-1", [
      { product_id: "prod-1", received_quantity: 10, expiration_date: null },
    ], "user-1");

    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PENDING_PAYMENT",
        total_amount: 1000,
      }),
    );
  });

  it("should still update order status when no payment transaction is found", async () => {
    const order = makeMockOrder();
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([]);

    await auditPurchaseOrder.execute("order-1", [
      { product_id: "prod-1", received_quantity: 10, expiration_date: null },
    ], "user-1");

    expect(transactionRepository.update).not.toHaveBeenCalled();
    expect(orderRepository.updateStatus).toHaveBeenCalledWith("order-1", "AUDITED", "user-1", expect.any(Date));
  });

  it("should handle multiple audit items for multiple order items", async () => {
    const order = makeMockOrder({
      items: [
        makeOrderItem({ product_id: "prod-1", product_name: "Producto 1", quantity: 10, unit_price: 100 }),
        makeOrderItem({ product_id: "prod-2", product_name: "Producto 2", quantity: 5, unit_price: 200 }),
      ],
    });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([makeMockTransaction()]);

    await auditPurchaseOrder.execute("order-1", [
      { product_id: "prod-1", received_quantity: 8, expiration_date: null },
      { product_id: "prod-2", received_quantity: 5, expiration_date: new Date("2026-01-01") },
    ], "user-1");

    expect(createInventoryLotUseCase.execute).toHaveBeenCalledTimes(2);
    expect(createInventoryLotUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: "prod-1", stock: 8 }),
    );
    expect(createInventoryLotUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: "prod-2", stock: 5, expiration_date: new Date("2026-01-01") }),
    );
    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ total_amount: 1800 }),
    );
  });
});
