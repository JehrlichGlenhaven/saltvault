import type { SupabaseClient } from '@supabase/supabase-js'
import { paymentStatus } from '@/lib/status'

/** Recompute an invoice/bill status from its items and payments. Returns the totals. */
export async function refreshSubInvoiceStatus(supabase: SupabaseClient, invoiceId: string) {
  const { data: items } = await supabase
    .from('sub_invoice_items')
    .select('amount, delivery_id')
    .eq('sub_invoice_id', invoiceId)
  const total = (items ?? []).reduce((sum, i) => sum + Number(i.amount), 0)

  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('sub_invoice_id', invoiceId)
  const paid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

  const status = paymentStatus(total, paid)
  await supabase.from('sub_invoices').update({ status }).eq('id', invoiceId)

  return { total, paid, status, items: items ?? [] }
}

export async function refreshSupplierBillStatus(supabase: SupabaseClient, billId: string) {
  const { data: items } = await supabase
    .from('supplier_bill_items')
    .select('amount, delivery_id')
    .eq('supplier_bill_id', billId)
  const total = (items ?? []).reduce((sum, i) => sum + Number(i.amount), 0)

  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('supplier_bill_id', billId)
  const paid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

  const status = paymentStatus(total, paid)
  await supabase.from('supplier_bills').update({ status }).eq('id', billId)

  return { total, paid, status, items: items ?? [] }
}
