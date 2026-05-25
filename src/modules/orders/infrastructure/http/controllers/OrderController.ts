import type { Request, Response } from "express";
import type { CreatePurchaseOrder } from "../../../application/use-cases/CreatePurchaseOrder.js";
import type { ConfirmPurchaseOrder } from "../../../application/use-cases/ConfirmPurchaseOrder.js";
import type { VerifyPurchaseBudget } from "../../../application/use-cases/VerifyPurchaseBudget.js";
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
import type { GetAvailableStockByProduct } from "../../../../inventory/application/index.js";
import type { CreatePurchaseOrderItemInput } from "../../../application/use-cases/CreatePurchaseOrder.js";
import type { CreateSaleOrderItemInput } from "../../../application/use-cases/CreateSaleOrder.js";
import type { OrderType } from "../../../domain/index.js";

type AuthenticatedRequest = Request & {
  user?: { id?: string };
};

const STATUS_LABEL: Record<string, string> = {
  TO_VERIFY_BUDGET: "A verificar presupuesto",
  PENDING_BUDGET: "Presupuesto pendiente",
  TO_CONFIRM: "A confirmar",
  CONFIRMED: "Confirmada",
  RECEIVED: "Recibida",
  AUDITED: "Auditada",
  TO_VERIFY_COLLECTION: "A verificar cobro",
  PENDING_PAYMENT: "Pago pendiente",
  PENDING_ASSEMBLY: "En preparación",
  DISPATCHING: "A despachar",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
};

const STATUS_BADGE: Record<string, string> = {
  TO_VERIFY_BUDGET: "warning",
  PENDING_BUDGET: "warning",
  TO_CONFIRM: "warning",
  CONFIRMED: "primary",
  RECEIVED: "info",
  AUDITED: "success",
  TO_VERIFY_COLLECTION: "warning",
  PENDING_PAYMENT: "warning",
  PENDING_ASSEMBLY: "info",
  DISPATCHING: "primary",
  DELIVERED: "success",
  CANCELLED: "danger",
};

const isFormRequest = (req: Request) =>
  req.headers["content-type"]?.includes("application/x-www-form-urlencoded");

const getOperationalReturnPath = (req: Request): string | null => {
  const referer = req.get("referer") || req.get("referrer");

  if (!referer) {
    return null;
  }

  try {
    const url = new URL(referer);
    const path = `${url.pathname}${url.search}`;
    if (
      path.startsWith("/api/transactions") ||
      path.startsWith("/api/inventory")
    ) {
      return path;
    }
    return null;
  } catch {
    return null;
  }
};

const appendErrorToPath = (path: string, message: string) => {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}error=${encodeURIComponent(message)}`;
};

export class OrderController {
  constructor(
    private readonly createPurchaseOrderUseCase: CreatePurchaseOrder,
    private readonly verifyPurchaseBudgetUseCase: VerifyPurchaseBudget,
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
    private readonly getAvailableStockByProductUseCase: GetAvailableStockByProduct,
  ) {}

  private async getSaleProductsWithStock() {
    const products = await this.getAllProductsUseCase.execute();
    const stockByProduct = await Promise.all(
      products.map(async (product) => ({
        product,
        availableStock: await this.getAvailableStockByProductUseCase.execute(
          product.id!,
        ),
      })),
    );

    return stockByProduct
      .filter(({ availableStock }) => availableStock > 0)
      .map(({ product, availableStock }) => ({
        ...product,
        available_stock: availableStock,
      }));
  }

  private async getPurchaseProductsWithStock(activeVendorCuits: Set<string>) {
    const allProducts = await this.getAllProductsUseCase.execute();
    const vendorProducts = allProducts.filter((product) =>
      activeVendorCuits.has(product.vendor_cuit),
    );

    const stockByProduct = await Promise.all(
      vendorProducts.map(async (product) => ({
        product,
        availableStock: await this.getAvailableStockByProductUseCase.execute(
          product.id!,
        ),
      })),
    );

    return stockByProduct.map(({ product, availableStock }) => ({
      ...product,
      available_stock: availableStock,
    }));
  }

  private getFormSuccessRedirect(req: Request, defaultPath: string) {
    return getOperationalReturnPath(req) || defaultPath;
  }

  private getFormErrorRedirect(
    req: Request,
    defaultPath: string,
    errorMessage: string,
  ) {
    const operationalPath = getOperationalReturnPath(req);

    if (operationalPath) {
      return appendErrorToPath(operationalPath, errorMessage);
    }

    return appendErrorToPath(defaultPath, errorMessage);
  }

  private getExplicitReturnPath(req: Request) {
    const returnTo =
      typeof req.body?.return_to === "string"
        ? req.body.return_to
        : typeof req.query.return_to === "string"
          ? req.query.return_to
          : undefined;

    if (!returnTo) {
      return undefined;
    }

    return returnTo.startsWith("/api/") ? returnTo : undefined;
  }

  // --- Vistas HTML ---

  async renderCreatePurchaseForm(req: Request, res: Response) {
    const partners = await this.getAllPartnersUseCase.execute();
    const vendors = partners.filter(
      (p) => p.active && p.type.includes("VENDOR"),
    );
    const vendorMap: Record<string, string> = {};
    vendors.forEach((v) => {
      vendorMap[v.cuit] = v.legal_name;
    });
    const activeVendorCuits = new Set(Object.keys(vendorMap));
    const products = await this.getPurchaseProductsWithStock(activeVendorCuits);

    return res.render("orders/create-purchase", {
      activeTab: "orders",
      vendorMap,
      products,
      errorMessage: undefined,
    });
  }

  async renderCreateSaleForm(req: Request, res: Response) {
    const partners = await this.getAllPartnersUseCase.execute();
    const clients = partners.filter(
      (p) => p.active && p.type.includes("CLIENT"),
    );
    const products = await this.getSaleProductsWithStock();

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
      const { items, scheduled_date, notes } = req.body;

      const orders = await this.createPurchaseOrderUseCase.execute(
        items as CreatePurchaseOrderItemInput[],
        request.user?.id || "unknown",
        scheduled_date ? new Date(scheduled_date) : undefined,
        notes,
      );

      if (isFormRequest(req)) return res.redirect("/api/orders?type=PURCHASE");
      return res
        .status(201)
        .json({ message: "Órdenes de compra creadas", items: orders });
    } catch (error: any) {
      if (isFormRequest(req)) {
        const partners = await this.getAllPartnersUseCase.execute();
        const vendors = partners.filter(
          (p) => p.active && p.type.includes("VENDOR"),
        );
        const vendorMap: Record<string, string> = {};
        vendors.forEach((v) => {
          vendorMap[v.cuit] = v.legal_name;
        });
        const activeVendorCuits = new Set(Object.keys(vendorMap));
        const products =
          await this.getPurchaseProductsWithStock(activeVendorCuits);
        return res.status(400).render("orders/create-purchase", {
          activeTab: "orders",
          vendorMap,
          products,
          formData: req.body,
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
      await this.confirmPurchaseOrderUseCase.execute(
        id,
        request.user?.id || "unknown",
      );
      if (isFormRequest(req)) return res.redirect(`/api/orders/${id}`);
      return res.status(200).json({ message: "Orden de compra confirmada" });
    } catch (error: any) {
      if (isFormRequest(req))
        return res.redirect(
          `/api/orders/${req.params.id}?error=${encodeURIComponent(error.message)}`,
        );
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async verifyPurchaseBudget(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      await this.verifyPurchaseBudgetUseCase.execute(
        id,
        request.user?.id || "unknown",
      );

      if (isFormRequest(req)) {
        return res.redirect(
          this.getFormSuccessRedirect(req, `/api/transactions`),
        );
      }

      return res.status(200).json({ message: "Presupuesto verificado" });
    } catch (error: any) {
      if (isFormRequest(req)) {
        return res.redirect(
          this.getFormErrorRedirect(req, `/api/transactions`, error.message),
        );
      }
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async receivePurchaseOrder(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      await this.receivePurchaseOrderUseCase.execute(
        id,
        request.user?.id || "unknown",
      );
      if (isFormRequest(req)) {
        return res.redirect(
          this.getFormSuccessRedirect(req, `/api/orders/${id}`),
        );
      }
      return res
        .status(200)
        .json({ message: "Orden de compra marcada como recibida" });
    } catch (error: any) {
      if (isFormRequest(req))
        return res.redirect(
          this.getFormErrorRedirect(
            req,
            `/api/orders/${req.params.id}`,
            error.message,
          ),
        );
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async cancelPurchaseOrder(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      await this.cancelPurchaseOrderUseCase.execute(
        id,
        request.user?.id || "unknown",
      );
      if (isFormRequest(req)) {
        return res.redirect(
          this.getFormSuccessRedirect(req, `/api/orders/${id}`),
        );
      }
      return res.status(200).json({ message: "Orden de compra cancelada" });
    } catch (error: any) {
      if (isFormRequest(req))
        return res.redirect(
          this.getFormErrorRedirect(
            req,
            `/api/orders/${req.params.id}`,
            error.message,
          ),
        );
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
      return res
        .status(201)
        .json({ message: "Orden de venta creada", item: order });
    } catch (error: any) {
      if (isFormRequest(req)) {
        const partners = await this.getAllPartnersUseCase.execute();
        const clients = partners.filter(
          (p) => p.active && p.type.includes("CLIENT"),
        );
        const products = await this.getSaleProductsWithStock();
        return res.status(400).render("orders/create-sale", {
          activeTab: "orders",
          clients,
          products,
          formData: req.body,
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
      await this.confirmSalePaymentUseCase.execute(
        id,
        request.user?.id || "unknown",
      );
      if (isFormRequest(req)) {
        return res.redirect(
          this.getFormSuccessRedirect(req, `/api/orders/${id}`),
        );
      }
      return res
        .status(200)
        .json({ message: "Pago de orden de venta confirmado" });
    } catch (error: any) {
      if (isFormRequest(req))
        return res.redirect(
          this.getFormErrorRedirect(
            req,
            `/api/orders/${req.params.id}`,
            error.message,
          ),
        );
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async markOrderDelivered(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      await this.markOrderDeliveredUseCase.execute(
        id,
        request.user?.id || "unknown",
      );
      if (isFormRequest(req)) {
        return res.redirect(
          this.getFormSuccessRedirect(req, `/api/orders/${id}`),
        );
      }
      return res
        .status(200)
        .json({ message: "Orden de venta marcada como entregada" });
    } catch (error: any) {
      if (isFormRequest(req))
        return res.redirect(
          this.getFormErrorRedirect(
            req,
            `/api/orders/${req.params.id}`,
            error.message,
          ),
        );
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async dispatchSaleOrder(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      await this.dispatchSaleOrderUseCase.execute(
        id,
        request.user?.id || "unknown",
      );
      if (isFormRequest(req)) {
        return res.redirect(
          this.getFormSuccessRedirect(req, `/api/orders/${id}`),
        );
      }
      return res
        .status(200)
        .json({ message: "Orden de venta marcada como a despachar" });
    } catch (error: any) {
      if (isFormRequest(req))
        return res.redirect(
          this.getFormErrorRedirect(
            req,
            `/api/orders/${req.params.id}`,
            error.message,
          ),
        );
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async renderAuditForm(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const order = await this.getOrderByIdUseCase.execute(id);
      const returnTo = this.getExplicitReturnPath(req);
      if (order.status !== "RECEIVED") {
        return res.redirect(returnTo || `/api/orders/${id}`);
      }
      return res.render("orders/audit", {
        activeTab: returnTo?.startsWith("/api/inventory")
          ? "inventory"
          : "orders",
        order,
        returnTo,
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
        received_quantity: Number(item.received_quantity),
        expiration_date: item.expiration_date
          ? new Date(item.expiration_date)
          : null,
      }));

      await this.auditPurchaseOrderUseCase.execute(
        id,
        auditItems,
        request.user?.id || "unknown",
      );

      if (isFormRequest(req)) {
        return res.redirect(
          this.getExplicitReturnPath(req) ||
            this.getFormSuccessRedirect(req, `/api/orders/${id}`),
        );
      }
      return res
        .status(200)
        .json({ message: "Orden de compra auditada correctamente" });
    } catch (error: any) {
      if (isFormRequest(req)) {
        try {
          const order = await this.getOrderByIdUseCase.execute(
            req.params.id as string,
          );
          const returnTo = this.getExplicitReturnPath(req);
          return res.status(400).render("orders/audit", {
            activeTab: returnTo?.startsWith("/api/inventory")
              ? "inventory"
              : "orders",
            order,
            errorMessage: error.message,
            returnTo,
          });
        } catch {
          return res.redirect(
            this.getExplicitReturnPath(req) || `/api/orders/${req.params.id}`,
          );
        }
      }
      return res.status(400).json({ error: true, message: error.message });
    }
  }

  async cancelSaleOrder(req: Request, res: Response) {
    const request = req as AuthenticatedRequest;
    try {
      const { id } = req.params as { id: string };
      await this.cancelSaleOrderUseCase.execute(
        id,
        request.user?.id || "unknown",
      );
      if (isFormRequest(req)) {
        return res.redirect(
          this.getFormSuccessRedirect(req, `/api/orders/${id}`),
        );
      }
      return res.status(200).json({ message: "Orden de venta cancelada" });
    } catch (error: any) {
      if (isFormRequest(req))
        return res.redirect(
          this.getFormErrorRedirect(
            req,
            `/api/orders/${req.params.id}`,
            error.message,
          ),
        );
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
