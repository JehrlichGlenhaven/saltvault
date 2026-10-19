export type Season = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
}

export type Supplier = {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  notes: string | null
}

export type Product = {
  id: string
  name: string
  unit: string
  description: string | null
  active: boolean
}

export type Subcontractor = {
  id: string
  name: string
  company: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  notes: string | null
  active: boolean
}

export type Site = {
  id: string
  name: string
  address: string | null
  subcontractor_id: string
  notes: string | null
}

export type SupplierPrice = {
  id: string
  supplier_id: string
  product_id: string
  price_per_ton: number
  effective_from: string
  effective_to: string | null
}

export type MarkupRule = {
  id: string
  scope: 'global' | 'product' | 'subcontractor'
  product_id: string | null
  subcontractor_id: string | null
  markup_pct: number
  effective_from: string
  effective_to: string | null
}

export type Delivery = {
  id: string
  season_id: string
  supplier_id: string | null
  product_id: string
  subcontractor_id: string
  site_id: string
  source: 'supplier' | 'inventory'
  inventory_location_id: string | null
  loads: number
  est_tons_per_load: number
  est_tons: number
  actual_tons: number | null
  cost_per_ton: number
  markup_per_ton: number
  sell_per_ton: number
  misc_fee: number
  qty_mode: 'tons' | 'bags'
  buy_unit: 'bag' | 'pallet' | null
  buy_qty: number | null
  buy_unit_cost: number | null
  sell_unit: 'bag' | 'pallet' | null
  sell_qty: number | null
  sell_markup_per_unit: number | null
  sell_unit_price: number | null
  bags_per_pallet: number | null
  actual_sell_qty: number | null
  actual_buy_qty: number | null
  actual_buy_unit_cost: number | null
  supplier_ticket: string | null
  notes: string | null
  order_placed_at: string | null
  supplier_confirmed_at: string | null
  sub_confirmed_at: string | null
  delivered_at: string | null
  reconciled_at: string | null
  sub_invoiced_at: string | null
  sub_paid_at: string | null
  supplier_invoiced_at: string | null
  supplier_paid_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type DeliveryEvent = {
  id: string
  delivery_id: string
  event: string
  from_stage: string | null
  to_stage: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

export type DocumentStatus = 'open' | 'partial' | 'paid' | 'void'

export type SubInvoice = {
  id: string
  invoice_number: string
  subcontractor_id: string
  season_id: string
  issue_date: string
  due_date: string | null
  status: DocumentStatus
  notes: string | null
  created_at: string
}

export type SubInvoiceItem = {
  id: string
  sub_invoice_id: string
  delivery_id: string
  amount: number
}

export type SupplierBill = {
  id: string
  bill_number: string
  supplier_id: string
  season_id: string
  issue_date: string
  due_date: string | null
  status: DocumentStatus
  notes: string | null
  created_at: string
}

export type SupplierBillItem = {
  id: string
  supplier_bill_id: string
  delivery_id: string
  amount: number
}

export type Payment = {
  id: string
  sub_invoice_id: string | null
  supplier_bill_id: string | null
  amount: number
  payment_date: string
  method: string | null
  reference: string | null
  notes: string | null
  created_at: string
}

export type DocType = 'sub_invoice' | 'supplier_invoice' | 'ticket' | 'other'

export type DeliveryDocument = {
  id: string
  delivery_id: string
  doc_type: DocType
  file_name: string
  storage_path: string
  size_bytes: number | null
  content_type: string | null
  uploaded_by: string | null
  created_at: string
}

export type InventoryLocation = {
  id: string
  name: string
  address: string | null
  notes: string | null
}

export type MovementKind = 'purchase' | 'sale' | 'adjustment'

export type InventoryMovement = {
  id: string
  location_id: string
  product_id: string
  qty_bags: number
  kind: MovementKind
  unit_cost: number | null
  reference: string | null
  delivery_id: string | null
  note: string | null
  created_by: string | null
  created_at: string
}
