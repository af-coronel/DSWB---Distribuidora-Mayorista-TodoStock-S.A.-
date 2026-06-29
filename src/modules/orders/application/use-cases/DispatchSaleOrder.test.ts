import { describe, it, expect, vi, beforeEach } from "vitest";
import { DispatchSaleOrder } from "./DispatchSaleOrder.js";
import type { IOrderRepository } from "../../domain/index.js";
import type { IOrder } from "../../domain/index.js";

function makeMockOrder(overrides?: Partial<IOrder>): IOrder {
  return {
    id: "order-1",
    order_type: "SALE" as const,
    status: "PENDING_ASSEMBLY" as const,
    partner_cuit: "20-12345678-9",
    items: [],
    total_amount: 1000,
    created_by: "user-1",
    created_at: new Date("2025-06-01"),
    updated_by: "user-1",
    updated_at: new Date("2025-06-01"),
    ...overrides,
  };
}

describe("DispatchSaleOrder", () => {
  let orderRepository: IOrderRepository;
  let dispatchSaleOrder: DispatchSaleOrder;

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
    dispatchSaleOrder = new DispatchSaleOrder(orderRepository as IOrderRepository);
  });

  it("should dispatch from PENDING_ASSEMBLY to DISPATCHING", async () => {
    const order = makeMockOrder();
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await dispatchSaleOrder.execute("order-1", "user-1");

    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1", "DISPATCHING", "user-1", expect.any(Date),
    );
  });

  it("should throw error when order is not found", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(null);

    await expect(dispatchSaleOrder.execute("unknown", "user-1")).rejects.toThrow(
      "La orden no existe.",
    );
  });

  it("should throw error when order is not SALE type", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(
      makeMockOrder({ order_type: "PURCHASE" }),
    );

    await expect(dispatchSaleOrder.execute("order-1", "user-1")).rejects.toThrow(
      "La orden no es de tipo venta.",
    );
  });

  it("should throw error when order status is not PENDING_ASSEMBLY", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(
      makeMockOrder({ status: "DELIVERED" }),
    );

    await expect(dispatchSaleOrder.execute("order-1", "user-1")).rejects.toThrow(
      'No se puede despachar una orden en estado "DELIVERED".',
    );
  });
});
