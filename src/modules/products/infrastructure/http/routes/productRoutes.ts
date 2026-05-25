import { Router } from "express";
import { authenticate } from "../../../../auth/infrastructure/http/middleware/authMiddleware.js";
import { GetAllProducts } from "../../../application/index.js";
import { ProductController } from "../controllers/ProductController.js";
import { MongoProductRepository } from "../../persistence/MongoProductRepository.js";

const router = Router();

const productRepository = new MongoProductRepository();
const getAllProductsUseCase = new GetAllProducts(productRepository);
const productController = new ProductController(getAllProductsUseCase);

router.get("/new", authenticate, (req, res) =>
  productController.renderCreateForm(req, res),
);

router.get("/", authenticate, (req, res) => productController.getAll(req, res));

export default router;
