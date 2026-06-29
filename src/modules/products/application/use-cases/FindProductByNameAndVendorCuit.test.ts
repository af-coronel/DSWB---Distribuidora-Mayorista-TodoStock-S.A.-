import { describe, it, expect, vi } from "vitest";
import { FindProductByNameAndVendorCuit } from "./FindProductByNameAndVendorCuit.js";
import type { IProductRepository } from "../../domain/repositories/IProductRepository.js";
import type { IProduct } from "../../domain/interfaces/IProduct.js";

const makeProduct = (overrides?: Partial<IProduct>): IProduct => ({
  id: "prod-1",
  name: "Test Product",
  vendor_cuit: "20123456789",
  vendor_price: 100,
  customer_price: 200,
  category: "Electronics",
  created_by: "user-1",
  created_at: new Date(),
  updated_by: "user-1",
  updated_at: new Date(),
  ...overrides,
});

describe("FindProductByNameAndVendorCuit", () => {
  it("returns the product when found", async () => {
    const product = makeProduct();

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn().mockResolvedValue(product),
    };

    const useCase = new FindProductByNameAndVendorCuit(productRepo);
    const result = await useCase.execute("Test Product", "20-12345678-9");

    expect(productRepo.findByNameAndVendorCuit).toHaveBeenCalledWith(
      "Test Product",
      "20123456789",
    );
    expect(result).toEqual(product);
  });

  it("returns null when product is not found", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn().mockResolvedValue(null),
    };

    const useCase = new FindProductByNameAndVendorCuit(productRepo);
    const result = await useCase.execute("Non Existent", "20123456789");

    expect(result).toBeNull();
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

    const useCase = new FindProductByNameAndVendorCuit(productRepo);

    await expect(
      useCase.execute("", "20123456789"),
    ).rejects.toThrow("El nombre del producto es obligatorio.");
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

    const useCase = new FindProductByNameAndVendorCuit(productRepo);

    await expect(
      useCase.execute("Test Product", "123"),
    ).rejects.toThrow(
      "El CUIT del proveedor no es válido. Debe contener exactamente 11 dígitos.",
    );
  });

  it("normalizes name and CUIT before querying", async () => {
    const product = makeProduct();

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn().mockResolvedValue(product),
    };

    const useCase = new FindProductByNameAndVendorCuit(productRepo);
    await useCase.execute("  My Product  ", "20-12345678-9");

    expect(productRepo.findByNameAndVendorCuit).toHaveBeenCalledWith(
      "My Product",
      "20123456789",
    );
  });
});
