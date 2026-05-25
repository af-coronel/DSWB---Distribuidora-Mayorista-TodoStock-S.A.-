import type { Request, Response } from "express";
import type { CreatePurchaseOrder } from "../../../application/use-cases/CreatePurchaseOrder.js";
import type { ConfirmPurchaseOrder } from "../../../application/use-cases/ConfirmPurchaseOrder.js";
import type { ReceivePurchaseOrder } from "../../../application/use-cases/ReceivePurchaseOrder.js";
import type { CancelPurchaseOrder } from "../../../application/use-cases/CancelPurchaseOrder.js";
import type { CreateSaleOrder } from "../../../application/use-cases/CreateSaleOrder.js";
import type { ConfirmSalePayment } from "../../../application/use-cases/ConfirmSalePayment.js";
import type { MarkOrderDelivered } from "../../../application/use-cases/MarkOrderDelivered.js";
import type { CancelSaleOrder } from "../../../application/use-cases/CancelSaleOrder.js";
import type { GetAllOrders } from "../../../application/use-cases/GetAllOrders.js";
import type { GetOrderById } from "../../../application/use-cases/GetOrderById.js";
import type { IOrderItem, OrderType } from "../../../domain/index.js";

type AuthenticatedRequest = Request & {
  user?: { id?: string };
};

export class OrderController {
  constructor(
    private readonly createPurchaseOrderUseCase: CreatePurchaseOrder,
    private readonly confirmPurchaseOrderUseCase: ConfirmPurchaseOrder,
    private readonly receivePurchaseOrderUseCase: ReceivePurchaseOrder,
    private readonly cancelPurchaseOrderUseCase: CancelPurchaseOrder,
    private readonly createSaleOrderUseCase: CreateSaleOrder,
    private readonly confirmSalePaymentUseCase: ConfirmSalePayment,
    private readonly markOrderDeliveredUseCase: MarkOrderDelivered,
    private readonly cancelSaleOrderUseCase: CancelSaleOrder,
    private readonly getAllOrdersUseCase: GetAllOrders,
    private readonly getOrderByIdUseCase: GetOrderById,
  ) {}

  async createPurchaseOrder(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
      const { partner_cuit, items, scheduled_date, notes } = req.body;

      const order = await this.createPurchaseOrderUseCase.execute(
        partner_cuit,
        items as IOrderItem[],
        request.user?.id || "unknown",
        scheduled_date ? new Date(scheduled_date) : undefined,
        notes,
      );

      return res.status(201).json({ message: "Orden de compra creada", item: order });
    } catch (error: any) {
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async confirmPurchaseOrder(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
      const { id } = req.params;

      await this.confirmPurchaseOrderUseCase.execute(id, request.user?.id || "unknown");

      return res.status(200).json({ message: "Orden de compra confirmada" });
    } catch (error: any) {
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async receivePurchaseOrder(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
      const { id } = req.params;

      await this.receivePurchaseOrderUseCase.execute(id, request.user?.id || "unknown");

      return res.status(200).json({ message: "Orden de compra marcada como recibida" });
    } catch (error: any) {
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async cancelPurchaseOrder(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
      const { id } = req.params;

      await this.cancelPurchaseOrderUseCase.execute(id, request.user?.id || "unknown");

      return res.status(200).json({ message: "Orden de compra cancelada" });
    } catch (error: any) {
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async createSaleOrder(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
      const { partner_cuit, items, scheduled_date, notes } = req.body;

      const order = await this.createSaleOrderUseCase.execute(
        partner_cuit,
        items as IOrderItem[],
        request.user?.id || "unknown",
        scheduled_date ? new Date(scheduled_date) : undefined,
        notes,
      );

      return res.status(201).json({ message: "Orden de venta creada", item: order });
    } catch (error: any) {
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async confirmSalePayment(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
      const { id } = req.params;

      await this.confirmSalePaymentUseCase.execute(id, request.user?.id || "unknown");

      return res.status(200).json({ message: "Pago de orden de venta confirmado" });
    } catch (error: any) {
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async markOrderDelivered(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
      const { id } = req.params;

      await this.markOrderDeliveredUseCase.execute(id, request.user?.id || "unknown");

      return res.status(200).json({ message: "Orden de venta marcada como entregada" });
    } catch (error: any) {
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async cancelSaleOrder(req: Request, res: Response) {
    try {
      const request = req as AuthenticatedRequest;
      const { id } = req.params;

      await this.cancelSaleOrderUseCase.execute(id, request.user?.id || "unknown");

      return res.status(200).json({ message: "Orden de venta cancelada" });
    } catch (error: any) {
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const orderType = req.query.type as OrderType | undefined;
      const orders = await this.getAllOrdersUseCase.execute(orderType);

      return res.status(200).json(orders);
    } catch (error: any) {
      return res.status(500).json({ error: true, message: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await this.getOrderByIdUseCase.execute(id);

      return res.status(200).json(order);
    } catch (error: any) {
      return res.status(404).json({ error: true, message: error.message });
    }
  }
}
