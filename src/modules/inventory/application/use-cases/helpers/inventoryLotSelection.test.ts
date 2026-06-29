import { describe, it, expect } from "vitest";
import {
  isExpiredLot,
  sortLotsByFefoFifo,
} from "./inventoryLotSelection.js";
import type { IInventoryLot } from "../../../domain/index.js";

const makeLot = (
  overrides: Partial<IInventoryLot> = {},
): IInventoryLot => ({
  id: "lot-1",
  product_id: "prod-1",
  stock: 100,
  engaged_stock: 0,
  expiration_date: new Date("2026-12-31"),
  created_by: "user-1",
  created_at: new Date("2026-01-01"),
  updated_by: "user-1",
  updated_at: new Date("2026-01-01"),
  ...overrides,
});

describe("isExpiredLot", () => {
  const refDate = new Date("2026-06-15");

  it("returns true when expiration_date is before referenceDate", () => {
    const lot = makeLot({ expiration_date: new Date("2026-06-14") });
    expect(isExpiredLot(lot, refDate)).toBe(true);
  });

  it("returns false when expiration_date is after referenceDate", () => {
    const lot = makeLot({ expiration_date: new Date("2026-06-16") });
    expect(isExpiredLot(lot, refDate)).toBe(false);
  });

  it("returns false when expiration_date is the same day as referenceDate", () => {
    const lot = makeLot({ expiration_date: new Date("2026-06-15") });
    expect(isExpiredLot(lot, refDate)).toBe(false);
  });

  it("returns false when expiration_date is null", () => {
    const lot = makeLot({ expiration_date: null });
    expect(isExpiredLot(lot, refDate)).toBe(false);
  });

  it("uses today as referenceDate when none is provided", () => {
    const pastLot = makeLot({ expiration_date: new Date("2020-01-01") });
    expect(isExpiredLot(pastLot)).toBe(true);
  });
});

describe("sortLotsByFefoFifo", () => {
  it("sorts by expiration_date ascending (FEFO), then created_at ascending (FIFO)", () => {
    const lots = [
      makeLot({
        id: "lot-a",
        expiration_date: new Date("2026-12-31"),
        created_at: new Date("2026-02-01"),
      }),
      makeLot({
        id: "lot-b",
        expiration_date: new Date("2026-06-30"),
        created_at: new Date("2026-01-01"),
      }),
      makeLot({
        id: "lot-c",
        expiration_date: new Date("2026-06-30"),
        created_at: new Date("2026-03-01"),
      }),
      makeLot({
        id: "lot-d",
        expiration_date: new Date("2025-12-31"),
        created_at: new Date("2026-01-01"),
      }),
    ];

    const sorted = sortLotsByFefoFifo(lots);

    expect(sorted[0]!.id).toBe("lot-d");
    expect(sorted[1]!.id).toBe("lot-b");
    expect(sorted[2]!.id).toBe("lot-c");
    expect(sorted[3]!.id).toBe("lot-a");
  });

  it("places lots without expiration_date at the end", () => {
    const lots = [
      makeLot({
        id: "lot-a",
        expiration_date: new Date("2026-12-31"),
      }),
      makeLot({
        id: "lot-b",
        expiration_date: null,
      }),
      makeLot({
        id: "lot-c",
        expiration_date: new Date("2025-12-31"),
      }),
    ];

    const sorted = sortLotsByFefoFifo(lots);

    expect(sorted[0]!.id).toBe("lot-c");
    expect(sorted[1]!.id).toBe("lot-a");
    expect(sorted[2]!.id).toBe("lot-b");
  });

  it("does not mutate the original array", () => {
    const lots = [
      makeLot({
        id: "lot-a",
        expiration_date: new Date("2026-12-31"),
      }),
      makeLot({
        id: "lot-b",
        expiration_date: new Date("2025-12-31"),
      }),
    ];

    const originalIds = lots.map((l) => l.id);
    sortLotsByFefoFifo(lots);

    expect(lots.map((l) => l.id)).toEqual(originalIds);
  });

  it("returns an empty array for empty input", () => {
    expect(sortLotsByFefoFifo([])).toEqual([]);
  });

  it("returns a single lot unchanged", () => {
    const lot = makeLot({ id: "lot-only" });
    expect(sortLotsByFefoFifo([lot])).toEqual([lot]);
  });
});
