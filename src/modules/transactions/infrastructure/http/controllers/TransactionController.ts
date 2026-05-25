import type { Request, Response } from "express";
import type { CreateTransaction } from "../../../application/use-cases/CreateTransaction.js";
import type { CompleteTransaction } from "../../../application/use-cases/CompleteTransaction.js";
import type { CancelTransaction } from "../../../application/use-cases/CancelTransaction.js";
import type { GetAllTransactions } from "../../../application/use-cases/GetAllTransactions.js";
import type { GetTransactionById } from "../../../application/use-cases/GetTransactionById.js";
import type { GetAllOrders } from "../../../../orders/application/use-cases/GetAllOrders.js";
import type { TransactionType } from "../../../domain/index.js";

type AuthenticatedRequest = Request & {
  user?: { id?: string };
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const TYPE_LABEL: Record<string, string> = {
  PAYMENT: "Orden de Pago",
  COLLECTION: "Orden de Cobro",
};

const isFormRequest = (req: Request) =>
  req.headers["content-type"]?.includes("application/x-www-form-urlencoded");

export class TransactionController {
  constructor(
    private readonly createTransactionUseCase: CreateTransaction,
    private readonly completeTransactionUseCase: CompleteTransaction,
    private readonly cancelTransactionUseCase: CancelTransaction,
    private readonly getAllTransactionsUseCase: GetAllTransactions,
    private readonly getTransactionByIdUseCase: GetTransactionById,
    private readonly getAllOrdersUseCase: GetAllOrders,
  ) {}

  async getAll(req: Request, res: Response) {
    try {
      const type = req.query.type as TransactionType | undefined;
      const transactions = await this.getAllTransactionsUseCase.execute(type);

      if (req.headers.accept?.includes("text/html")) {
        return res.render("transactions/list", {
          activeTab: "transactions",
          transactions,
          activeType: type || "ALL",
          statusLabel: STATUS_LABEL,
          statusBadge: STATUS_BADGE,
          typeLabel: TYPE_LABEL,
        });
      }

      return res.status(200).json(transactions);
    } catch (error: any) {
      return res.status(500).json({ error: true, message: error.message });
    }
  }

  async renderDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const transaction = await this.getTransactionByIdUseCase.execute(id);

      return res.render("transactions/detail", {
        activeTab: "transactions",
        transaction,
        statusLabel: STATUS_LABEL[transaction.status] || transaction.status,
        statusBadge: STATUS_BADGE[transaction.status] || "secondary",
        typeLabel: TYPE_LABEL[transaction.transaction_type],
        flashError: (req.query.error as string) || undefined,
      });
    } catch (error: any) {
      return res.status(404).render("transactions/detail", {
        activeTab: "transactions",
        errorMessage: error.message,
      });
    }
  }

  async getById(req: Request, res: Response) {
    if (req.headers.accept?.includes("text/html")) {
      return this.renderDetail(req, res);
    }
    try {
      const transaction = await this.getTransactionByIdUseCase.execute(req.params.id);
      return res.status(200).json(transaction);
    } catch (error: any) {
      return res.status(404).json({ error: true, message: error.message });
    }
  }

  async renderCreateForm(req: Request, res: Response) {
    const orders = await this.getAllOrdersUseCase.execute();
    return res.render("transactions/create", {
      activeTab: "transactions",
      orders,
      errorMessage: undefined,
    });
  }

  async createTransaction(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { order_id, transaction_type } = req.body;

      if (!transaction_type || !["PAYMENT", "COLLECTION"].includes(transaction_type)) {
        throw new Error("El tipo de transacción es requerido (PAYMENT o COLLECTION).");
      }

      const transaction = await this.createTransactionUseCase.execute(
        order_id,
        transaction_type as TransactionType,
        request.user?.id || "unknown",
      );

      if (isFormRequest(req)) return res.redirect(`/api/transactions/${transaction.id}`);
      return res.status(201).json({ message: "Transacción creada", item: transaction });
    } catch (error: any) {
      if (isFormRequest(req)) {
        const orders = await this.getAllOrdersUseCase.execute();
        return res.status(400).render("transactions/create", {
          activeTab: "transactions",
          orders,
          errorMessage: error.message,
        });
      }
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async completeTransaction(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params;
      const { pos_number, document_number } = req.body;
      await this.completeTransactionUseCase.execute(
        id,
        request.user?.id || "unknown",
        pos_number,
        document_number,
      );
      if (isFormRequest(req)) return res.redirect(`/api/transactions/${id}`);
      return res.status(200).json({ message: "Transacción completada" });
    } catch (error: any) {
      if (isFormRequest(req)) return res.redirect(`/api/transactions/${req.params.id}?error=${encodeURIComponent(error.message)}`);
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async cancelTransaction(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params;
      await this.cancelTransactionUseCase.execute(id, request.user?.id || "unknown");
      if (isFormRequest(req)) return res.redirect(`/api/transactions/${id}`);
      return res.status(200).json({ message: "Transacción cancelada" });
    } catch (error: any) {
      if (isFormRequest(req)) return res.redirect(`/api/transactions/${req.params.id}?error=${encodeURIComponent(error.message)}`);
      return res.status(400).json({ error: true, message: error.message });
    }
  }
}
