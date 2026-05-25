import type { IProduct, IProductRepository } from "../../domain/index.js";

export class GetAllProducts {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(): Promise<IProduct[]> {
    return this.productRepository.findAll();
  }
}
