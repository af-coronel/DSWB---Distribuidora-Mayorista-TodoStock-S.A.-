import type { IProduct } from "../interfaces/IProduct.js";

export interface IProductRepository {
  save(product: IProduct): Promise<void>;

  update(
    originalName: string,
    vendorCuit: string,
    product: IProduct,
  ): Promise<void>;

  findById(productId: string): Promise<IProduct | null>;

  findAll(): Promise<IProduct[]>;

  findByVendorCuit(vendorCuit: string): Promise<IProduct[]>;

  findByNameAndVendorCuit(
    name: string,
    vendorCuit: string,
  ): Promise<IProduct | null>;
}
