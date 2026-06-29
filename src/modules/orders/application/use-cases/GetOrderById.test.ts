import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetOrderById } from "./GetOrderById.js";
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

describe("GetOrderById", () => {
  let orderRepository: IOrderRepository;
  let getOrderById: GetOrderById;

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
    getOrderById = new GetOrderById(orderRepository as IOrderRepository);
  });

  it("should return order when found", async () => {
    const order = makeMockOrder();
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    const result = await getOrderById.execute("order-1");

    expect(result).toEqual(order);
    expect(orderRepository.findById).toHaveBeenCalledWith("order-1");
  });

  it("should throw error when orderId is empty", async () => {
    await expect(getOrderById.execute("")).rejects.toThrow(
      "El ID de la orden es obligatorio.",
    );
    await expect(getOrderById.execute("   ")).rejects.toThrow(
      "El ID de la orden es obligatorio.",
    );
  });

  it("should throw error when order is not found", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(null);

    await expect(getOrderById.execute("unknown")).rejects.toThrow(
      "La orden no existe.",
    );
  });
});
