import type { IProduct } from "../interfaces/IProduct.js";

export interface IProductRepository {
  save(product: IProduct): Promise<void>;

  findById(id: string): Promise<IProduct | null>;

  update(originalName: string, vendorCuit: string, product: IProduct): Promise<void>;

  findAll(): Promise<IProduct[]>;

  findByVendorCuit(vendorCuit: string): Promise<IProduct[]>;

  findByNameAndVendorCuit(
    name: string,
    vendorCuit: string,
  ): Promise<IProduct | null>;
}
