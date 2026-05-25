export interface IInventoryLot {
  id?: string;
  product_id: string;
  stock: number;
  engaged_stock: number;
  expiration_date: Date | null;
  created_by: string;
  created_at: Date;
  updated_by: string;
  updated_at: Date;
}
