export type TransactionType = "PAYMENT" | "COLLECTION";
export type TransactionStatus =
  | "TO_VERIFY"
  | "VERIFIED"
  | "PENDING_PAYMENT"
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED";

export interface IPaymentTransactionItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface IPaymentTransaction {
  id?: string;
  order_id: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  total_amount?: number;
  items?: IPaymentTransactionItem[];
  pos_number?: string;
  document_number?: string;
  created_by: string;
  created_at: Date;
  updated_by: string;
  updated_at: Date;
}
