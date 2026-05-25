import type { Request, Response } from "express";
import type { CompleteTransaction } from "../../../application/use-cases/CompleteTransaction.js";
import type { CancelTransaction } from "../../../application/use-cases/CancelTransaction.js";
import type { GetAllTransactions } from "../../../application/use-cases/GetAllTransactions.js";
import type { GetTransactionById } from "../../../application/use-cases/GetTransactionById.js";
import type { GetOrderById } from "../../../../orders/application/use-cases/GetOrderById.js";
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
    private readonly completeTransactionUseCase: CompleteTransaction,
    private readonly cancelTransactionUseCase: CancelTransaction,
    private readonly getAllTransactionsUseCase: GetAllTransactions,
    private readonly getTransactionByIdUseCase: GetTransactionById,
    private readonly getOrderByIdUseCase: GetOrderById,
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
      const { id } = req.params as { id: string };
      const transaction = await this.getTransactionByIdUseCase.execute(id);

      let order = null;
      if (transaction.order_id) {
        try {
          order = await this.getOrderByIdUseCase.execute(transaction.order_id);
        } catch {
          // orden no encontrada, se muestra la transacción sin acciones de orden
        }
      }

      return res.render("transactions/detail", {
        activeTab: "transactions",
        transaction,
        order,
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
      const transaction = await this.getTransactionByIdUseCase.execute(req.params.id as string);
      return res.status(200).json(transaction);
    } catch (error: any) {
      return res.status(404).json({ error: true, message: error.message });
    }
  }

  async completeTransaction(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
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
      const { id } = req.params as { id: string };
      await this.cancelTransactionUseCase.execute(id, request.user?.id || "unknown");
      if (isFormRequest(req)) return res.redirect(`/api/transactions/${id}`);
      return res.status(200).json({ message: "Transacción cancelada" });
    } catch (error: any) {
      if (isFormRequest(req)) return res.redirect(`/api/transactions/${req.params.id}?error=${encodeURIComponent(error.message)}`);
      return res.status(400).json({ error: true, message: error.message });
    }
  }
}
