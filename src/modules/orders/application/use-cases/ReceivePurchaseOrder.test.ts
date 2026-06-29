import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReceivePurchaseOrder } from "./ReceivePurchaseOrder.js";
import type { IOrderRepository } from "../../domain/index.js";
import type { IOrder } from "../../domain/index.js";

const makeOrder = (overrides?: Partial<IOrder>): IOrder => ({
  id: "order-1",
  order_type: "PURCHASE",
  status: "CONFIRMED",
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

describe("ReceivePurchaseOrder", () => {
  let orderRepository: IOrderRepository;
  let receivePurchaseOrder: ReceivePurchaseOrder;

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

    receivePurchaseOrder = new ReceivePurchaseOrder(orderRepository);
  });

  it("should mark a CONFIRMED order as RECEIVED", async () => {
    const order = makeOrder({ status: "CONFIRMED" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await receivePurchaseOrder.execute("order-1", "user-1");

    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1",
      "RECEIVED",
      "user-1",
      expect.any(Date),
    );
  });

  it("should throw error when order is not found", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(null);

    await expect(
      receivePurchaseOrder.execute("order-unknown", "user-1"),
    ).rejects.toThrow("La orden no existe.");
  });

  it("should throw error when order is not PURCHASE type", async () => {
    const order = makeOrder({ order_type: "SALE" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await expect(
      receivePurchaseOrder.execute("order-1", "user-1"),
    ).rejects.toThrow("La orden no es de tipo compra.");
  });

  it("should throw error when order status is not CONFIRMED", async () => {
    const order = makeOrder({ status: "TO_CONFIRM" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await expect(
      receivePurchaseOrder.execute("order-1", "user-1"),
    ).rejects.toThrow(
      'No se puede marcar como recibida una orden en estado "TO_CONFIRM". Se requiere estado CONFIRMED.',
    );
  });
});
