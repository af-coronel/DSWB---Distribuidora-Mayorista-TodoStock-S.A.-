import { describe, it, expect, vi } from "vitest";
import { RegisterProduct } from "./RegisterProduct.js";
import type { IProductRepository } from "../../domain/repositories/IProductRepository.js";
import type { IBusinessPartnerRepository } from "../../../business-partner/domain/repositories/IBusinessPartnerRepository.js";
import type { IProduct } from "../../domain/interfaces/IProduct.js";
import type { IBusinessPartner } from "../../../business-partner/domain/interfaces/IBusinessPartner.js";

const makeVendor = (overrides?: Partial<IBusinessPartner>): IBusinessPartner => ({
  cuit: "20123456789",
  legal_name: "Vendor S.A.",
  phone: "123456789",
  email: "vendor@example.com",
  legal_address: "Street 123",
  active: true,
  vat_condition: "IVA Responsable Inscripto",
  type: ["VENDOR"],
  created_at: new Date(),
  updated_at: new Date(),
  created_by: "user-1",
  updated_by: "user-1",
  ...overrides,
});

const makeProduct = (overrides?: Partial<IProduct>): IProduct => ({
  name: "Test Product",
  vendor_cuit: "20-12345678-9",
  vendor_price: 100,
  customer_price: 200,
  category: "Electronics",
  created_by: "user-1",
  created_at: new Date(),
  updated_by: "user-1",
  updated_at: new Date(),
  ...overrides,
});

describe("RegisterProduct", () => {
  it("registers a product successfully with valid data", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn().mockResolvedValue(null),
    };

    const partnerRepo: IBusinessPartnerRepository = {
      save: vi.fn(),
      findByCuit: vi.fn().mockResolvedValue(makeVendor()),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };

    const useCase = new RegisterProduct(productRepo, partnerRepo);
    const input = makeProduct();
    const result = await useCase.execute(input);

    expect(productRepo.save).toHaveBeenCalledTimes(1);
    expect(productRepo.findByNameAndVendorCuit).toHaveBeenCalledTimes(2);
    expect(result.name).toBe("Test Product");
  });

  it("throws when name is empty", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn(),
    };

    const partnerRepo: IBusinessPartnerRepository = {
      save: vi.fn(),
      findByCuit: vi.fn(),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };

    const useCase = new RegisterProduct(productRepo, partnerRepo);

    await expect(
      useCase.execute(makeProduct({ name: "  " })),
    ).rejects.toThrow("El nombre del producto es obligatorio.");
  });

  it("throws when category is empty", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn(),
    };

    const partnerRepo: IBusinessPartnerRepository = {
      save: vi.fn(),
      findByCuit: vi.fn(),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };

    const useCase = new RegisterProduct(productRepo, partnerRepo);

    await expect(
      useCase.execute(makeProduct({ category: "" })),
    ).rejects.toThrow("La categoría del producto es obligatoria.");
  });

  it("throws when CUIT is invalid", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn(),
    };

    const partnerRepo: IBusinessPartnerRepository = {
      save: vi.fn(),
      findByCuit: vi.fn(),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };

    const useCase = new RegisterProduct(productRepo, partnerRepo);

    await expect(
      useCase.execute(makeProduct({ vendor_cuit: "123" })),
    ).rejects.toThrow(
      "El CUIT del proveedor no es válido. Debe contener exactamente 11 dígitos.",
    );
  });

  it("throws when vendor_price is negative", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn(),
    };

    const partnerRepo: IBusinessPartnerRepository = {
      save: vi.fn(),
      findByCuit: vi.fn(),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };

    const useCase = new RegisterProduct(productRepo, partnerRepo);

    await expect(
      useCase.execute(makeProduct({ vendor_price: -1 })),
    ).rejects.toThrow("Los precios del producto no pueden ser negativos.");
  });

  it("throws when customer_price is negative", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn(),
    };

    const partnerRepo: IBusinessPartnerRepository = {
      save: vi.fn(),
      findByCuit: vi.fn(),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };

    const useCase = new RegisterProduct(productRepo, partnerRepo);

    await expect(
      useCase.execute(makeProduct({ customer_price: -5 })),
    ).rejects.toThrow("Los precios del producto no pueden ser negativos.");
  });

  it("throws when customer_price is less than vendor_price", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn(),
    };

    const partnerRepo: IBusinessPartnerRepository = {
      save: vi.fn(),
      findByCuit: vi.fn(),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };

    const useCase = new RegisterProduct(productRepo, partnerRepo);

    await expect(
      useCase.execute(makeProduct({ vendor_price: 200, customer_price: 100 })),
    ).rejects.toThrow(
      "El precio al cliente no puede ser menor que el precio del proveedor.",
    );
  });

  it("throws when vendor is not found", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn(),
    };

    const partnerRepo: IBusinessPartnerRepository = {
      save: vi.fn(),
      findByCuit: vi.fn().mockResolvedValue(null),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };

    const useCase = new RegisterProduct(productRepo, partnerRepo);

    await expect(
      useCase.execute(makeProduct()),
    ).rejects.toThrow(
      "El proveedor indicado no existe o no está registrado como proveedor.",
    );
  });

  it("throws when vendor is not of VENDOR type", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn(),
    };

    const partnerRepo: IBusinessPartnerRepository = {
      save: vi.fn(),
      findByCuit: vi.fn().mockResolvedValue(makeVendor({ type: ["CLIENT"] })),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };

    const useCase = new RegisterProduct(productRepo, partnerRepo);

    await expect(
      useCase.execute(makeProduct()),
    ).rejects.toThrow(
      "El proveedor indicado no existe o no está registrado como proveedor.",
    );
  });

  it("throws when a duplicate product name exists for the same vendor", async () => {
    const existingProduct = makeProduct({ vendor_cuit: "20123456789" });

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn().mockResolvedValue(existingProduct),
    };

    const partnerRepo: IBusinessPartnerRepository = {
      save: vi.fn(),
      findByCuit: vi.fn().mockResolvedValue(makeVendor()),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };

    const useCase = new RegisterProduct(productRepo, partnerRepo);

    await expect(
      useCase.execute(makeProduct()),
    ).rejects.toThrow(
      "Ya existe un producto con ese nombre para el proveedor indicado.",
    );
  });

  it("trims name and category, and sanitizes CUIT before saving", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn().mockResolvedValue(null),
    };

    const partnerRepo: IBusinessPartnerRepository = {
      save: vi.fn(),
      findByCuit: vi.fn().mockResolvedValue(makeVendor()),
      findAll: vi.fn(),
      deleteSoft: vi.fn(),
      activate: vi.fn(),
    };

    const useCase = new RegisterProduct(productRepo, partnerRepo);

    await useCase.execute(
      makeProduct({
        name: "  My Product  ",
        category: "  Tools  ",
        vendor_cuit: "20-12345678-9",
      }),
    );

    expect(productRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My Product",
        category: "Tools",
        vendor_cuit: "20123456789",
      }),
    );
  });
});
