import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfirmPurchaseOrder } from "./ConfirmPurchaseOrder.js";
import type { IOrderRepository } from "../../domain/index.js";
import type { IOrder } from "../../domain/index.js";

const makeOrder = (overrides?: Partial<IOrder>): IOrder => ({
  id: "order-1",
  order_type: "PURCHASE",
  status: "TO_CONFIRM",
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

describe("ConfirmPurchaseOrder", () => {
  let orderRepository: IOrderRepository;
  let confirmPurchaseOrder: ConfirmPurchaseOrder;

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

    confirmPurchaseOrder = new ConfirmPurchaseOrder(orderRepository);
  });

  it("should confirm an order from TO_CONFIRM to CONFIRMED", async () => {
    const order = makeOrder({ status: "TO_CONFIRM" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await confirmPurchaseOrder.execute("order-1", "user-1");

    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1",
      "CONFIRMED",
      "user-1",
      expect.any(Date),
    );
  });

  it("should throw error when order is not found", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(null);

    await expect(
      confirmPurchaseOrder.execute("order-unknown", "user-1"),
    ).rejects.toThrow("La orden no existe.");
  });

  it("should throw error when order is not PURCHASE type", async () => {
    const order = makeOrder({ order_type: "SALE" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await expect(
      confirmPurchaseOrder.execute("order-1", "user-1"),
    ).rejects.toThrow("La orden no es de tipo compra.");
  });

  it("should throw error when order status is not TO_CONFIRM", async () => {
    const order = makeOrder({ status: "TO_VERIFY_BUDGET" });

    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await expect(
      confirmPurchaseOrder.execute("order-1", "user-1"),
    ).rejects.toThrow(
      'No se puede confirmar una orden en estado "TO_VERIFY_BUDGET". Se requiere estado TO_CONFIRM.',
    );
  });
});
