export type OrderType = "PURCHASE" | "SALE";

export type PurchaseStatus = "PENDING_BUDGET" | "CONFIRMED" | "RECEIVED" | "AUDITED" | "CANCELLED";
export type SaleStatus = "PENDING_PAYMENT" | "PENDING_ASSEMBLY" | "DISPATCHING" | "DELIVERED" | "CANCELLED";
export type OrderStatus = PurchaseStatus | SaleStatus;

export interface IOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface IOrder {
  id?: string;
  order_type: OrderType;
  status: OrderStatus;
  partner_cuit: string;
  items: IOrderItem[];
  total_amount: number;
  scheduled_date?: Date;
  notes?: string;
  created_by: string;
  created_at: Date;
  updated_by: string;
  updated_at: Date;
}
