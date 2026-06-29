import { describe, it, expect, vi } from "vitest";
import { GetAllProducts } from "./GetAllProducts.js";
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

describe("GetAllProducts", () => {
  it("returns all products", async () => {
    const products = [
      makeProduct({ id: "prod-1", name: "Product A" }),
      makeProduct({ id: "prod-2", name: "Product B" }),
      makeProduct({ id: "prod-3", name: "Product C" }),
    ];

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn().mockResolvedValue(products),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn(),
    };

    const useCase = new GetAllProducts(productRepo);
    const result = await useCase.execute();

    expect(productRepo.findAll).toHaveBeenCalledOnce();
    expect(result).toEqual(products);
    expect(result).toHaveLength(3);
  });

  it("returns an empty array when no products exist", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn(),
    };

    const useCase = new GetAllProducts(productRepo);
    const result = await useCase.execute();

    expect(productRepo.findAll).toHaveBeenCalledOnce();
    expect(result).toEqual([]);
  });
});
