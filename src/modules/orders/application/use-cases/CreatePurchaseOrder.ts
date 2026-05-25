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
    partnerCuit: string,
    inputItems: CreatePurchaseOrderItemInput[],
    createdBy: string,
    scheduledDate?: Date,
    notes?: string,
  ): Promise<IOrder> {
    if (!partnerCuit?.trim()) {
      throw new Error("El CUIT del proveedor es obligatorio.");
    }

    const validItems = (inputItems ?? []).filter(Boolean);

    if (validItems.length === 0) {
      throw new Error("La orden debe tener al menos un ítem.");
    }

    const vendor = await this.partnerRepository.findByCuit(partnerCuit);

    if (!vendor || !vendor.active) {
      throw new Error("El proveedor indicado no existe o está inactivo.");
    }

    if (!vendor.type.includes("VENDOR")) {
      throw new Error("El socio indicado no está registrado como proveedor.");
    }

    const items: IOrderItem[] = [];

    for (const input of validItems) {
      const quantity = Number(input.quantity);

      if (!quantity || quantity <= 0) {
        throw new Error(`La cantidad del ítem con ID "${input.product_id}" debe ser mayor a cero.`);
      }

      const product = await this.productRepository.findById(input.product_id);

      if (!product) {
        throw new Error(`El producto con ID "${input.product_id}" no existe.`);
      }

      items.push({
        product_id: input.product_id,
        product_name: product.name,
        quantity,
        unit_price: product.vendor_price,
      });
    }

    const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const now = new Date();

    const order: IOrder = {
      order_type: "PURCHASE",
      status: "PENDING_BUDGET",
      partner_cuit: partnerCuit,
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
    return saved;
  }
}
