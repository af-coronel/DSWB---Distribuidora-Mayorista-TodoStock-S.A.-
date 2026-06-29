import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetAvailableStockByProduct } from "./GetAvailableStockByProduct.js";
import type { IInventoryRepository } from "../../domain/repositories/IInventoryRepository.js";
import type { IProductRepository } from "../../../products/domain/repositories/IProductRepository.js";
import type { IInventoryLot } from "../../domain/interfaces/IInventoryLot.js";

const makeLot = (
  overrides: Partial<IInventoryLot> = {},
): IInventoryLot => ({
  id: "lot-1",
  product_id: "prod-1",
  stock: 50,
  engaged_stock: 10,
  expiration_date: new Date("2099-12-31"),
  created_by: "user-1",
  created_at: new Date("2026-01-01"),
  updated_by: "user-1",
  updated_at: new Date("2026-01-01"),
  ...overrides,
});

describe("GetAvailableStockByProduct", () => {
  let inventoryRepo: IInventoryRepository;
  let productRepo: IProductRepository;
  let useCase: GetAvailableStockByProduct;

  beforeEach(() => {
    inventoryRepo = {
      save: vi.fn(),
      update: vi.fn(),
      findAll: vi.fn(),
      findByProductId: vi.fn(),
    };

    productRepo = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn(),
    };

    useCase = new GetAvailableStockByProduct(inventoryRepo, productRepo);
  });

  it("returns the sum of available stock across non-expired lots", async () => {
    const lotA = makeLot({
      id: "lot-a",
      stock: 100,
      engaged_stock: 30,
    });
    const lotB = makeLot({
      id: "lot-b",
      stock: 50,
      engaged_stock: 10,
    });

    vi.mocked(productRepo.findById).mockResolvedValue({} as any);
    vi.mocked(inventoryRepo.findByProductId).mockResolvedValue([lotA, lotB]);

    const result = await useCase.execute("prod-1");

    expect(result).toBe(110);
  });

  it("throws when productId is empty", async () => {
    await expect(useCase.execute("  ")).rejects.toThrow(
      "El producto es obligatorio.",
    );
  });

  it("throws when product is not found", async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute("prod-1")).rejects.toThrow(
      "El producto indicado no existe.",
    );
  });

  it("excludes expired lots from the calculation", async () => {
    const freshLot = makeLot({
      id: "lot-fresh",
      stock: 100,
      engaged_stock: 20,
      expiration_date: new Date("2099-12-31"),
    });
    const expiredLot = makeLot({
      id: "lot-expired",
      stock: 50,
      engaged_stock: 0,
      expiration_date: new Date("2020-01-01"),
    });

    vi.mocked(productRepo.findById).mockResolvedValue({} as any);
    vi.mocked(inventoryRepo.findByProductId).mockResolvedValue([
      freshLot,
      expiredLot,
    ]);

    const result = await useCase.execute("prod-1");

    expect(result).toBe(80);
  });

  it("returns 0 when no lots exist", async () => {
    vi.mocked(productRepo.findById).mockResolvedValue({} as any);
    vi.mocked(inventoryRepo.findByProductId).mockResolvedValue([]);

    const result = await useCase.execute("prod-1");

    expect(result).toBe(0);
  });

  it("returns 0 when all lots are expired", async () => {
    const expiredLot = makeLot({
      stock: 50,
      engaged_stock: 0,
      expiration_date: new Date("2020-01-01"),
    });

    vi.mocked(productRepo.findById).mockResolvedValue({} as any);
    vi.mocked(inventoryRepo.findByProductId).mockResolvedValue([expiredLot]);

    const result = await useCase.execute("prod-1");

    expect(result).toBe(0);
  });
});
