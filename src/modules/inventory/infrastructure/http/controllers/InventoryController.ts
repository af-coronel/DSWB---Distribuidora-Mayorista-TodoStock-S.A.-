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

        return res.render("inventory/list", {
          activeTab: "inventory",
          inventoryTab: activeTab,
          lots,
          productMap,
          partnerMap,
          purchaseTasks,
          saleTasks,
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
