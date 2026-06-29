import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetAllPartners } from "./GetAllPartners.js";
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

describe("GetAllPartners", () => {
  let mockRepo: IBusinessPartnerRepository;
  let useCase: GetAllPartners;

  beforeEach(() => {
    mockRepo = {
      save: vi.fn(),
      findByCuit: vi.fn(),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };
    useCase = new GetAllPartners(mockRepo);
  });

  it("should return all partners", async () => {
    const partners = [makeMockPartner(), makeMockPartner({ cuit: "30987654321", legal_name: "Another SA" })];
    (mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(partners);

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(result).toBe(partners);
    expect(mockRepo.findAll).toHaveBeenCalledOnce();
  });

  it("should return an empty array when no partners exist", async () => {
    (mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
    expect(mockRepo.findAll).toHaveBeenCalledOnce();
  });
});
