export interface IProduct {
  id?: string;
  name: string;
  vendor_cuit: string;
  vendor_price: number;
  customer_price: number;
  category: string;
  created_by: string;
  created_at: Date;
  updated_by: string;
  updated_at: Date;
}
