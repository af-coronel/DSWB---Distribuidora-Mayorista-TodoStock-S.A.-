import type { Request, Response } from "express";
import type { CreatePurchaseOrder } from "../../../application/use-cases/CreatePurchaseOrder.js";
import type { ConfirmPurchaseOrder } from "../../../application/use-cases/ConfirmPurchaseOrder.js";
import type { ReceivePurchaseOrder } from "../../../application/use-cases/ReceivePurchaseOrder.js";
import type { CancelPurchaseOrder } from "../../../application/use-cases/CancelPurchaseOrder.js";
import type { CreateSaleOrder } from "../../../application/use-cases/CreateSaleOrder.js";
import type { ConfirmSalePayment } from "../../../application/use-cases/ConfirmSalePayment.js";
import type { DispatchSaleOrder } from "../../../application/use-cases/DispatchSaleOrder.js";
import type { MarkOrderDelivered } from "../../../application/use-cases/MarkOrderDelivered.js";
import type { CancelSaleOrder } from "../../../application/use-cases/CancelSaleOrder.js";
import type { AuditPurchaseOrder } from "../../../application/use-cases/AuditPurchaseOrder.js";
import type { AuditItemInput } from "../../../application/use-cases/AuditPurchaseOrder.js";
import type { GetAllOrders } from "../../../application/use-cases/GetAllOrders.js";
import type { GetOrderById } from "../../../application/use-cases/GetOrderById.js";
import type { GetAllPartners } from "../../../../business-partner/application/index.js";
import type { GetAllProducts } from "../../../../products/application/index.js";
import type { CreatePurchaseOrderItemInput } from "../../../application/use-cases/CreatePurchaseOrder.js";
import type { CreateSaleOrderItemInput } from "../../../application/use-cases/CreateSaleOrder.js";
import type { OrderType } from "../../../domain/index.js";

type AuthenticatedRequest = Request & {
  user?: { id?: string };
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_BUDGET: "Presupuesto pendiente",
  CONFIRMED: "Confirmada",
  RECEIVED: "Recibida",
  AUDITED: "Auditada",
  PENDING_PAYMENT: "Pago pendiente",
  PENDING_ASSEMBLY: "En preparación",
  DISPATCHING: "A despachar",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING_BUDGET: "warning",
  CONFIRMED: "primary",
  RECEIVED: "info",
  AUDITED: "success",
  PENDING_PAYMENT: "warning",
  PENDING_ASSEMBLY: "info",
  DISPATCHING: "primary",
  DELIVERED: "success",
  CANCELLED: "danger",
};

const isFormRequest = (req: Request) =>
  req.headers["content-type"]?.includes("application/x-www-form-urlencoded");

export class OrderController {
  constructor(
    private readonly createPurchaseOrderUseCase: CreatePurchaseOrder,
    private readonly confirmPurchaseOrderUseCase: ConfirmPurchaseOrder,
    private readonly receivePurchaseOrderUseCase: ReceivePurchaseOrder,
    private readonly auditPurchaseOrderUseCase: AuditPurchaseOrder,
    private readonly cancelPurchaseOrderUseCase: CancelPurchaseOrder,
    private readonly createSaleOrderUseCase: CreateSaleOrder,
    private readonly confirmSalePaymentUseCase: ConfirmSalePayment,
    private readonly dispatchSaleOrderUseCase: DispatchSaleOrder,
    private readonly markOrderDeliveredUseCase: MarkOrderDelivered,
    private readonly cancelSaleOrderUseCase: CancelSaleOrder,
    private readonly getAllOrdersUseCase: GetAllOrders,
    private readonly getOrderByIdUseCase: GetOrderById,
    private readonly getAllPartnersUseCase: GetAllPartners,
    private readonly getAllProductsUseCase: GetAllProducts,
  ) {}

  // --- Vistas HTML ---

  async renderCreatePurchaseForm(req: Request, res: Response) {
    const partners = await this.getAllPartnersUseCase.execute();
    const vendors = partners.filter((p) => p.active && p.type.includes("VENDOR"));
    const products = await this.getAllProductsUseCase.execute();

    return res.render("orders/create-purchase", {
      activeTab: "orders",
      vendors,
      products,
      errorMessage: undefined,
    });
  }

  async renderCreateSaleForm(req: Request, res: Response) {
    const partners = await this.getAllPartnersUseCase.execute();
    const clients = partners.filter((p) => p.active && p.type.includes("CLIENT"));
    const products = await this.getAllProductsUseCase.execute();

    return res.render("orders/create-sale", {
      activeTab: "orders",
      clients,
      products,
      errorMessage: undefined,
    });
  }

  async renderDetail(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const order = await this.getOrderByIdUseCase.execute(id);
      const partners = await this.getAllPartnersUseCase.execute();
      const partner = partners.find((p) => p.cuit === order.partner_cuit);

      return res.render("orders/detail", {
        activeTab: "orders",
        order,
        partnerName: partner?.legal_name || order.partner_cuit,
        statusLabel: STATUS_LABEL[order.status] || order.status,
        statusBadge: STATUS_BADGE[order.status] || "secondary",
        flashError: (req.query.error as string) || undefined,
      });
    } catch (error: any) {
      return res.status(404).render("orders/detail", {
        activeTab: "orders",
        errorMessage: error.message,
      });
    }
  }

  // --- Órdenes de compra ---

  async createPurchaseOrder(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;

    try {
      const { partner_cuit, items, scheduled_date, notes } = req.body;

      const order = await this.createPurchaseOrderUseCase.execute(
        partner_cuit,
        items as CreatePurchaseOrderItemInput[],
        request.user?.id || "unknown",
        scheduled_date ? new Date(scheduled_date) : undefined,
        notes,
      );

      if (isFormRequest(req)) return res.redirect(`/api/orders/${order.id}`);
      return res.status(201).json({ message: "Orden de compra creada", item: order });
    } catch (error: any) {
      if (isFormRequest(req)) {
        const partners = await this.getAllPartnersUseCase.execute();
        const vendors = partners.filter((p) => p.active && p.type.includes("VENDOR"));
        const products = await this.getAllProductsUseCase.execute();
        return res.status(400).render("orders/create-purchase", {
          activeTab: "orders",
          vendors,
          products,
          errorMessage: error.message,
        });
      }
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async confirmPurchaseOrder(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      await this.confirmPurchaseOrderUseCase.execute(id, request.user?.id || "unknown");
      if (isFormRequest(req)) return res.redirect(`/api/orders/${id}`);
      return res.status(200).json({ message: "Orden de compra confirmada" });
    } catch (error: any) {
      if (isFormRequest(req)) return res.redirect(`/api/orders/${req.params.id}?error=${encodeURIComponent(error.message)}`);
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async receivePurchaseOrder(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      await this.receivePurchaseOrderUseCase.execute(id, request.user?.id || "unknown");
      if (isFormRequest(req)) return res.redirect(`/api/orders/${id}`);
      return res.status(200).json({ message: "Orden de compra marcada como recibida" });
    } catch (error: any) {
      if (isFormRequest(req)) return res.redirect(`/api/orders/${req.params.id}?error=${encodeURIComponent(error.message)}`);
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async cancelPurchaseOrder(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      await this.cancelPurchaseOrderUseCase.execute(id, request.user?.id || "unknown");
      if (isFormRequest(req)) return res.redirect(`/api/orders/${id}`);
      return res.status(200).json({ message: "Orden de compra cancelada" });
    } catch (error: any) {
      if (isFormRequest(req)) return res.redirect(`/api/orders/${req.params.id}?error=${encodeURIComponent(error.message)}`);
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  // --- Órdenes de venta ---

  async createSaleOrder(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;

    try {
      const { partner_cuit, items, scheduled_date, notes } = req.body;

      const order = await this.createSaleOrderUseCase.execute(
        partner_cuit,
        items as CreateSaleOrderItemInput[],
        request.user?.id || "unknown",
        scheduled_date ? new Date(scheduled_date) : undefined,
        notes,
      );

      if (isFormRequest(req)) return res.redirect(`/api/orders/${order.id}`);
      return res.status(201).json({ message: "Orden de venta creada", item: order });
    } catch (error: any) {
      if (isFormRequest(req)) {
        const partners = await this.getAllPartnersUseCase.execute();
        const clients = partners.filter((p) => p.active && p.type.includes("CLIENT"));
        const products = await this.getAllProductsUseCase.execute();
        return res.status(400).render("orders/create-sale", {
          activeTab: "orders",
          clients,
          products,
          errorMessage: error.message,
        });
      }
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async confirmSalePayment(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      await this.confirmSalePaymentUseCase.execute(id, request.user?.id || "unknown");
      if (isFormRequest(req)) return res.redirect(`/api/orders/${id}`);
      return res.status(200).json({ message: "Pago de orden de venta confirmado" });
    } catch (error: any) {
      if (isFormRequest(req)) return res.redirect(`/api/orders/${req.params.id}?error=${encodeURIComponent(error.message)}`);
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async markOrderDelivered(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      await this.markOrderDeliveredUseCase.execute(id, request.user?.id || "unknown");
      if (isFormRequest(req)) return res.redirect(`/api/orders/${id}`);
      return res.status(200).json({ message: "Orden de venta marcada como entregada" });
    } catch (error: any) {
      if (isFormRequest(req)) return res.redirect(`/api/orders/${req.params.id}?error=${encodeURIComponent(error.message)}`);
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async dispatchSaleOrder(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      await this.dispatchSaleOrderUseCase.execute(id, request.user?.id || "unknown");
      if (isFormRequest(req)) return res.redirect(`/api/orders/${id}`);
      return res.status(200).json({ message: "Orden de venta marcada como a despachar" });
    } catch (error: any) {
      if (isFormRequest(req)) return res.redirect(`/api/orders/${req.params.id}?error=${encodeURIComponent(error.message)}`);
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async renderAuditForm(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const order = await this.getOrderByIdUseCase.execute(id);
      if (order.status !== "RECEIVED") {
        return res.redirect(`/api/orders/${id}`);
      }
      return res.render("orders/audit", {
        activeTab: "orders",
        order,
      });
    } catch (error: any) {
      return res.status(404).render("orders/audit", {
        activeTab: "orders",
        errorMessage: error.message,
      });
    }
  }

  async auditPurchaseOrder(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      const { items } = req.body;

      const validItems = (items ?? []).filter(Boolean);

      const auditItems: AuditItemInput[] = validItems.map((item: any) => ({
        product_id: item.product_id,
        expiration_date: item.expiration_date ? new Date(item.expiration_date) : null,
      }));

      await this.auditPurchaseOrderUseCase.execute(id, auditItems, request.user?.id || "unknown");

      if (isFormRequest(req)) return res.redirect(`/api/orders/${id}`);
      return res.status(200).json({ message: "Orden de compra auditada correctamente" });
    } catch (error: any) {
      if (isFormRequest(req)) {
        try {
          const order = await this.getOrderByIdUseCase.execute(req.params.id);
          return res.status(400).render("orders/audit", {
            activeTab: "orders",
            order,
            errorMessage: error.message,
          });
        } catch {
          return res.redirect(`/api/orders/${req.params.id}`);
        }
      }
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async cancelSaleOrder(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      await this.cancelSaleOrderUseCase.execute(id, request.user?.id || "unknown");
      if (isFormRequest(req)) return res.redirect(`/api/orders/${id}`);
      return res.status(200).json({ message: "Orden de venta cancelada" });
    } catch (error: any) {
      if (isFormRequest(req)) return res.redirect(`/api/orders/${req.params.id}?error=${encodeURIComponent(error.message)}`);
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  // --- Consultas ---

  async getAll(req: Request, res: Response) {
    try {
      const orderType = req.query.type as OrderType | undefined;
      const orders = await this.getAllOrdersUseCase.execute(orderType);

      if (req.headers.accept?.includes("text/html")) {
        return res.render("orders/list", {
          activeTab: "orders",
          orders,
          activeOrderType: orderType || "ALL",
          statusLabel: STATUS_LABEL,
          statusBadge: STATUS_BADGE,
        });
      }

      return res.status(200).json(orders);
    } catch (error: any) {
      return res.status(500).json({ error: true, message: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    if (req.headers.accept?.includes("text/html")) {
      return this.renderDetail(req, res);
    }
    try {
      const { id } = req.params as { id: string };
      const order = await this.getOrderByIdUseCase.execute(id);
      return res.status(200).json(order);
    } catch (error: any) {
      return res.status(404).json({ error: true, message: error.message });
    }
  }
}
