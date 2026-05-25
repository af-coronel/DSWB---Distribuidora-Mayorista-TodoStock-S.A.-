import { Router } from "express";
import { authenticate } from "../../../../auth/infrastructure/http/middleware/authMiddleware.js";
import { GetAllInventoryLots } from "../../../application/index.js";
import { GetAllProducts } from "../../../../products/application/index.js";
import { InventoryController } from "../controllers/InventoryController.js";
import { MongoInventoryRepository } from "../../persistence/MongoInventoryRepository.js";
import { MongoProductRepository } from "../../../../products/infrastructure/persistence/MongoProductRepository.js";

const router = Router();

const inventoryRepository = new MongoInventoryRepository();
const productRepository = new MongoProductRepository();

const inventoryController = new InventoryController(
  new GetAllInventoryLots(inventoryRepository),
  new GetAllProducts(productRepository),
);

router.get("/", authenticate, (req, res) =>
  inventoryController.getAll(req, res),
);

export default router;
