import { Router } from "express";
import { authenticate } from "../../../../auth/infrastructure/http/middleware/authMiddleware.js";
import {
  CompleteTransaction,
  CancelTransaction,
  GetAllTransactions,
  GetTransactionById,
} from "../../../application/index.js";
import { GetOrderById } from "../../../../orders/application/index.js";
import { TransactionController } from "../controllers/TransactionController.js";
import { MongoTransactionRepository } from "../../persistence/MongoTransactionRepository.js";
import { MongoOrderRepository } from "../../../../orders/infrastructure/persistence/MongoOrderRepository.js";

const router = Router();

const transactionRepository = new MongoTransactionRepository();
const orderRepository = new MongoOrderRepository();

const transactionController = new TransactionController(
  new CompleteTransaction(transactionRepository),
  new CancelTransaction(transactionRepository),
  new GetAllTransactions(transactionRepository),
  new GetTransactionById(transactionRepository),
  new GetOrderById(orderRepository),
);

router.get("/", authenticate, (req, res) =>
  transactionController.getAll(req, res),
);

router.get("/:id", authenticate, (req, res) =>
  transactionController.getById(req, res),
);

router.post("/:id/complete", authenticate, (req, res) =>
  transactionController.completeTransaction(req, res),
);

router.patch("/:id/complete", authenticate, (req, res) =>
  transactionController.completeTransaction(req, res),
);

router.post("/:id/cancel", authenticate, (req, res) =>
  transactionController.cancelTransaction(req, res),
);

router.patch("/:id/cancel", authenticate, (req, res) =>
  transactionController.cancelTransaction(req, res),
);

export default router;
