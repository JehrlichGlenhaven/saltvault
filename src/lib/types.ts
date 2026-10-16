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
