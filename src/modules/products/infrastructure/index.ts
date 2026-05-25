import { ProductController } from "./http/controllers/ProductController.js";
import productRoutes from "./http/routes/productRoutes.js";
import { MongoProductRepository } from "./persistence/MongoProductRepository.js";
import { ProductModel } from "./persistence/ProductModel.js";

export {
  ProductController,
  productRoutes,
  MongoProductRepository,
  ProductModel,
};
