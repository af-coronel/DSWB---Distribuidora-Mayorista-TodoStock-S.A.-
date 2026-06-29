import { describe, it, expect, vi } from "vitest";
import { UpdateProduct } from "./UpdateProduct.js";
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
  created_at: new Date("2024-01-01"),
  updated_by: "user-1",
  updated_at: new Date("2024-01-01"),
  ...overrides,
});

describe("UpdateProduct", () => {
  it("updates a product successfully", async () => {
    const existingProduct = makeProduct();

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi
        .fn()
        .mockResolvedValueOnce(existingProduct)
        .mockResolvedValueOnce(null),
    };

    const useCase = new UpdateProduct(productRepo);

    await useCase.execute("Test Product", "20123456789", {
      name: "Updated Product",
      category: "Home",
      vendor_price: 150,
      customer_price: 250,
    }, "user-2");

    expect(productRepo.update).toHaveBeenCalledWith(
      "Test Product",
      "20123456789",
      expect.objectContaining({
        name: "Updated Product",
        category: "Home",
        vendor_price: 150,
        customer_price: 250,
        updated_by: "user-2",
      }),
    );
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

    const useCase = new UpdateProduct(productRepo);

    await expect(
      useCase.execute("", "20123456789", {}, "user-1"),
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

    const useCase = new UpdateProduct(productRepo);

    await expect(
      useCase.execute("Test Product", "123", {}, "user-1"),
    ).rejects.toThrow(
      "El CUIT del proveedor no es válido. Debe contener exactamente 11 dígitos.",
    );
  });

  it("throws when product is not found", async () => {
    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn().mockResolvedValue(null),
    };

    const useCase = new UpdateProduct(productRepo);

    await expect(
      useCase.execute("Test Product", "20123456789", {}, "user-1"),
    ).rejects.toThrow("Producto no encontrado.");
  });

  it("throws when next name is empty after trim", async () => {
    const existingProduct = makeProduct();

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn().mockResolvedValue(existingProduct),
    };

    const useCase = new UpdateProduct(productRepo);

    await expect(
      useCase.execute("Test Product", "20123456789", { name: "  " }, "user-1"),
    ).rejects.toThrow("El nombre del producto es obligatorio.");
  });

  it("throws when next category is empty after trim", async () => {
    const existingProduct = makeProduct();

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn().mockResolvedValue(existingProduct),
    };

    const useCase = new UpdateProduct(productRepo);

    await expect(
      useCase.execute("Test Product", "20123456789", { category: "" }, "user-1"),
    ).rejects.toThrow("La categoría del producto es obligatoria.");
  });

  it("throws when vendor_price is negative", async () => {
    const existingProduct = makeProduct();

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn().mockResolvedValue(existingProduct),
    };

    const useCase = new UpdateProduct(productRepo);

    await expect(
      useCase.execute("Test Product", "20123456789", { vendor_price: -1 }, "user-1"),
    ).rejects.toThrow("Los precios del producto no pueden ser negativos.");
  });

  it("throws when customer_price is negative", async () => {
    const existingProduct = makeProduct();

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn().mockResolvedValue(existingProduct),
    };

    const useCase = new UpdateProduct(productRepo);

    await expect(
      useCase.execute("Test Product", "20123456789", { customer_price: -5 }, "user-1"),
    ).rejects.toThrow("Los precios del producto no pueden ser negativos.");
  });

  it("throws when customer_price is less than vendor_price", async () => {
    const existingProduct = makeProduct();

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn().mockResolvedValue(existingProduct),
    };

    const useCase = new UpdateProduct(productRepo);

    await expect(
      useCase.execute("Test Product", "20123456789", { vendor_price: 300, customer_price: 200 }, "user-1"),
    ).rejects.toThrow(
      "El precio al cliente no puede ser menor que el precio del proveedor.",
    );
  });

  it("throws when trying to change vendor_cuit", async () => {
    const existingProduct = makeProduct();

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi.fn().mockResolvedValue(existingProduct),
    };

    const useCase = new UpdateProduct(productRepo);

    await expect(
      useCase.execute("Test Product", "20123456789", { vendor_cuit: "30987654321" }, "user-1"),
    ).rejects.toThrow(
      "No se permite modificar el proveedor asociado al producto.",
    );
  });

  it("throws when duplicate name exists for the same vendor", async () => {
    const existingProduct = makeProduct();
    const duplicateProduct = makeProduct({ name: "Other Product" });

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi
        .fn()
        .mockResolvedValueOnce(existingProduct)
        .mockResolvedValueOnce(duplicateProduct),
    };

    const useCase = new UpdateProduct(productRepo);

    await expect(
      useCase.execute("Test Product", "20123456789", { name: "Other Product" }, "user-1"),
    ).rejects.toThrow(
      "Ya existe un producto con ese nombre para el proveedor indicado.",
    );
  });

  it("preserves created_at and created_by when updating", async () => {
    const existingProduct = makeProduct({
      created_at: new Date("2024-01-01"),
      created_by: "user-1",
    });

    const productRepo: IProductRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByVendorCuit: vi.fn(),
      findByNameAndVendorCuit: vi
        .fn()
        .mockResolvedValueOnce(existingProduct)
        .mockResolvedValueOnce(null),
    };

    const useCase = new UpdateProduct(productRepo);

    await useCase.execute("Test Product", "20123456789", { name: "Renamed" }, "user-2");

    expect(productRepo.update).toHaveBeenCalledWith(
      "Test Product",
      "20123456789",
      expect.objectContaining({
        created_at: existingProduct.created_at,
        created_by: "user-1",
        updated_by: "user-2",
        name: "Renamed",
      }),
    );
  });
});
