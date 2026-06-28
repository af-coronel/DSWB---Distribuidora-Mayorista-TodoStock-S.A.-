import { Router } from "express";
import { authenticate } from "../../../../auth/infrastructure/http/middleware/authMiddleware.js";
import { authorizeRoles } from "../../../../auth/infrastructure/http/middleware/roleMiddleware.js";
import {
  CreatePurchaseOrder,
  VerifyPurchaseBudget,
  ConfirmPurchaseOrder,
  ReceivePurchaseOrder,
  AuditPurchaseOrder,
  CancelPurchaseOrder,
  CreateSaleOrder,
  ConfirmSalePayment,
  DispatchSaleOrder,
  MarkOrderDelivered,
  CancelSaleOrder,
  GetAllOrders,
  GetOrderById,
} from "../../../application/index.js";
import { GetAllPartners } from "../../../../business-partner/application/index.js";
import { GetAllProducts } from "../../../../products/application/index.js";
import {
  ReserveStock,
  ReleaseReservedStock,
  ConfirmSale,
  CreateInventoryLot,
  GetAvailableStockByProduct,
} from "../../../../inventory/application/index.js";
import {
  CreateTransaction,
  CancelTransaction,
} from "../../../../transactions/application/index.js";
import { OrderController } from "../controllers/OrderController.js";
import { MongoOrderRepository } from "../../persistence/MongoOrderRepository.js";
import { MongoBusinessPartnerRepository } from "../../../../business-partner/infrastructure/persistence/MongoBusinessPartnerRepository.js";
import { MongoProductRepository } from "../../../../products/infrastructure/persistence/MongoProductRepository.js";
import { MongoInventoryRepository } from "../../../../inventory/infrastructure/persistence/MongoInventoryRepository.js";
import { MongoTransactionRepository } from "../../../../transactions/infrastructure/persistence/MongoTransactionRepository.js";

const router = Router();

const orderRepository = new MongoOrderRepository();
const partnerRepository = new MongoBusinessPartnerRepository();
const productRepository = new MongoProductRepository();
const inventoryRepository = new MongoInventoryRepository();
const transactionRepository = new MongoTransactionRepository();

const reserveStock = new ReserveStock(inventoryRepository, productRepository);
const releaseReservedStock = new ReleaseReservedStock(
  inventoryRepository,
  productRepository,
);
const confirmSale = new ConfirmSale(inventoryRepository, productRepository);
const createInventoryLot = new CreateInventoryLot(
  inventoryRepository,
  productRepository,
);
const createTransaction = new CreateTransaction(
  transactionRepository,
  orderRepository,
);
const cancelTransaction = new CancelTransaction(transactionRepository);

const orderController = new OrderController(
  new CreatePurchaseOrder(
    orderRepository,
    partnerRepository,
    productRepository,
    createTransaction,
  ),
  new VerifyPurchaseBudget(orderRepository, transactionRepository),
  new ConfirmPurchaseOrder(orderRepository),
  new ReceivePurchaseOrder(orderRepository),
  new AuditPurchaseOrder(
    orderRepository,
    createInventoryLot,
    transactionRepository,
  ),
  new CancelPurchaseOrder(
    orderRepository,
    transactionRepository,
    cancelTransaction,
  ),
  new CreateSaleOrder(
    orderRepository,
    partnerRepository,
    productRepository,
    reserveStock,
    createTransaction,
  ),
  new ConfirmSalePayment(orderRepository, confirmSale, transactionRepository),
  new DispatchSaleOrder(orderRepository),
  new MarkOrderDelivered(orderRepository),
  new CancelSaleOrder(orderRepository, releaseReservedStock),
  new GetAllOrders(orderRepository),
  new GetOrderById(orderRepository),
  new GetAllPartners(partnerRepository),
  new GetAllProducts(productRepository),
  new GetAvailableStockByProduct(inventoryRepository, productRepository),
);

router.use(
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR", "CLIENT"]),
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
router.get("/:id", authenticate, (req, res) =>
  orderController.getById(req, res),
);

// --- Órdenes de compra ---
router.post(
  "/purchase",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.createPurchaseOrder(req, res),
);
router.post(
  "/purchase/:id/verify-budget",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.verifyPurchaseBudget(req, res),
);
router.patch(
  "/purchase/:id/verify-budget",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.verifyPurchaseBudget(req, res),
);
router.post(
  "/purchase/:id/confirm",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.confirmPurchaseOrder(req, res),
);
router.patch(
  "/purchase/:id/confirm",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.confirmPurchaseOrder(req, res),
);
router.post(
  "/purchase/:id/receive",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.receivePurchaseOrder(req, res),
);
router.patch(
  "/purchase/:id/receive",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.receivePurchaseOrder(req, res),
);
router.get(
  "/purchase/:id/audit",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.renderAuditForm(req, res),
);
router.post(
  "/purchase/:id/audit",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.auditPurchaseOrder(req, res),
);
router.post(
  "/purchase/:id/cancel",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.cancelPurchaseOrder(req, res),
);
router.patch(
  "/purchase/:id/cancel",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.cancelPurchaseOrder(req, res),
);

// --- Órdenes de venta ---
router.post(
  "/sale",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.createSaleOrder(req, res),
);
router.post(
  "/sale/:id/confirm-payment",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.confirmSalePayment(req, res),
);
router.patch(
  "/sale/:id/confirm-payment",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.confirmSalePayment(req, res),
);
router.post(
  "/sale/:id/dispatch",
  authenticate,
  authorizeRoles(["ADMIN", "INVENTORY"]),
  (req, res) => orderController.dispatchSaleOrder(req, res),
);
router.patch(
  "/sale/:id/dispatch",
  authenticate,
  authorizeRoles(["ADMIN", "INVENTORY"]),
  (req, res) => orderController.dispatchSaleOrder(req, res),
);
router.post(
  "/sale/:id/deliver",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.markOrderDelivered(req, res),
);
router.patch(
  "/sale/:id/deliver",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.markOrderDelivered(req, res),
);
router.post(
  "/sale/:id/cancel",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.cancelSaleOrder(req, res),
);
router.patch(
  "/sale/:id/cancel",
  authenticate,
  authorizeRoles(["ADMIN", "COMMERCIAL", "VENDOR"]),
  (req, res) => orderController.cancelSaleOrder(req, res),
);

export default router;
