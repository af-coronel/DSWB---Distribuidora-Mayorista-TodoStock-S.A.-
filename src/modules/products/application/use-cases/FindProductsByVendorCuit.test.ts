import { describe, it, expect, vi } from "vitest";
import { FindProductsByVendorCuit } from "./FindProductsByVendorCuit.js";
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

describe("FindProductsByVendorCuit", () => {
  it("returns products for a valid CUIT", async () => {
    const products = [
      makeProduct({ id: "prod-1", name: "Product A" }),
      makeProduct({ id: "prod-2", name: "Product B" }),
    ];

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn().mockResolvedValue(products),
      findByNameAndVendorCuit: vi.fn(),
    };

    const useCase = new FindProductsByVendorCuit(productRepo);
    const result = await useCase.execute("20-12345678-9");

    expect(productRepo.findByVendorCuit).toHaveBeenCalledWith("20123456789");
    expect(result).toEqual(products);
    expect(result).toHaveLength(2);
  });

  it("returns an empty array when no products are found", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn().mockResolvedValue([]),
      findByNameAndVendorCuit: vi.fn(),
    };

    const useCase = new FindProductsByVendorCuit(productRepo);
    const result = await useCase.execute("20123456789");

    expect(result).toEqual([]);
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

    const useCase = new FindProductsByVendorCuit(productRepo);

    await expect(
      useCase.execute("123"),
    ).rejects.toThrow(
      "El CUIT del proveedor no es válido. Debe contener exactamente 11 dígitos.",
    );
  });
});
