'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUniqueViolation, numOrNull, str, strOrNull, type FormState } from '@/lib/forms'
import { logDeliveryEvent } from '@/lib/log'
import { deliveryRevenue } from '@/lib/money'
import { refreshSubInvoiceStatus } from '@/lib/refresh'
import type { Delivery } from '@/lib/types'

// ---------------------------------------------------------------------------
// Create an invoice from reconciled, not-yet-invoiced deliveries
// ---------------------------------------------------------------------------

export async function createSubInvoice(_prev: FormState, fd: FormData): Promise<FormState> {
  const invoiceNumber = str(fd, 'invoice_number')
  const subcontractorId = str(fd, 'subcontractor_id')
  const issueDate = str(fd, 'issue_date')
  const dueDate = strOrNull(fd, 'due_date')
  const notes = strOrNull(fd, 'notes')
  const deliveryIds = fd.getAll('delivery_ids').map(String)

  if (!invoiceNumber) return { error: 'Enter an invoice number.' }
  if (!subcontractorId) return { error: 'Pick a subcontractor.' }
  if (!issueDate) return { error: 'Enter an issue date.' }
  if (deliveryIds.length === 0) return { error: 'Select at least one delivery.' }

  const supabase = await createClient()

  const { data: deliveries, error: fetchError } = await supabase
    .from('deliveries')
    .select('*')
    .in('id', deliveryIds)
  if (fetchError) return { error: fetchError.message }

  const rows = (deliveries ?? []) as Delivery[]
  if (rows.length !== deliveryIds.length) return { error: 'Some deliveries were not found.' }
  if (rows.some((d) => d.subcontractor_id !== subcontractorId)) {
    return { error: 'All deliveries must belong to the selected subcontractor.' }
  }
  if (rows.some((d) => d.reconciled_at === null)) {
    return { error: 'Only reconciled deliveries can be invoiced (bill actual tonnage).' }
  }
  if (rows.some((d) => d.sub_invoiced_at !== null)) {
    return { error: 'One or more deliveries are already on an invoice.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: invoice, error } = await supabase
    .from('sub_invoices')
    .insert({
      invoice_number: invoiceNumber,
      subcontractor_id: subcontractorId,
      season_id: rows[0].season_id,
      issue_date: issueDate,
      due_date: dueDate,
      notes,
      created_by: user?.id ?? null,
    })
    .select('id')
    .single()
  if (error) {
    return { error: isUniqueViolation(error) ? 'That invoice number is already in use.' : error.message }
  }

  const now = new Date().toISOString()
  for (const d of rows) {
    const amount = Math.round(deliveryRevenue(d) * 100) / 100
    await supabase.from('sub_invoice_items').insert({
      sub_invoice_id: invoice.id,
      delivery_id: d.id,
      amount,
    })
    await supabase
      .from('deliveries')
      .update({ sub_invoiced_at: now, updated_at: now })
      .eq('id', d.id)
    await logDeliveryEvent(supabase, d.id, 'milestone', {
      toStage: 'sub_invoiced_at',
      note: `Invoiced on ${invoiceNumber}`,
    })
  }

  revalidatePath('/invoices')
  revalidatePath('/deliveries')
  redirect(`/invoices/${invoice.id}`)
}

// ---------------------------------------------------------------------------
// Record a payment from the sub
// ---------------------------------------------------------------------------

export async function recordInvoicePayment(
  invoiceId: string,
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const amount = numOrNull(fd, 'amount')
  const paymentDate = str(fd, 'payment_date')
  if (amount === null || amount <= 0) return { error: 'Enter a valid amount.' }
  if (!paymentDate) return { error: 'Enter a payment date.' }

  const supabase = await createClient()
  const { total, paid } = await refreshSubInvoiceStatus(supabase, invoiceId)
  const balance = Math.round((total - paid) * 100) / 100
  if (amount > balance + 0.001) {
    return { error: `Amount exceeds the remaining balance of $${balance.toFixed(2)}.` }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('payments').insert({
    sub_invoice_id: invoiceId,
    amount,
    payment_date: paymentDate,
    method: strOrNull(fd, 'method'),
    reference: strOrNull(fd, 'reference'),
    notes: strOrNull(fd, 'notes'),
    created_by: user?.id ?? null,
  })
  if (error) return { error: error.message }

  const refreshed = await refreshSubInvoiceStatus(supabase, invoiceId)
  if (refreshed.status === 'paid') {
    const now = new Date().toISOString()
    for (const item of refreshed.items) {
      await supabase
        .from('deliveries')
        .update({ sub_paid_at: now, updated_at: now })
        .eq('id', item.delivery_id)
        .is('sub_paid_at', null)
      await logDeliveryEvent(supabase, item.delivery_id, 'milestone', {
        toStage: 'sub_paid_at',
        note: 'Invoice paid in full',
      })
    }
    revalidatePath('/deliveries')
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}`)
  redirect(`/invoices/${invoiceId}`)
}

// ---------------------------------------------------------------------------
// Delete (only before any payment is recorded)
// ---------------------------------------------------------------------------

export async function deleteSubInvoice(invoiceId: string): Promise<void> {
  const supabase = await createClient()

  const { data: payments } = await supabase
    .from('payments')
    .select('id')
    .eq('sub_invoice_id', invoiceId)
    .limit(1)
  if ((payments ?? []).length > 0) return // UI hides the button; nothing to do

  const { data: items } = await supabase
    .from('sub_invoice_items')
    .select('delivery_id')
    .eq('sub_invoice_id', invoiceId)

  await supabase.from('sub_invoices').delete().eq('id', invoiceId)

  const now = new Date().toISOString()
  for (const item of items ?? []) {
    await supabase
      .from('deliveries')
      .update({ sub_invoiced_at: null, updated_at: now })
      .eq('id', item.delivery_id)
    await logDeliveryEvent(supabase, item.delivery_id, 'invoice_deleted', {
      note: 'Removed from a deleted invoice',
    })
  }

  revalidatePath('/invoices')
  revalidatePath('/deliveries')
  redirect('/invoices')
}
