export interface ICustomerData {
  credit_limit: number;
  current_balance: number;
  payment_terms?: number;
}

export interface IVendorData {
  lead_time: number;
  category: string;
}

// Interfaz unificada (Soporta Cliente, Proveedor o Ambos)
export interface IBusinessPartner {
  cuit: string;
  legal_name: string;
  phone: string;
  email: string;
  legal_address: string;
  active: boolean;
  vat_condition: string;

  type: ("CLIENT" | "VENDOR")[];

  customer_data?: ICustomerData;
  vendor_data?: IVendorData;

  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
}
