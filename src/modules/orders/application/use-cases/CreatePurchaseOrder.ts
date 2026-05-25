import type { IBusinessPartnerRepository } from "../../../business-partner/domain/index.js";
import type { IProductRepository } from "../../../products/domain/index.js";
import type { IOrder, IOrderItem, IOrderRepository } from "../../domain/index.js";
import type { CreateTransaction } from "../../../transactions/application/index.js";

export interface CreatePurchaseOrderItemInput {
  product_id: string;
  quantity: number;
}

export class CreatePurchaseOrder {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly partnerRepository: IBusinessPartnerRepository,
    private readonly productRepository: IProductRepository,
    private readonly createTransactionUseCase: CreateTransaction,
  ) {}

  async execute(
    inputItems: CreatePurchaseOrderItemInput[],
    createdBy: string,
    scheduledDate?: Date,
    notes?: string,
  ): Promise<IOrder[]> {
    const validItems = (inputItems ?? []).filter(Boolean);

    if (validItems.length === 0) {
      throw new Error("La orden debe tener al menos un ítem.");
    }

    const grouped = new Map<string, IOrderItem[]>();

    for (const input of validItems) {
      const quantity = Number(input.quantity);

      if (!quantity || quantity <= 0) {
        throw new Error(`La cantidad del ítem con ID "${input.product_id}" debe ser mayor a cero.`);
      }

      const product = await this.productRepository.findById(input.product_id);

      if (!product) {
        throw new Error(`El producto con ID "${input.product_id}" no existe.`);
      }

      const item: IOrderItem = {
        product_id: input.product_id,
        product_name: product.name,
        quantity,
        unit_price: product.vendor_price,
      };

      const existing = grouped.get(product.vendor_cuit) ?? [];
      existing.push(item);
      grouped.set(product.vendor_cuit, existing);
    }

    const vendorCuits = Array.from(grouped.keys());
    for (const cuit of vendorCuits) {
      const vendor = await this.partnerRepository.findByCuit(cuit);
      if (!vendor || !vendor.active) {
        throw new Error(`El proveedor con CUIT "${cuit}" no existe o está inactivo.`);
      }
      if (!vendor.type.includes("VENDOR")) {
        throw new Error(`El socio con CUIT "${cuit}" no está registrado como proveedor.`);
      }
    }

    const now = new Date();
    const created: IOrder[] = [];

    for (const [vendorCuit, items] of grouped) {
      const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

      const order: IOrder = {
        order_type: "PURCHASE",
        status: "PENDING_BUDGET",
        partner_cuit: vendorCuit,
        items,
        total_amount: total,
        scheduled_date: scheduledDate,
        notes,
        created_by: createdBy,
        created_at: now,
        updated_by: createdBy,
        updated_at: now,
      };

      const saved = await this.orderRepository.save(order);
      await this.createTransactionUseCase.execute(saved.id!, "PAYMENT", createdBy);
      created.push(saved);
    }

    return created;
  }
}
