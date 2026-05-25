import type { IBusinessPartnerRepository } from "../../../business-partner/domain/index.js";
import type { IOrder, IOrderItem, IOrderRepository } from "../../domain/index.js";

export class CreatePurchaseOrder {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly partnerRepository: IBusinessPartnerRepository,
  ) {}

  async execute(
    partnerCuit: string,
    items: IOrderItem[],
    createdBy: string,
    notes?: string,
  ): Promise<IOrder> {
    if (!partnerCuit?.trim()) {
      throw new Error("El CUIT del proveedor es obligatorio.");
    }

    if (!items || items.length === 0) {
      throw new Error("La orden debe tener al menos un ítem.");
    }

    const vendor = await this.partnerRepository.findByCuit(partnerCuit);

    if (!vendor || !vendor.active) {
      throw new Error("El proveedor indicado no existe o está inactivo.");
    }

    if (!vendor.type.includes("VENDOR")) {
      throw new Error("El socio indicado no está registrado como proveedor.");
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        throw new Error(`La cantidad del ítem "${item.product_name}" debe ser mayor a cero.`);
      }
      if (item.unit_price < 0) {
        throw new Error(`El precio del ítem "${item.product_name}" no puede ser negativo.`);
      }
    }

    const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const now = new Date();

    const order: IOrder = {
      order_type: "PURCHASE",
      status: "PENDING_BUDGET",
      partner_cuit: partnerCuit,
      items,
      total_amount: total,
      notes,
      created_by: createdBy,
      created_at: now,
      updated_by: createdBy,
      updated_at: now,
    };

    return this.orderRepository.save(order);
  }
}
