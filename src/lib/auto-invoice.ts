import type { SupabaseClient } from '@supabase/supabase-js'
import { logDeliveryEvent } from '@/lib/log'
import { refreshSubInvoiceStatus } from '@/lib/refresh'

const DAY = 86_400_000

/**
 * Create a sub invoice automatically for a new delivery (one invoice per
 * delivery). Amount starts at the order-time estimate and is corrected to
 * actuals at reconciliation via syncInvoiceAmountForDelivery.
 */
export async function createAutoInvoiceForDelivery(
  supabase: SupabaseClient,
  delivery: { id: string; subcontractor_id: string; season_id: string },
  amount: number,
  userId: string | null
): Promise<{ error: string | null }> {
  const { count } = await supabase
    .from('sub_invoices')
    .select('*', { count: 'exact', head: true })
  const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, '0')}`

  const now = new Date()
  const issueDate = now.toISOString().slice(0, 10)
  const dueDate = new Date(now.getTime() + 30 * DAY).toISOString().slice(0, 10) // net 30

  const { data: invoice, error } = await supabase
    .from('sub_invoices')
    .insert({
      invoice_number: invoiceNumber,
      subcontractor_id: delivery.subcontractor_id,
      season_id: delivery.season_id,
      issue_date: issueDate,
      due_date: dueDate,
      created_by: userId,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }

  const { error: itemError } = await supabase.from('sub_invoice_items').insert({
    sub_invoice_id: invoice.id,
    delivery_id: delivery.id,
    amount: Math.round(amount * 100) / 100,
  })
  if (itemError) return { error: itemError.message }

  const nowIso = now.toISOString()
  await supabase
    .from('deliveries')
    .update({ sub_invoiced_at: nowIso, updated_at: nowIso })
    .eq('id', delivery.id)

  await logDeliveryEvent(supabase, delivery.id, 'invoice_created', {
    toStage: 'sub_invoiced_at',
    note: `Invoice ${invoiceNumber} created automatically`,
  })

  return { error: null }
}

/**
 * After reconciliation changes a delivery's final numbers, correct the linked
 * auto-invoice item amount and recompute that invoice's status.
 */
export async function syncInvoiceAmountForDelivery(
  supabase: SupabaseClient,
  deliveryId: string,
  newAmount: number
): Promise<void> {
  const { data: item } = await supabase
    .from('sub_invoice_items')
    .select('id, sub_invoice_id')
    .eq('delivery_id', deliveryId)
    .maybeSingle()
  if (!item) return

  await supabase
    .from('sub_invoice_items')
    .update({ amount: Math.round(newAmount * 100) / 100 })
    .eq('id', item.id)

  await refreshSubInvoiceStatus(supabase, item.sub_invoice_id)
}
