import { describe, it, expect, vi } from "vitest";
import { CreateInventoryLot } from "./CreateInventoryLot.js";
import type { IInventoryRepository } from "../../domain/repositories/IInventoryRepository.js";
import type { IProductRepository } from "../../../products/domain/repositories/IProductRepository.js";
import type { IInventoryLot } from "../../domain/interfaces/IInventoryLot.js";

const makeLotData = (
  overrides: Partial<IInventoryLot> = {},
): IInventoryLot => ({
  product_id: "prod-1",
  stock: 100,
  engaged_stock: 0,
  expiration_date: new Date("2099-12-31"),
  created_by: "user-1",
  created_at: new Date(),
  updated_by: "user-1",
  updated_at: new Date(),
  ...overrides,
});

describe("CreateInventoryLot", () => {
  const makeUseCase = () => {
    const inventoryRepo: IInventoryRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findAll: vi.fn(),
      findByProductId: vi.fn(),
    };

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn(),
    };

    const useCase = new CreateInventoryLot(inventoryRepo, productRepo);

    return { inventoryRepo, productRepo, useCase };
  };

  it("creates a lot successfully with valid data", async () => {
    const { inventoryRepo, productRepo, useCase } = makeUseCase();
    vi.mocked(productRepo.findById).mockResolvedValue({} as any);

    const input = makeLotData();
    const result = await useCase.execute(input);

    expect(inventoryRepo.save).toHaveBeenCalledTimes(1);
    expect(result.product_id).toBe("prod-1");
  });

  it("throws when product_id is empty", async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute(makeLotData({ product_id: "  " })),
    ).rejects.toThrow("El producto asociado al lote es obligatorio.");
  });

  it("throws when product is not found", async () => {
    const { inventoryRepo, productRepo, useCase } = makeUseCase();
    vi.mocked(productRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(makeLotData())).rejects.toThrow(
      "El producto indicado no existe.",
    );
  });

  it("throws when stock is zero or negative", async () => {
    const { inventoryRepo, productRepo, useCase } = makeUseCase();
    vi.mocked(productRepo.findById).mockResolvedValue({} as any);

    await expect(
      useCase.execute(makeLotData({ stock: 0 })),
    ).rejects.toThrow("El stock del lote debe ser mayor que cero.");

    await expect(
      useCase.execute(makeLotData({ stock: -1 })),
    ).rejects.toThrow("El stock del lote debe ser mayor que cero.");
  });

  it("throws when engaged_stock is negative", async () => {
    const { inventoryRepo, productRepo, useCase } = makeUseCase();
    vi.mocked(productRepo.findById).mockResolvedValue({} as any);

    await expect(
      useCase.execute(makeLotData({ engaged_stock: -1 })),
    ).rejects.toThrow("El stock reservado no puede ser negativo.");
  });

  it("throws when engaged_stock exceeds stock", async () => {
    const { inventoryRepo, productRepo, useCase } = makeUseCase();
    vi.mocked(productRepo.findById).mockResolvedValue({} as any);

    await expect(
      useCase.execute(makeLotData({ stock: 10, engaged_stock: 15 })),
    ).rejects.toThrow(
      "El stock reservado no puede superar el stock total del lote.",
    );
  });

  it("throws when expiration_date is invalid", async () => {
    const { inventoryRepo, productRepo, useCase } = makeUseCase();
    vi.mocked(productRepo.findById).mockResolvedValue({} as any);

    await expect(
      useCase.execute(makeLotData({ expiration_date: new Date("invalid") })),
    ).rejects.toThrow("La fecha de vencimiento del lote no es válida.");
  });

  it("accepts null expiration_date and normalizes it to null", async () => {
    const { inventoryRepo, productRepo, useCase } = makeUseCase();
    vi.mocked(productRepo.findById).mockResolvedValue({} as any);

    const input = makeLotData({ expiration_date: null as any });
    const result = await useCase.execute(input);

    expect(inventoryRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ expiration_date: null }),
    );
    expect(result.expiration_date).toBeNull();
  });

  it("calls repository.save with the correct data", async () => {
    const { inventoryRepo, productRepo, useCase } = makeUseCase();
    vi.mocked(productRepo.findById).mockResolvedValue({} as any);

    const input = makeLotData({ stock: 75, engaged_stock: 10 });
    await useCase.execute(input);

    expect(inventoryRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: "prod-1",
        stock: 75,
        engaged_stock: 10,
      }),
    );
  });
});
