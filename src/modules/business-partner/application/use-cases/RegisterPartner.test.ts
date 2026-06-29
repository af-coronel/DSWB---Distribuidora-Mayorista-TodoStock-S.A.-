import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegisterPartner } from "./RegisterPartner.js";
import { CuitValidator } from "../../domain/validators/CuitValidator.js";
import type { IBusinessPartnerRepository } from "../../domain/repositories/IBusinessPartnerRepository.js";
import type { IBusinessPartner } from "../../domain/interfaces/IBusinessPartner.js";

function makeMockPartner(overrides?: Partial<IBusinessPartner>): IBusinessPartner {
  return {
    cuit: "20-12345678-9",
    legal_name: "Test SA",
    phone: "1144556677",
    email: "test@test.com",
    legal_address: "Av Test 1234",
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

describe("RegisterPartner", () => {
  let mockRepo: IBusinessPartnerRepository;
  let useCase: RegisterPartner;

  beforeEach(() => {
    mockRepo = {
      save: vi.fn(),
      findByCuit: vi.fn(),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };
    useCase = new RegisterPartner(mockRepo);
  });

  it("should register a partner successfully with a clean CUIT", async () => {
    const sanitizeSpy = vi.spyOn(CuitValidator, "sanitize");
    const isValidSpy = vi.spyOn(CuitValidator, "isValid");
    const partnerData = makeMockPartner();

    const result = await useCase.execute(partnerData);

    expect(sanitizeSpy).toHaveBeenCalledWith("20-12345678-9");
    expect(isValidSpy).toHaveBeenCalledWith("20123456789");
    expect(result.cuit).toBe("20123456789");
    expect(mockRepo.findByCuit).toHaveBeenCalledWith("20123456789");
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ cuit: "20123456789", legal_name: "Test SA" }),
    );
  });

  it("should throw an error when CUIT is invalid (less than 11 digits)", async () => {
    vi.spyOn(CuitValidator, "sanitize").mockReturnValue("12345");
    vi.spyOn(CuitValidator, "isValid").mockReturnValue(false);
    const partnerData = makeMockPartner({ cuit: "12345" });

    await expect(useCase.execute(partnerData)).rejects.toThrow(
      /no es válido/,
    );

    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it("should throw an error when CUIT already exists", async () => {
    vi.spyOn(CuitValidator, "sanitize").mockReturnValue("20123456789");
    vi.spyOn(CuitValidator, "isValid").mockReturnValue(true);
    (mockRepo.findByCuit as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMockPartner({ cuit: "20123456789" }),
    );
    const partnerData = makeMockPartner();

    await expect(useCase.execute(partnerData)).rejects.toThrow(
      /ya se encuentra registrado/,
    );

    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
