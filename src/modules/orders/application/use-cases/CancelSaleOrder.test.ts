import { describe, it, expect, vi, beforeEach } from "vitest";
import { CancelSaleOrder } from "./CancelSaleOrder.js";
import type { IOrderRepository } from "../../domain/index.js";
import type { IOrder, IOrderItem } from "../../domain/index.js";
import type { ReleaseReservedStock } from "../../../inventory/application/index.js";

function makeOrderItem(overrides?: Partial<IOrderItem>): IOrderItem {
  return {
    product_id: "prod-1",
    product_name: "Producto 1",
    quantity: 2,
    unit_price: 500,
    ...overrides,
  };
}

function makeMockOrder(overrides?: Partial<IOrder>): IOrder {
  return {
    id: "order-1",
    order_type: "SALE" as const,
    status: "TO_VERIFY_COLLECTION" as const,
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

describe("CancelSaleOrder", () => {
  let orderRepository: IOrderRepository;
  let releaseReservedStockUseCase: { execute: ReturnType<typeof vi.fn> };
  let cancelSaleOrder: CancelSaleOrder;

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
    releaseReservedStockUseCase = { execute: vi.fn() };
    cancelSaleOrder = new CancelSaleOrder(
      orderRepository as IOrderRepository,
      releaseReservedStockUseCase as unknown as ReleaseReservedStock,
    );
  });

  it("should cancel from TO_VERIFY_COLLECTION and release reserved stock", async () => {
    const order = makeMockOrder({ status: "TO_VERIFY_COLLECTION" });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await cancelSaleOrder.execute("order-1", "user-1");

    expect(releaseReservedStockUseCase.execute).toHaveBeenCalledWith("prod-1", 2, "user-1");
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1", "CANCELLED", "user-1", expect.any(Date),
    );
  });

  it("should cancel from PENDING_PAYMENT and release reserved stock", async () => {
    const order = makeMockOrder({ status: "PENDING_PAYMENT" });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await cancelSaleOrder.execute("order-1", "user-1");

    expect(releaseReservedStockUseCase.execute).toHaveBeenCalledWith("prod-1", 2, "user-1");
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1", "CANCELLED", "user-1", expect.any(Date),
    );
  });

  it("should cancel from PENDING_ASSEMBLY without releasing stock", async () => {
    const order = makeMockOrder({ status: "PENDING_ASSEMBLY" });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await cancelSaleOrder.execute("order-1", "user-1");

    expect(releaseReservedStockUseCase.execute).not.toHaveBeenCalled();
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1", "CANCELLED", "user-1", expect.any(Date),
    );
  });

  it("should cancel from DISPATCHING without releasing stock", async () => {
    const order = makeMockOrder({ status: "DISPATCHING" });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await cancelSaleOrder.execute("order-1", "user-1");

    expect(releaseReservedStockUseCase.execute).not.toHaveBeenCalled();
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1", "CANCELLED", "user-1", expect.any(Date),
    );
  });

  it("should release stock for each item when cancelling", async () => {
    const order = makeMockOrder({
      status: "TO_VERIFY_COLLECTION",
      items: [
        makeOrderItem({ product_id: "prod-1", quantity: 2 }),
        makeOrderItem({ product_id: "prod-2", quantity: 3 }),
      ],
    });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);

    await cancelSaleOrder.execute("order-1", "user-1");

    expect(releaseReservedStockUseCase.execute).toHaveBeenCalledTimes(2);
    expect(releaseReservedStockUseCase.execute).toHaveBeenCalledWith("prod-1", 2, "user-1");
    expect(releaseReservedStockUseCase.execute).toHaveBeenCalledWith("prod-2", 3, "user-1");
  });

  it("should throw error when order is not found", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(null);

    await expect(cancelSaleOrder.execute("unknown", "user-1")).rejects.toThrow(
      "La orden no existe.",
    );
  });

  it("should throw error when order is not SALE type", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(
      makeMockOrder({ order_type: "PURCHASE" }),
    );

    await expect(cancelSaleOrder.execute("order-1", "user-1")).rejects.toThrow(
      "La orden no es de tipo venta.",
    );
  });

  it("should throw error when status is not cancellable (DELIVERED)", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(
      makeMockOrder({ status: "DELIVERED" }),
    );

    await expect(cancelSaleOrder.execute("order-1", "user-1")).rejects.toThrow(
      'No se puede cancelar una orden en estado "DELIVERED".',
    );
  });
});
