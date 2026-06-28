import { Router } from "express";
import { authenticate } from "../../../../auth/infrastructure/http/middleware/authMiddleware.js";
import { authorizeRoles } from "../../../../auth/infrastructure/http/middleware/roleMiddleware.js";
import { GetAllPartners } from "../../../../business-partner/application/index.js";
import {
  FindProductByNameAndVendorCuit,
  GetAllProducts,
  RegisterProduct,
  UpdateProduct,
} from "../../../application/index.js";
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
const findProductByNameAndVendorCuitUseCase =
  new FindProductByNameAndVendorCuit(productRepository);
const updateProductUseCase = new UpdateProduct(productRepository);
const productController = new ProductController(
  registerProductUseCase,
  getAllProductsUseCase,
  getAllPartnersUseCase,
  findProductByNameAndVendorCuitUseCase,
  updateProductUseCase,
);

router.use(authenticate, authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR", "CLIENT"]));

router.get("/new", authenticate, (req, res) =>
  productController.renderCreateForm(req, res),
);

router.post(
  "/",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => productController.create(req, res),
);

router.get("/:vendor_cuit/:name/edit", authenticate, (req, res) =>
  productController.renderEditForm(req, res),
);

router.post(
  "/:vendor_cuit/:name/edit",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => productController.update(req, res),
);

router.get("/", authenticate, (req, res) => productController.getAll(req, res));

export default router;
