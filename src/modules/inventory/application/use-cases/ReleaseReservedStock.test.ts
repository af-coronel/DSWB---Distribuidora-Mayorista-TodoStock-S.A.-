import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReleaseReservedStock } from "./ReleaseReservedStock.js";
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

describe("ReleaseReservedStock", () => {
  let inventoryRepo: IInventoryRepository;
  let productRepo: IProductRepository;
  let useCase: ReleaseReservedStock;

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

    useCase = new ReleaseReservedStock(inventoryRepo, productRepo);
  });

  it("releases reserved stock successfully from a single lot", async () => {
    const lot = makeLot({ stock: 50, engaged_stock: 20 });
    vi.mocked(productRepo.findById).mockResolvedValue({} as any);
    vi.mocked(inventoryRepo.findByProductId).mockResolvedValue([lot]);

    const result = await useCase.execute("prod-1", 5, "user-2");

    expect(inventoryRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ engaged_stock: 15 }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.engaged_stock).toBe(15);
  });

  it("throws when productId is empty", async () => {
    await expect(useCase.execute("  ", 5, "user-2")).rejects.toThrow(
      "El producto es obligatorio.",
    );
  });

  it("throws when quantity is zero or negative", async () => {
    await expect(useCase.execute("prod-1", 0, "user-2")).rejects.toThrow(
      "La cantidad a liberar debe ser mayor que cero.",
    );

    await expect(useCase.execute("prod-1", -1, "user-2")).rejects.toThrow(
      "La cantidad a liberar debe ser mayor que cero.",
    );
  });

  it("throws when product is not found", async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute("prod-1", 5, "user-2")).rejects.toThrow(
      "El producto indicado no existe.",
    );
  });

  it("throws when insufficient engaged stock", async () => {
    const lot = makeLot({ stock: 50, engaged_stock: 3 });
    vi.mocked(productRepo.findById).mockResolvedValue({} as any);
    vi.mocked(inventoryRepo.findByProductId).mockResolvedValue([lot]);

    await expect(useCase.execute("prod-1", 5, "user-2")).rejects.toThrow(
      "No hay stock reservado suficiente para liberar la cantidad indicada.",
    );
  });

  it("releases across multiple lots correctly", async () => {
    const lotA = makeLot({
      id: "lot-a",
      stock: 20,
      engaged_stock: 10,
      created_at: new Date("2026-01-01"),
    });
    const lotB = makeLot({
      id: "lot-b",
      stock: 30,
      engaged_stock: 15,
      created_at: new Date("2026-02-01"),
    });

    vi.mocked(productRepo.findById).mockResolvedValue({} as any);
    vi.mocked(inventoryRepo.findByProductId).mockResolvedValue([lotA, lotB]);

    const result = await useCase.execute("prod-1", 20, "user-2");

    expect(inventoryRepo.update).toHaveBeenCalledTimes(2);
    expect(result[0]!.engaged_stock).toBe(0);
    expect(result[1]!.engaged_stock).toBe(5);
  });
});
