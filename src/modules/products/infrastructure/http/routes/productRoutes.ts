import { Router } from "express";
import { authenticate } from "../../../../auth/infrastructure/http/middleware/authMiddleware.js";
import { authorizeRoles } from "../../../../auth/infrastructure/http/middleware/roleMiddleware.js";
import { GetAllPartners } from "../../../../business-partner/application/index.js";
import { GetAllProducts, RegisterProduct } from "../../../application/index.js";
import { ProductController } from "../controllers/ProductController.js";
import { MongoProductRepository } from "../../persistence/MongoProductRepository.js";
import { MongoBusinessPartnerRepository } from "../../../../business-partner/infrastructure/persistence/MongoBusinessPartnerRepository.js";

const router = Router();

const productRepository = new MongoProductRepository();
const partnerRepository = new MongoBusinessPartnerRepository();
const registerProductUseCase = new RegisterProduct(
  productRepository,
  partnerRepository,
);
const getAllProductsUseCase = new GetAllProducts(productRepository);
const getAllPartnersUseCase = new GetAllPartners(partnerRepository);
const productController = new ProductController(
  registerProductUseCase,
  getAllProductsUseCase,
  getAllPartnersUseCase,
);

router.get("/new", authenticate, (req, res) =>
  productController.renderCreateForm(req, res),
);

router.post(
  "/",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => productController.create(req, res),
);

router.get("/", authenticate, (req, res) => productController.getAll(req, res));

export default router;
