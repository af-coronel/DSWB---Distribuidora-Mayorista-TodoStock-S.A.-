import type { Request, Response } from "express";
import type { GetAllInventoryLots } from "../../../application/use-cases/GetAllInventoryLots.js";
import type { GetAllProducts } from "../../../../products/application/index.js";
import type { GetAllOrders } from "../../../../orders/application/index.js";
import type { GetAllPartners } from "../../../../business-partner/application/index.js";

const ORDER_STATUS_LABEL: Record<string, string> = {
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

const ORDER_STATUS_BADGE: Record<string, string> = {
  TO_VERIFY_BUDGET: "attention",
  PENDING_BUDGET: "attention",
  TO_CONFIRM: "attention",
  CONFIRMED: "progress",
  RECEIVED: "progress",
  AUDITED: "done",
  TO_VERIFY_COLLECTION: "attention",
  PENDING_PAYMENT: "attention",
  PENDING_ASSEMBLY: "progress",
  DISPATCHING: "progress",
  DELIVERED: "done",
  CANCELLED: "cancelled",
};

export class InventoryController {
  constructor(
    private readonly getAllInventoryLotsUseCase: GetAllInventoryLots,
    private readonly getAllProductsUseCase: GetAllProducts,
    private readonly getAllOrdersUseCase: GetAllOrders,
    private readonly getAllPartnersUseCase: GetAllPartners,
  ) {}

  async getAll(req: Request, res: Response) {
    try {
      const lots = await this.getAllInventoryLotsUseCase.execute();

      if (req.headers.accept?.includes("text/html")) {
        const [products, orders, partners] = await Promise.all([
          this.getAllProductsUseCase.execute(),
          this.getAllOrdersUseCase.execute(),
          this.getAllPartnersUseCase.execute(),
        ]);
        const productMap = Object.fromEntries(
          products.map((p) => [p.id, p.name]),
        );
        const partnerMap = Object.fromEntries(
          partners.map((partner) => [partner.cuit, partner.legal_name]),
        );
        const purchaseTasks = orders.filter(
          (order) =>
            order.order_type === "PURCHASE" &&
            (order.status === "CONFIRMED" || order.status === "RECEIVED"),
        );
        const saleTasks = orders.filter(
          (order) =>
            order.order_type === "SALE" &&
            (order.status === "PENDING_ASSEMBLY" ||
              order.status === "DISPATCHING"),
        );
        const activeTab =
          req.query.tab === "purchase" ||
          req.query.tab === "sale" ||
          req.query.tab === "stock"
            ? req.query.tab
            : "purchase";

        const pageSize = 15;
        const parsedPage = Number(req.query.page);
        const requestedPage =
          Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

        const sourceItems =
          activeTab === "purchase"
            ? purchaseTasks
            : activeTab === "sale"
              ? saleTasks
              : lots;

        const totalItems = sourceItems.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const currentPage = Math.min(requestedPage, totalPages);
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        const paginatedPurchaseTasks =
          activeTab === "purchase"
            ? purchaseTasks.slice(startIndex, endIndex)
            : purchaseTasks;
        const paginatedSaleTasks =
          activeTab === "sale"
            ? saleTasks.slice(startIndex, endIndex)
            : saleTasks;
        const paginatedLots =
          activeTab === "stock" ? lots.slice(startIndex, endIndex) : lots;

        return res.render("inventory/list", {
          activeTab: "inventory",
          inventoryTab: activeTab,
          lots: paginatedLots,
          productMap,
          partnerMap,
          purchaseTasks: paginatedPurchaseTasks,
          saleTasks: paginatedSaleTasks,
          currentPage,
          totalPages,
          totalItems,
          pageSize,
          statusLabel: ORDER_STATUS_LABEL,
          statusBadge: ORDER_STATUS_BADGE,
          flashError: (req.query.error as string) || undefined,
        });
      }

      return res.status(200).json(lots);
    } catch (error: any) {
      return res.status(500).json({ error: true, message: error.message });
    }
  }
}
