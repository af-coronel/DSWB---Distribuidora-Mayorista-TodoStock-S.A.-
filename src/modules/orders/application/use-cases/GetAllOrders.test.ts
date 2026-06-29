import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetAllOrders } from "./GetAllOrders.js";
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

describe("GetAllOrders", () => {
  let orderRepository: IOrderRepository;
  let getAllOrders: GetAllOrders;

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
    getAllOrders = new GetAllOrders(orderRepository as IOrderRepository);
  });

  it("should return all orders when no type is provided", async () => {
    const orders = [makeMockOrder(), makeMockOrder({ id: "order-2" })];
    vi.mocked(orderRepository.findAll!).mockResolvedValue(orders);

    const result = await getAllOrders.execute();

    expect(result).toEqual(orders);
    expect(orderRepository.findAll).toHaveBeenCalledOnce();
    expect(orderRepository.findByOrderType).not.toHaveBeenCalled();
  });

  it("should filter by order type when provided", async () => {
    const orders = [makeMockOrder()];
    vi.mocked(orderRepository.findByOrderType!).mockResolvedValue(orders);

    const result = await getAllOrders.execute("SALE");

    expect(result).toEqual(orders);
    expect(orderRepository.findByOrderType).toHaveBeenCalledWith("SALE");
    expect(orderRepository.findAll).not.toHaveBeenCalled();
  });

  it("should filter by PURCHASE type", async () => {
    const orders = [makeMockOrder({ order_type: "PURCHASE" })];
    vi.mocked(orderRepository.findByOrderType!).mockResolvedValue(orders);

    const result = await getAllOrders.execute("PURCHASE");

    expect(result).toEqual(orders);
    expect(orderRepository.findByOrderType).toHaveBeenCalledWith("PURCHASE");
  });

  it("should return empty array when no orders exist", async () => {
    vi.mocked(orderRepository.findAll!).mockResolvedValue([]);

    const result = await getAllOrders.execute();

    expect(result).toEqual([]);
  });
});
