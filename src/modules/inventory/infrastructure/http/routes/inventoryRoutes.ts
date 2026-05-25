import { Router } from "express";
import { authenticate } from "../../../../auth/infrastructure/http/middleware/authMiddleware.js";
import { authorizeRoles } from "../../../../auth/infrastructure/http/middleware/roleMiddleware.js";
import { CreateInventoryLot, GetAllInventoryLots } from "../../../application/index.js";
import { GetAllProducts } from "../../../../products/application/index.js";
import { InventoryController } from "../controllers/InventoryController.js";
import { MongoInventoryRepository } from "../../persistence/MongoInventoryRepository.js";
import { MongoProductRepository } from "../../../../products/infrastructure/persistence/MongoProductRepository.js";

const router = Router();

const inventoryRepository = new MongoInventoryRepository();
const productRepository = new MongoProductRepository();

const inventoryController = new InventoryController(
  new CreateInventoryLot(inventoryRepository, productRepository),
  new GetAllInventoryLots(inventoryRepository),
  new GetAllProducts(productRepository),
);

router.get("/new", authenticate, authorizeRoles(["ADMIN", "VENDOR"]), (req, res) =>
  inventoryController.renderCreateForm(req, res),
);

router.get("/", authenticate, (req, res) =>
  inventoryController.getAll(req, res),
);

router.post(
  "/",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => inventoryController.createLot(req, res),
);

export default router;
