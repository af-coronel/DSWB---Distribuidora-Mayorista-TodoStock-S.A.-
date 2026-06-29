import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdatePartner } from "./UpdatePartner.js";
import type { IBusinessPartnerRepository } from "../../domain/index.js";
import type { IBusinessPartner } from "../../domain/index.js";

function makeMockPartner(overrides?: Partial<IBusinessPartner>): IBusinessPartner {
  return {
    cuit: "20123456789",
    legal_name: "Original SA",
    phone: "1144556677",
    email: "original@test.com",
    legal_address: "Av Original 123",
    active: true,
    vat_condition: "M",
    type: ["CLIENT"],
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-01-01"),
    created_by: "creator",
    updated_by: "creator",
    ...overrides,
  };
}

describe("UpdatePartner", () => {
  let mockRepo: IBusinessPartnerRepository;
  let useCase: UpdatePartner;

  beforeEach(() => {
    mockRepo = {
      save: vi.fn(),
      findByCuit: vi.fn(),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };
    useCase = new UpdatePartner(mockRepo);
  });

  it("should update a partner successfully", async () => {
    const existing = makeMockPartner();
    (mockRepo.findByCuit as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    await useCase.execute("20123456789", { legal_name: "Updated SA" }, "editor");

    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        cuit: "20123456789",
        legal_name: "Updated SA",
        created_at: existing.created_at,
        created_by: "creator",
        updated_by: "editor",
      }),
    );
  });

  it("should preserve cuit, created_at, and created_by even if provided in updateData", async () => {
    const existing = makeMockPartner();
    (mockRepo.findByCuit as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    const originalCreatedAt = existing.created_at;

    await useCase.execute(
      "20123456789",
      {
        cuit: "30987654321",
        legal_name: "Hacked SA",
        created_at: new Date("2020-01-01"),
        created_by: "hacker",
      },
      "editor",
    );

    const saved = (mockRepo.save as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as IBusinessPartner;
    expect(saved.cuit).toBe("20123456789");
    expect(saved.created_at).toBe(originalCreatedAt);
    expect(saved.created_by).toBe("creator");
    expect(saved.updated_by).toBe("editor");
  });

  it("should set updated_at to a new Date and updated_by to userId", async () => {
    const existing = makeMockPartner();
    (mockRepo.findByCuit as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    await useCase.execute("20123456789", { legal_name: "Updated SA" }, "editor");

    const saved = (mockRepo.save as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as IBusinessPartner;
    expect(saved.updated_by).toBe("editor");
    expect(saved.updated_at).toBeInstanceOf(Date);
    expect(saved.updated_at.getTime()).toBeGreaterThan(existing.updated_at.getTime());
  });

  it("should throw an error when partner is not found", async () => {
    (mockRepo.findByCuit as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute("20123456789", { legal_name: "Updated SA" }, "editor"),
    ).rejects.toThrow("Socio de negocio no encontrado");

    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
