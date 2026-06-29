import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreatePurchaseOrder } from "./CreatePurchaseOrder.js";
import type { IOrderRepository } from "../../domain/index.js";
import type { IBusinessPartnerRepository } from "../../../business-partner/domain/index.js";
import type { IProductRepository } from "../../../products/domain/index.js";
import type { IBusinessPartner } from "../../../business-partner/domain/index.js";
import type { IProduct } from "../../../products/domain/index.js";

const makeProduct = (overrides?: Partial<IProduct>): IProduct => ({
  id: "prod-1",
  name: "Product A",
  vendor_cuit: "30-12345678-9",
  vendor_price: 500,
  customer_price: 700,
  category: "General",
  created_by: "user-1",
  created_at: new Date("2025-06-01"),
  updated_by: "user-1",
  updated_at: new Date("2025-06-01"),
  ...overrides,
});

const makeVendor = (overrides?: Partial<IBusinessPartner>): IBusinessPartner => ({
  cuit: "30-12345678-9",
  legal_name: "Vendor Corp",
  phone: "123456789",
  email: "vendor@test.com",
  legal_address: "Street 123",
  active: true,
  vat_condition: "RESPONSABLE_INSCRIPTO",
  type: ["VENDOR"],
  created_by: "user-1",
  created_at: new Date("2025-06-01"),
  updated_by: "user-1",
  updated_at: new Date("2025-06-01"),
  ...overrides,
});

describe("CreatePurchaseOrder", () => {
  let orderRepository: IOrderRepository;
  let partnerRepository: IBusinessPartnerRepository;
  let productRepository: IProductRepository;
  let createTransactionUseCase: { execute: ReturnType<typeof vi.fn> };
  let createPurchaseOrder: CreatePurchaseOrder;

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

    createTransactionUseCase = { execute: vi.fn() };

    createPurchaseOrder = new CreatePurchaseOrder(
      orderRepository,
      partnerRepository,
      productRepository,
      createTransactionUseCase as any,
    );
  });

  it("should create a single purchase order grouping items by vendor CUIT", async () => {
    const product = makeProduct();
    const vendor = makeVendor();

    vi.mocked(productRepository.findById!).mockResolvedValue(product);
    vi.mocked(partnerRepository.findByCuit!).mockResolvedValue(vendor);
    vi.mocked(orderRepository.save!).mockImplementation(async (order) => ({
      ...order,
      id: "order-1",
    }));

    const result = await createPurchaseOrder.execute(
      [{ product_id: "prod-1", quantity: 2 }],
      "user-1",
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.order_type).toBe("PURCHASE");
    expect(result[0]!.status).toBe("TO_VERIFY_BUDGET");
    expect(result[0]!.partner_cuit).toBe("30-12345678-9");
    expect(result[0]!.total_amount).toBe(1000);
    expect(result[0]!.items).toHaveLength(1);
    expect(result[0]!.items[0]!.product_name).toBe("Product A");
  });

  it("should create multiple purchase orders for multiple vendors", async () => {
    const productA = makeProduct({ id: "prod-a", vendor_cuit: "30-11111111-1" });
    const productB = makeProduct({
      id: "prod-b",
      vendor_cuit: "30-22222222-2",
      name: "Product B",
    });
    const vendorA = makeVendor({ cuit: "30-11111111-1" });
    const vendorB = makeVendor({ cuit: "30-22222222-2" });

    vi.mocked(productRepository.findById!)
      .mockResolvedValueOnce(productA)
      .mockResolvedValueOnce(productB);
    vi.mocked(partnerRepository.findByCuit!)
      .mockResolvedValueOnce(vendorA)
      .mockResolvedValueOnce(vendorB);
    vi.mocked(orderRepository.save!)
      .mockImplementation(async (order) => ({ ...order, id: order.partner_cuit }));

    const result = await createPurchaseOrder.execute(
      [
        { product_id: "prod-a", quantity: 1 },
        { product_id: "prod-b", quantity: 3 },
      ],
      "user-1",
    );

    expect(result).toHaveLength(2);
    expect(result[0]!.partner_cuit).toBe("30-11111111-1");
    expect(result[1]!.partner_cuit).toBe("30-22222222-2");
  });

  it("should throw error when items array is empty", async () => {
    await expect(
      createPurchaseOrder.execute([], "user-1"),
    ).rejects.toThrow("La orden debe tener al menos un ítem.");
  });

  it("should throw error when quantity is zero or negative", async () => {
    await expect(
      createPurchaseOrder.execute(
        [{ product_id: "prod-1", quantity: 0 }],
        "user-1",
      ),
    ).rejects.toThrow(
      'La cantidad del ítem con ID "prod-1" debe ser mayor a cero.',
    );

    await expect(
      createPurchaseOrder.execute(
        [{ product_id: "prod-1", quantity: -1 }],
        "user-1",
      ),
    ).rejects.toThrow(
      'La cantidad del ítem con ID "prod-1" debe ser mayor a cero.',
    );
  });

  it("should throw error when product is not found", async () => {
    vi.mocked(productRepository.findById!).mockResolvedValue(null);

    await expect(
      createPurchaseOrder.execute(
        [{ product_id: "prod-unknown", quantity: 1 }],
        "user-1",
      ),
    ).rejects.toThrow('El producto con ID "prod-unknown" no existe.');
  });

  it("should throw error when vendor is not found or inactive", async () => {
    const product = makeProduct();
    vi.mocked(productRepository.findById!).mockResolvedValue(product);
    vi.mocked(partnerRepository.findByCuit!).mockResolvedValue(null);

    await expect(
      createPurchaseOrder.execute(
        [{ product_id: "prod-1", quantity: 1 }],
        "user-1",
      ),
    ).rejects.toThrow(
      'El proveedor con CUIT "30-12345678-9" no existe o está inactivo.',
    );
  });

  it("should throw error when partner is not a VENDOR type", async () => {
    const product = makeProduct();
    const nonVendor = makeVendor({ type: ["CLIENT"] });

    vi.mocked(productRepository.findById!).mockResolvedValue(product);
    vi.mocked(partnerRepository.findByCuit!).mockResolvedValue(nonVendor);

    await expect(
      createPurchaseOrder.execute(
        [{ product_id: "prod-1", quantity: 1 }],
        "user-1",
      ),
    ).rejects.toThrow(
      'El socio con CUIT "30-12345678-9" no está registrado como proveedor.',
    );
  });

  it("should create a PAYMENT transaction for each order", async () => {
    const product = makeProduct();
    const vendor = makeVendor();

    vi.mocked(productRepository.findById!).mockResolvedValue(product);
    vi.mocked(partnerRepository.findByCuit!).mockResolvedValue(vendor);
    vi.mocked(orderRepository.save!).mockImplementation(async (order) => ({
      ...order,
      id: "order-1",
    }));

    await createPurchaseOrder.execute(
      [{ product_id: "prod-1", quantity: 2 }],
      "user-1",
    );

    expect(createTransactionUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createTransactionUseCase.execute).toHaveBeenCalledWith(
      "order-1",
      "PAYMENT",
      "user-1",
    );
  });

  it("should return an array of created orders", async () => {
    const product = makeProduct();
    const vendor = makeVendor();

    vi.mocked(productRepository.findById!).mockResolvedValue(product);
    vi.mocked(partnerRepository.findByCuit!).mockResolvedValue(vendor);
    vi.mocked(orderRepository.save!).mockImplementation(async (order) => ({
      ...order,
      id: "order-1",
    }));

    const result = await createPurchaseOrder.execute(
      [{ product_id: "prod-1", quantity: 1 }],
      "user-1",
    );

    expect(Array.isArray(result)).toBe(true);
  });
});
