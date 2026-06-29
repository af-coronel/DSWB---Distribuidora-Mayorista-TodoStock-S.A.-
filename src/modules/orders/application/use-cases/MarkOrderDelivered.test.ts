import { describe, it, expect, vi, beforeEach } from "vitest";
import { MarkOrderDelivered } from "./MarkOrderDelivered.js";
import type { IOrderRepository } from "../../domain/index.js";
import type { IOrder } from "../../domain/index.js";

function makeMockOrder(overrides?: Partial<IOrder>): IOrder {
  return {
    id: "order-1",
    order_type: "SALE" as const,
    status: "DISPATCHING" as const,
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

describe("MarkOrderDelivered", () => {
  let orderRepository: IOrderRepository;
  let markOrderDelivered: MarkOrderDelivered;

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
    markOrderDelivered = new MarkOrderDelivered(orderRepository as IOrderRepository);
  });

  it("should mark as delivered from DISPATCHING to DELIVERED", async () => {
    const order = makeMockOrder();
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await markOrderDelivered.execute("order-1", "user-1");

    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1", "DELIVERED", "user-1", expect.any(Date),
    );
  });

  it("should throw error when order is not found", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(null);

    await expect(markOrderDelivered.execute("unknown", "user-1")).rejects.toThrow(
      "La orden no existe.",
    );
  });

  it("should throw error when order is not SALE type", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(
      makeMockOrder({ order_type: "PURCHASE" }),
    );

    await expect(markOrderDelivered.execute("order-1", "user-1")).rejects.toThrow(
      "La orden no es de tipo venta.",
    );
  });

  it("should throw error when order status is not DISPATCHING", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(
      makeMockOrder({ status: "PENDING_ASSEMBLY" }),
    );

    await expect(markOrderDelivered.execute("order-1", "user-1")).rejects.toThrow(
      'No se puede marcar como entregada una orden en estado "PENDING_ASSEMBLY".',
    );
  });
});
