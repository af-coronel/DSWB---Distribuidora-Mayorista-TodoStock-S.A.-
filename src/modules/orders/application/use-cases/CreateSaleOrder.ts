import type { IBusinessPartnerRepository } from "../../../business-partner/domain/index.js";
import type { IProductRepository } from "../../../products/domain/index.js";
import type { IOrder, IOrderItem, IOrderRepository } from "../../domain/index.js";
import type { ReserveStock } from "../../../inventory/application/index.js";
import type { CreateTransaction } from "../../../transactions/application/index.js";

export interface CreateSaleOrderItemInput {
  product_id: string;
  quantity: number;
}

export class CreateSaleOrder {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly partnerRepository: IBusinessPartnerRepository,
    private readonly productRepository: IProductRepository,
    private readonly reserveStockUseCase: ReserveStock,
    private readonly createTransactionUseCase: CreateTransaction,
  ) {}

  async execute(
    partnerCuit: string,
    inputItems: CreateSaleOrderItemInput[],
    createdBy: string,
    scheduledDate?: Date,
    notes?: string,
  ): Promise<IOrder> {
    if (!partnerCuit?.trim()) {
      throw new Error("El CUIT del cliente es obligatorio.");
    }

    const validItems = (inputItems ?? []).filter(Boolean);

    if (validItems.length === 0) {
      throw new Error("La orden debe tener al menos un ítem.");
    }

    const client = await this.partnerRepository.findByCuit(partnerCuit);

    if (!client || !client.active) {
      throw new Error("El cliente indicado no existe o está inactivo.");
    }

    if (!client.type.includes("CLIENT")) {
      throw new Error("El socio indicado no está registrado como cliente.");
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
        unit_price: product.customer_price,
      });
    }

    for (const item of items) {
      await this.reserveStockUseCase.execute(item.product_id, item.quantity, createdBy);
    }

    const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const now = new Date();

    const order: IOrder = {
      order_type: "SALE",
      status: "PENDING_PAYMENT",
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
    await this.createTransactionUseCase.execute(saved.id!, "COLLECTION", createdBy);
    return saved;
  }
}
