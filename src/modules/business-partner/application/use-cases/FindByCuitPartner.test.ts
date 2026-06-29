import { describe, it, expect, vi, beforeEach } from "vitest";
import { FindByCuitPartner } from "./FindByCuitPartner.js";
import type { IBusinessPartnerRepository } from "../../domain/index.js";
import type { IBusinessPartner } from "../../domain/index.js";

function makeMockPartner(overrides?: Partial<IBusinessPartner>): IBusinessPartner {
  return {
    cuit: "20123456789",
    legal_name: "Test SA",
    phone: "1144556677",
    email: "test@test.com",
    legal_address: "Av Test 123",
    active: true,
    vat_condition: "M",
    type: ["CLIENT"],
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-01-01"),
    created_by: "admin",
    updated_by: "admin",
    ...overrides,
  };
}

describe("FindByCuitPartner", () => {
  let mockRepo: IBusinessPartnerRepository;
  let useCase: FindByCuitPartner;

  beforeEach(() => {
    mockRepo = {
      save: vi.fn(),
      findByCuit: vi.fn(),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };
    useCase = new FindByCuitPartner(mockRepo);
  });

  it("should return the partner when found", async () => {
    const partner = makeMockPartner();
    (mockRepo.findByCuit as ReturnType<typeof vi.fn>).mockResolvedValue(partner);

    const result = await useCase.execute("20123456789");

    expect(result).toBe(partner);
    expect(mockRepo.findByCuit).toHaveBeenCalledWith("20123456789");
  });

  it("should return null when partner is not found", async () => {
    (mockRepo.findByCuit as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await useCase.execute("20123456789");

    expect(result).toBeNull();
    expect(mockRepo.findByCuit).toHaveBeenCalledWith("20123456789");
  });
});
