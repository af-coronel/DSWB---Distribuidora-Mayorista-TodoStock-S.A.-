import { Router } from "express";
import { authenticate } from "../../../../auth/infrastructure/http/middleware/authMiddleware.js";
import { authorizeRoles } from "../../../../auth/infrastructure/http/middleware/roleMiddleware.js";
import {
  CreatePurchaseOrder,
  ConfirmPurchaseOrder,
  ReceivePurchaseOrder,
  CancelPurchaseOrder,
  CreateSaleOrder,
  ConfirmSalePayment,
  MarkOrderDelivered,
  CancelSaleOrder,
  GetAllOrders,
  GetOrderById,
} from "../../../application/index.js";
import { GetAllPartners } from "../../../../business-partner/application/index.js";
import { GetAllProducts } from "../../../../products/application/index.js";
import { OrderController } from "../controllers/OrderController.js";
import { MongoOrderRepository } from "../../persistence/MongoOrderRepository.js";
import { MongoBusinessPartnerRepository } from "../../../../business-partner/infrastructure/persistence/MongoBusinessPartnerRepository.js";
import { MongoProductRepository } from "../../../../products/infrastructure/persistence/MongoProductRepository.js";

const router = Router();

const orderRepository = new MongoOrderRepository();
const partnerRepository = new MongoBusinessPartnerRepository();
const productRepository = new MongoProductRepository();

const orderController = new OrderController(
  new CreatePurchaseOrder(orderRepository, partnerRepository, productRepository),
  new ConfirmPurchaseOrder(orderRepository),
  new ReceivePurchaseOrder(orderRepository),
  new CancelPurchaseOrder(orderRepository),
  new CreateSaleOrder(orderRepository, partnerRepository, productRepository),
  new ConfirmSalePayment(orderRepository),
  new MarkOrderDelivered(orderRepository),
  new CancelSaleOrder(orderRepository),
  new GetAllOrders(orderRepository),
  new GetOrderById(orderRepository),
  new GetAllPartners(partnerRepository),
  new GetAllProducts(productRepository),
);

// --- Vistas HTML ---
router.get("/purchase/new", authenticate, (req, res) =>
  orderController.renderCreatePurchaseForm(req, res),
);
router.get("/sale/new", authenticate, (req, res) =>
  orderController.renderCreateSaleForm(req, res),
);

// --- Consultas ---
router.get("/", authenticate, (req, res) => orderController.getAll(req, res));
router.get("/:id", authenticate, (req, res) => orderController.getById(req, res));

// --- Órdenes de compra ---
router.post(
  "/purchase",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.createPurchaseOrder(req, res),
);
router.post(
  "/purchase/:id/confirm",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.confirmPurchaseOrder(req, res),
);
router.patch(
  "/purchase/:id/confirm",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.confirmPurchaseOrder(req, res),
);
router.post(
  "/purchase/:id/receive",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.receivePurchaseOrder(req, res),
);
router.patch(
  "/purchase/:id/receive",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.receivePurchaseOrder(req, res),
);
router.post(
  "/purchase/:id/cancel",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.cancelPurchaseOrder(req, res),
);
router.patch(
  "/purchase/:id/cancel",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.cancelPurchaseOrder(req, res),
);

// --- Órdenes de venta ---
router.post(
  "/sale",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.createSaleOrder(req, res),
);
router.post(
  "/sale/:id/confirm-payment",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.confirmSalePayment(req, res),
);
router.patch(
  "/sale/:id/confirm-payment",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.confirmSalePayment(req, res),
);
router.post(
  "/sale/:id/deliver",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.markOrderDelivered(req, res),
);
router.patch(
  "/sale/:id/deliver",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.markOrderDelivered(req, res),
);
router.post(
  "/sale/:id/cancel",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.cancelSaleOrder(req, res),
);
router.patch(
  "/sale/:id/cancel",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => orderController.cancelSaleOrder(req, res),
);

export default router;
