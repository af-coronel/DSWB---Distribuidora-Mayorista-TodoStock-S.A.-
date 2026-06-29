import { describe, it, expect, vi } from "vitest";
import { GetAllInventoryLots } from "./GetAllInventoryLots.js";
import type { IInventoryRepository } from "../../domain/repositories/IInventoryRepository.js";
import type { IInventoryLot } from "../../domain/interfaces/IInventoryLot.js";

const makeLot = (
  overrides: Partial<IInventoryLot> = {},
): IInventoryLot => ({
  id: "lot-1",
  product_id: "prod-1",
  stock: 100,
  engaged_stock: 0,
  expiration_date: new Date("2099-12-31"),
  created_by: "user-1",
  created_at: new Date("2026-01-01"),
  updated_by: "user-1",
  updated_at: new Date("2026-01-01"),
  ...overrides,
});

describe("GetAllInventoryLots", () => {
  it("returns all lots from the repository", async () => {
    const lots = [
      makeLot({ id: "lot-a" }),
      makeLot({ id: "lot-b" }),
    ];

    const inventoryRepo: IInventoryRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findAll: vi.fn().mockResolvedValue(lots),
      findByProductId: vi.fn(),
    };

    const useCase = new GetAllInventoryLots(inventoryRepo);

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("lot-a");
    expect(result[1]!.id).toBe("lot-b");
  });

  it("returns an empty array when no lots exist", async () => {
    const inventoryRepo: IInventoryRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
      findByProductId: vi.fn(),
    };

    const useCase = new GetAllInventoryLots(inventoryRepo);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
