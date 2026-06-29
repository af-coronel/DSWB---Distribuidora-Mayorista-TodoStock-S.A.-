import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActivatePartner } from "./ActivatePartner.js";
import type { IBusinessPartnerRepository } from "../../domain/index.js";
import type { IBusinessPartner } from "../../domain/index.js";

function makeMockPartner(overrides?: Partial<IBusinessPartner>): IBusinessPartner {
  return {
    cuit: "20123456789",
    legal_name: "Test SA",
    phone: "1144556677",
    email: "test@test.com",
    legal_address: "Av Test 123",
    active: false,
    vat_condition: "M",
    type: ["CLIENT"],
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-01-01"),
    created_by: "admin",
    updated_by: "admin",
    ...overrides,
  };
}

describe("ActivatePartner", () => {
  let mockRepo: IBusinessPartnerRepository;
  let useCase: ActivatePartner;

  beforeEach(() => {
    mockRepo = {
      save: vi.fn(),
      findByCuit: vi.fn(),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };
    useCase = new ActivatePartner(mockRepo);
  });

  it("should activate a partner by setting active to true and updating timestamps", async () => {
    const existing = makeMockPartner({ active: false });
    (mockRepo.findByCuit as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    await useCase.execute("20123456789", "activator");

    expect(existing.active).toBe(true);
    expect(existing.updated_by).toBe("activator");
    expect(existing.updated_at).toBeInstanceOf(Date);
    expect(mockRepo.save).toHaveBeenCalledWith(existing);
  });

  it("should throw an error when partner is already active", async () => {
    const existing = makeMockPartner({ active: true });
    (mockRepo.findByCuit as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    await expect(
      useCase.execute("20123456789", "activator"),
    ).rejects.toThrow("ya se encuentra activo");

    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it("should throw an error when partner is not found", async () => {
    (mockRepo.findByCuit as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute("20123456789", "activator"),
    ).rejects.toThrow("Socio de negocio no encontrado");

    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
