import { Router } from "express";
import { authenticate } from "../../../../auth/infrastructure/http/middleware/authMiddleware.js";
import { GetAllInventoryLots } from "../../../application/index.js";
import { GetAllProducts } from "../../../../products/application/index.js";
import { GetAllOrders } from "../../../../orders/application/index.js";
import { GetAllPartners } from "../../../../business-partner/application/index.js";
import { InventoryController } from "../controllers/InventoryController.js";
import { MongoInventoryRepository } from "../../persistence/MongoInventoryRepository.js";
import { MongoProductRepository } from "../../../../products/infrastructure/persistence/MongoProductRepository.js";
import { MongoOrderRepository } from "../../../../orders/infrastructure/persistence/MongoOrderRepository.js";
import { MongoBusinessPartnerRepository } from "../../../../business-partner/infrastructure/persistence/MongoBusinessPartnerRepository.js";

const router = Router();

const inventoryRepository = new MongoInventoryRepository();
const productRepository = new MongoProductRepository();
const orderRepository = new MongoOrderRepository();
const partnerRepository = new MongoBusinessPartnerRepository();

const inventoryController = new InventoryController(
  new GetAllInventoryLots(inventoryRepository),
  new GetAllProducts(productRepository),
  new GetAllOrders(orderRepository),
  new GetAllPartners(partnerRepository),
);

router.get("/", authenticate, (req, res) =>
  inventoryController.getAll(req, res),
);

export default router;
