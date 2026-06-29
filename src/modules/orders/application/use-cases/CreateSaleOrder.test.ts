import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateSaleOrder } from "./CreateSaleOrder.js";
import type { IOrderRepository } from "../../domain/index.js";
import type { IBusinessPartnerRepository } from "../../../business-partner/domain/index.js";
import type { IProductRepository } from "../../../products/domain/index.js";
import type { IBusinessPartner } from "../../../business-partner/domain/index.js";
import type { IProduct } from "../../../products/domain/index.js";

const makeClient = (overrides?: Partial<IBusinessPartner>): IBusinessPartner => ({
  cuit: "30-12345678-9",
  legal_name: "Client Corp",
  phone: "123456789",
  email: "client@test.com",
  legal_address: "Street 123",
  active: true,
  vat_condition: "RESPONSABLE_INSCRIPTO",
  type: ["CLIENT"],
  created_by: "user-1",
  created_at: new Date("2025-06-01"),
  updated_by: "user-1",
  updated_at: new Date("2025-06-01"),
  ...overrides,
});

const makeProduct = (overrides?: Partial<IProduct>): IProduct => ({
  id: "prod-1",
  name: "Product A",
  vendor_cuit: "30-11111111-1",
  vendor_price: 500,
  customer_price: 700,
  category: "General",
  created_by: "user-1",
  created_at: new Date("2025-06-01"),
  updated_by: "user-1",
  updated_at: new Date("2025-06-01"),
  ...overrides,
});

describe("CreateSaleOrder", () => {
  let orderRepository: IOrderRepository;
  let partnerRepository: IBusinessPartnerRepository;
  let productRepository: IProductRepository;
  let reserveStockUseCase: { execute: ReturnType<typeof vi.fn> };
  let createTransactionUseCase: { execute: ReturnType<typeof vi.fn> };
  let createSaleOrder: CreateSaleOrder;

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

    partnerRepository = {
      save: vi.fn(),
      findByCuit: vi.fn(),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };

    productRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn(),
    };

    reserveStockUseCase = { execute: vi.fn() };
    createTransactionUseCase = { execute: vi.fn() };

    createSaleOrder = new CreateSaleOrder(
      orderRepository,
      partnerRepository,
      productRepository,
      reserveStockUseCase as any,
      createTransactionUseCase as any,
    );
  });

  it("should create a sale order with valid data", async () => {
    const client = makeClient();
    const product = makeProduct();

    vi.mocked(partnerRepository.findByCuit!).mockResolvedValue(client);
    vi.mocked(productRepository.findById!).mockResolvedValue(product);
    vi.mocked(orderRepository.save!).mockImplementation(async (order) => ({
      ...order,
      id: "sale-order-1",
    }));

    const result = await createSaleOrder.execute(
      "30-12345678-9",
      [{ product_id: "prod-1", quantity: 3 }],
      "user-1",
    );

    expect(result.order_type).toBe("SALE");
    expect(result.status).toBe("TO_VERIFY_COLLECTION");
    expect(result.partner_cuit).toBe("30-12345678-9");
    expect(result.total_amount).toBe(2100);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.unit_price).toBe(700);
  });

  it("should throw error when partner CUIT is empty", async () => {
    await expect(
      createSaleOrder.execute("", [{ product_id: "prod-1", quantity: 1 }], "user-1"),
    ).rejects.toThrow("El CUIT del cliente es obligatorio.");

    await expect(
      createSaleOrder.execute("   ", [{ product_id: "prod-1", quantity: 1 }], "user-1"),
    ).rejects.toThrow("El CUIT del cliente es obligatorio.");
  });

  it("should throw error when items array is empty", async () => {
    await expect(
      createSaleOrder.execute("30-12345678-9", [], "user-1"),
    ).rejects.toThrow("La orden debe tener al menos un ítem.");
  });

  it("should throw error when client is not found or inactive", async () => {
    vi.mocked(partnerRepository.findByCuit!).mockResolvedValue(null);

    await expect(
      createSaleOrder.execute(
        "30-unknown",
        [{ product_id: "prod-1", quantity: 1 }],
        "user-1",
      ),
    ).rejects.toThrow("El cliente indicado no existe o está inactivo.");
  });

  it("should throw error when client is not CLIENT type", async () => {
    const vendorOnly = makeClient({ type: ["VENDOR"] });

    vi.mocked(partnerRepository.findByCuit!).mockResolvedValue(vendorOnly);

    await expect(
      createSaleOrder.execute(
        "30-12345678-9",
        [{ product_id: "prod-1", quantity: 1 }],
        "user-1",
      ),
    ).rejects.toThrow("El socio indicado no está registrado como cliente.");
  });

  it("should throw error when product is not found", async () => {
    const client = makeClient();

    vi.mocked(partnerRepository.findByCuit!).mockResolvedValue(client);
    vi.mocked(productRepository.findById!).mockResolvedValue(null);

    await expect(
      createSaleOrder.execute(
        "30-12345678-9",
        [{ product_id: "prod-unknown", quantity: 1 }],
        "user-1",
      ),
    ).rejects.toThrow('El producto con ID "prod-unknown" no existe.');
  });

  it("should throw error when quantity is zero or negative", async () => {
    const client = makeClient();

    vi.mocked(partnerRepository.findByCuit!).mockResolvedValue(client);

    await expect(
      createSaleOrder.execute(
        "30-12345678-9",
        [{ product_id: "prod-1", quantity: 0 }],
        "user-1",
      ),
    ).rejects.toThrow(
      'La cantidad del ítem con ID "prod-1" debe ser mayor a cero.',
    );
  });

  it("should reserve stock for each item", async () => {
    const client = makeClient();
    const productA = makeProduct({ id: "prod-a" });
    const productB = makeProduct({ id: "prod-b", name: "Product B" });

    vi.mocked(partnerRepository.findByCuit!).mockResolvedValue(client);
    vi.mocked(productRepository.findById!)
      .mockResolvedValueOnce(productA)
      .mockResolvedValueOnce(productB);
    vi.mocked(orderRepository.save!).mockImplementation(async (order) => ({
      ...order,
      id: "sale-order-1",
    }));

    await createSaleOrder.execute(
      "30-12345678-9",
      [
        { product_id: "prod-a", quantity: 2 },
        { product_id: "prod-b", quantity: 1 },
      ],
      "user-1",
    );

    expect(reserveStockUseCase.execute).toHaveBeenCalledTimes(2);
    expect(reserveStockUseCase.execute).toHaveBeenCalledWith("prod-a", 2, "user-1");
    expect(reserveStockUseCase.execute).toHaveBeenCalledWith("prod-b", 1, "user-1");
  });

  it("should create a COLLECTION transaction and return a single order", async () => {
    const client = makeClient();
    const product = makeProduct();

    vi.mocked(partnerRepository.findByCuit!).mockResolvedValue(client);
    vi.mocked(productRepository.findById!).mockResolvedValue(product);
    vi.mocked(orderRepository.save!).mockImplementation(async (order) => ({
      ...order,
      id: "sale-order-1",
    }));

    const result = await createSaleOrder.execute(
      "30-12345678-9",
      [{ product_id: "prod-1", quantity: 1 }],
      "user-1",
    );

    expect(createTransactionUseCase.execute).toHaveBeenCalledWith(
      "sale-order-1",
      "COLLECTION",
      "user-1",
    );
    expect(Array.isArray(result)).toBe(false);
  });
});
