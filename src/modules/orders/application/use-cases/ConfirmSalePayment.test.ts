import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfirmSalePayment } from "./ConfirmSalePayment.js";
import type { IOrderRepository } from "../../domain/index.js";
import type { IPaymentTransactionRepository } from "../../../transactions/domain/index.js";
import type { IOrder, IOrderItem } from "../../domain/index.js";
import type { IPaymentTransaction } from "../../../transactions/domain/index.js";
import type { ConfirmSale } from "../../../inventory/application/index.js";

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

function makeMockTransaction(overrides?: Partial<IPaymentTransaction>): IPaymentTransaction {
  return {
    id: "txn-1",
    order_id: "order-1",
    transaction_type: "COLLECTION",
    status: "PENDING",
    created_by: "user-1",
    created_at: new Date("2025-06-01"),
    updated_by: "user-1",
    updated_at: new Date("2025-06-01"),
    ...overrides,
  };
}

describe("ConfirmSalePayment", () => {
  let orderRepository: IOrderRepository;
  let transactionRepository: IPaymentTransactionRepository;
  let confirmSaleUseCase: { execute: ReturnType<typeof vi.fn> };
  let confirmSalePayment: ConfirmSalePayment;

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
    confirmSaleUseCase = { execute: vi.fn() };
    confirmSalePayment = new ConfirmSalePayment(
      orderRepository as IOrderRepository,
      confirmSaleUseCase as unknown as ConfirmSale,
      transactionRepository as IPaymentTransactionRepository,
    );
  });

  it("should confirm payment successfully", async () => {
    const order = makeMockOrder();
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([
      makeMockTransaction(),
    ]);
    vi.mocked(transactionRepository.findLatestDocumentNumberByType!).mockResolvedValue("00000005");

    await confirmSalePayment.execute("order-1", "user-1");

    expect(confirmSaleUseCase.execute).toHaveBeenCalledWith("prod-1", 2, "user-1");
    expect(transactionRepository.findLatestDocumentNumberByType).toHaveBeenCalledWith(
      "COLLECTION",
      "0001",
    );
    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "COMPLETED",
        pos_number: "0001",
        document_number: "00000006",
      }),
    );
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1",
      "PENDING_ASSEMBLY",
      "user-1",
      expect.any(Date),
    );
  });

  it("should throw error when order is not found", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(null);

    await expect(confirmSalePayment.execute("unknown", "user-1")).rejects.toThrow(
      "La orden no existe.",
    );
  });

  it("should throw error when order is not SALE type", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(
      makeMockOrder({ order_type: "PURCHASE" }),
    );

    await expect(confirmSalePayment.execute("order-1", "user-1")).rejects.toThrow(
      "La orden no es de tipo venta.",
    );
  });

  it("should throw error when order status is not TO_VERIFY_COLLECTION or PENDING_PAYMENT", async () => {
    vi.mocked(orderRepository.findById!).mockResolvedValue(
      makeMockOrder({ status: "DELIVERED" }),
    );

    await expect(confirmSalePayment.execute("order-1", "user-1")).rejects.toThrow(
      'No se puede confirmar el pago de una orden en estado "DELIVERED".',
    );
  });

  it("should still update order status when no pending collection transaction exists", async () => {
    const order = makeMockOrder();
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([]);

    await confirmSalePayment.execute("order-1", "user-1");

    expect(confirmSaleUseCase.execute).toHaveBeenCalled();
    expect(transactionRepository.update).not.toHaveBeenCalled();
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1", "PENDING_ASSEMBLY", "user-1", expect.any(Date),
    );
  });

  it("should handle PENDING_PAYMENT status as valid", async () => {
    const order = makeMockOrder({ status: "PENDING_PAYMENT" });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([
      makeMockTransaction({ status: "PENDING" }),
    ]);
    vi.mocked(transactionRepository.findLatestDocumentNumberByType!).mockResolvedValue("00000005");

    await confirmSalePayment.execute("order-1", "user-1");

    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1", "PENDING_ASSEMBLY", "user-1", expect.any(Date),
    );
  });

  describe("getNextDocumentNumber", () => {
    it("should increment from 00000005 to 00000006", async () => {
      const order = makeMockOrder();
      vi.mocked(orderRepository.findById!).mockResolvedValue(order);
      vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([
        makeMockTransaction(),
      ]);
      vi.mocked(transactionRepository.findLatestDocumentNumberByType!).mockResolvedValue("00000005");

      await confirmSalePayment.execute("order-1", "user-1");

      expect(transactionRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ document_number: "00000006" }),
      );
    });

    it("should start from 00000001 when last document number is null", async () => {
      const order = makeMockOrder();
      vi.mocked(orderRepository.findById!).mockResolvedValue(order);
      vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([
        makeMockTransaction(),
      ]);
      vi.mocked(transactionRepository.findLatestDocumentNumberByType!).mockResolvedValue(null);

      await confirmSalePayment.execute("order-1", "user-1");

      expect(transactionRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ document_number: "00000001" }),
      );
    });

    it("should start from 00000001 when last document number is 0", async () => {
      const order = makeMockOrder();
      vi.mocked(orderRepository.findById!).mockResolvedValue(order);
      vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([
        makeMockTransaction(),
      ]);
      vi.mocked(transactionRepository.findLatestDocumentNumberByType!).mockResolvedValue("0");

      await confirmSalePayment.execute("order-1", "user-1");

      expect(transactionRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ document_number: "00000001" }),
      );
    });

    it("should start from 00000001 when last document number is not a valid number", async () => {
      const order = makeMockOrder();
      vi.mocked(orderRepository.findById!).mockResolvedValue(order);
      vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([
        makeMockTransaction(),
      ]);
      vi.mocked(transactionRepository.findLatestDocumentNumberByType!).mockResolvedValue("abc");

      await confirmSalePayment.execute("order-1", "user-1");

      expect(transactionRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ document_number: "00000001" }),
      );
    });
  });

  it("should call confirm sale for each item in order", async () => {
    const order = makeMockOrder({
      items: [
        makeOrderItem({ product_id: "prod-1", quantity: 2 }),
        makeOrderItem({ product_id: "prod-2", quantity: 3 }),
      ],
    });
    vi.mocked(orderRepository.findById!).mockResolvedValue(order);
    vi.mocked(transactionRepository.findByOrderId!).mockResolvedValue([
      makeMockTransaction(),
    ]);
    vi.mocked(transactionRepository.findLatestDocumentNumberByType!).mockResolvedValue("00000005");

    await confirmSalePayment.execute("order-1", "user-1");

    expect(confirmSaleUseCase.execute).toHaveBeenCalledTimes(2);
    expect(confirmSaleUseCase.execute).toHaveBeenCalledWith("prod-1", 2, "user-1");
    expect(confirmSaleUseCase.execute).toHaveBeenCalledWith("prod-2", 3, "user-1");
  });
});
