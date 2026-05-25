import type { IProduct, IProductRepository } from "../../domain/index.js";
import { ProductModel, type ProductDocument } from "./ProductModel.js";

export class MongoProductRepository implements IProductRepository {
  async save(product: IProduct): Promise<void> {
    await ProductModel.create(product);
  }

  async findById(productId: string): Promise<IProduct | null> {
    try {
      const doc = await ProductModel.findById(productId);
      return doc ? (doc.toObject() as IProduct) : null;
    } catch {
      return null;
    }
  }

  async update(
    originalName: string,
    vendorCuit: string,
    product: IProduct,
  ): Promise<void> {
    await ProductModel.findOneAndUpdate(
      { name: originalName, vendor_cuit: vendorCuit },
      { $set: product },
    );
  }

  async findAll(): Promise<IProduct[]> {
    const docs = await ProductModel.find().sort({ name: 1, vendor_cuit: 1 });
    return docs.map((doc: ProductDocument) => doc.toObject() as IProduct);
  }

  async findByVendorCuit(vendorCuit: string): Promise<IProduct[]> {
    const docs = await ProductModel.find({ vendor_cuit: vendorCuit }).sort({
      name: 1,
    });
    return docs.map((doc: ProductDocument) => doc.toObject() as IProduct);
  }

  async findByNameAndVendorCuit(
    name: string,
    vendorCuit: string,
  ): Promise<IProduct | null> {
    const doc = await ProductModel.findOne({ name, vendor_cuit: vendorCuit });
    return doc ? (doc.toObject() as IProduct) : null;
  }
}
