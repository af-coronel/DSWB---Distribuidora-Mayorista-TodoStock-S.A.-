import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReserveStock } from "./ReserveStock.js";
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

describe("ReserveStock", () => {
  let inventoryRepo: IInventoryRepository;
  let productRepo: IProductRepository;
  let useCase: ReserveStock;

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

    useCase = new ReserveStock(inventoryRepo, productRepo);
  });

  it("reserves stock successfully from a single lot", async () => {
    const lot = makeLot({ stock: 50, engaged_stock: 10 });
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
      "La cantidad a reservar debe ser mayor que cero.",
    );

    await expect(useCase.execute("prod-1", -1, "user-2")).rejects.toThrow(
      "La cantidad a reservar debe ser mayor que cero.",
    );
  });

  it("throws when product is not found", async () => {
    vi.mocked(productRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute("prod-1", 5, "user-2")).rejects.toThrow(
      "El producto indicado no existe.",
    );
  });

  it("throws when available stock is insufficient", async () => {
    const lot = makeLot({ stock: 10, engaged_stock: 9 });
    vi.mocked(productRepo.findById).mockResolvedValue({} as any);
    vi.mocked(inventoryRepo.findByProductId).mockResolvedValue([lot]);

    await expect(useCase.execute("prod-1", 5, "user-2")).rejects.toThrow(
      "No hay stock disponible suficiente para realizar la reserva.",
    );
  });

  it("reserves across multiple lots partially", async () => {
    const lotA = makeLot({
      id: "lot-a",
      stock: 20,
      engaged_stock: 0,
      expiration_date: new Date("2099-06-30"),
      created_at: new Date("2026-01-01"),
    });
    const lotB = makeLot({
      id: "lot-b",
      stock: 30,
      engaged_stock: 0,
      expiration_date: new Date("2099-12-31"),
      created_at: new Date("2026-02-01"),
    });

    vi.mocked(productRepo.findById).mockResolvedValue({} as any);
    vi.mocked(inventoryRepo.findByProductId).mockResolvedValue([lotA, lotB]);

    const result = await useCase.execute("prod-1", 35, "user-2");

    expect(inventoryRepo.update).toHaveBeenCalledTimes(2);
    expect(result[0]!.engaged_stock).toBe(20);
    expect(result[1]!.engaged_stock).toBe(15);
  });

  it("excludes expired lots from candidates", async () => {
    const freshLot = makeLot({
      id: "lot-fresh",
      stock: 30,
      engaged_stock: 0,
      expiration_date: new Date("2099-12-31"),
    });
    const expiredLot = makeLot({
      id: "lot-expired",
      stock: 30,
      engaged_stock: 0,
      expiration_date: new Date("2020-01-01"),
    });

    vi.mocked(productRepo.findById).mockResolvedValue({} as any);
    vi.mocked(inventoryRepo.findByProductId).mockResolvedValue([
      freshLot,
      expiredLot,
    ]);

    const result = await useCase.execute("prod-1", 10, "user-2");

    expect(inventoryRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "lot-fresh" }),
    );
    expect(result).toHaveLength(1);
  });

  it("excludes lots with zero available stock", async () => {
    const lotWithStock = makeLot({
      id: "lot-good",
      stock: 10,
      engaged_stock: 0,
    });
    const lotWithoutStock = makeLot({
      id: "lot-empty",
      stock: 10,
      engaged_stock: 10,
    });

    vi.mocked(productRepo.findById).mockResolvedValue({} as any);
    vi.mocked(inventoryRepo.findByProductId).mockResolvedValue([
      lotWithStock,
      lotWithoutStock,
    ]);

    const result = await useCase.execute("prod-1", 5, "user-2");

    expect(inventoryRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "lot-good" }),
    );
    expect(result).toHaveLength(1);
  });
});
