'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUniqueViolation, numOrNull, str, strOrNull, type FormState } from '@/lib/forms'
import { logDeliveryEvent } from '@/lib/log'
import { refreshSupplierBillStatus } from '@/lib/refresh'
import type { Delivery } from '@/lib/types'

// ---------------------------------------------------------------------------
// Create a supplier bill from deliveries — reconciles any that aren't yet
// (this is the moment the real tonnage arrives, on the supplier's invoice)
// ---------------------------------------------------------------------------

export async function createSupplierBill(_prev: FormState, fd: FormData): Promise<FormState> {
  const billNumber = str(fd, 'bill_number')
  const supplierId = str(fd, 'supplier_id')
  const issueDate = str(fd, 'issue_date')
  const dueDate = strOrNull(fd, 'due_date')
  const notes = strOrNull(fd, 'notes')
  const deliveryIds = fd.getAll('delivery_ids').map(String)

  if (!billNumber) return { error: 'Enter the supplier’s bill/invoice number.' }
  if (!supplierId) return { error: 'Pick a supplier.' }
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
  if (rows.some((d) => d.supplier_id !== supplierId)) {
    return { error: 'All deliveries must belong to the selected supplier.' }
  }
  if (rows.some((d) => d.supplier_invoiced_at !== null)) {
    return { error: 'One or more deliveries are already on a supplier bill.' }
  }

  // Validate actual tons for unreconciled deliveries before writing anything.
  const tonsByDelivery = new Map<string, number>()
  for (const d of rows) {
    if (d.actual_tons !== null) {
      tonsByDelivery.set(d.id, Number(d.actual_tons))
    } else {
      const tons = numOrNull(fd, `tons_${d.id}`)
      if (tons === null || tons <= 0) {
        return { error: 'Enter the actual tons for every unreconciled delivery.' }
      }
      tonsByDelivery.set(d.id, tons)
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: bill, error } = await supabase
    .from('supplier_bills')
    .insert({
      bill_number: billNumber,
      supplier_id: supplierId,
      season_id: rows[0].season_id,
      issue_date: issueDate,
      due_date: dueDate,
      notes,
      created_by: user?.id ?? null,
    })
    .select('id')
    .single()
  if (error) {
    return { error: isUniqueViolation(error) ? 'That bill number is already recorded for this supplier.' : error.message }
  }

  const now = new Date().toISOString()
  for (const d of rows) {
    const tons = tonsByDelivery.get(d.id)!
    const amount = Math.round((tons * Number(d.cost_per_ton) + Number(d.misc_fee)) * 100) / 100

    await supabase.from('supplier_bill_items').insert({
      supplier_bill_id: bill.id,
      delivery_id: d.id,
      amount,
    })

    // Reconcile if needed, then stamp "supplier invoiced us".
    if (d.actual_tons === null) {
      await supabase
        .from('deliveries')
        .update({ actual_tons: tons, reconciled_at: now, updated_at: now })
        .eq('id', d.id)
      await logDeliveryEvent(supabase, d.id, 'reconciled', {
        toStage: 'reconciled_at',
        note: `Actual tons: ${tons} (via supplier bill ${billNumber})`,
      })
    }
    await supabase
      .from('deliveries')
      .update({ supplier_invoiced_at: now, updated_at: now })
      .eq('id', d.id)
    await logDeliveryEvent(supabase, d.id, 'milestone', {
      toStage: 'supplier_invoiced_at',
      note: `Supplier bill ${billNumber}`,
    })
  }

  revalidatePath('/bills')
  revalidatePath('/deliveries')
  redirect(`/bills/${bill.id}`)
}

// ---------------------------------------------------------------------------
// Record a payment to the supplier
// ---------------------------------------------------------------------------

export async function recordBillPayment(
  billId: string,
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const amount = numOrNull(fd, 'amount')
  const paymentDate = str(fd, 'payment_date')
  if (amount === null || amount <= 0) return { error: 'Enter a valid amount.' }
  if (!paymentDate) return { error: 'Enter a payment date.' }

  const supabase = await createClient()
  const { total, paid } = await refreshSupplierBillStatus(supabase, billId)
  const balance = Math.round((total - paid) * 100) / 100
  if (amount > balance + 0.001) {
    return { error: `Amount exceeds the remaining balance of $${balance.toFixed(2)}.` }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('payments').insert({
    supplier_bill_id: billId,
    amount,
    payment_date: paymentDate,
    method: strOrNull(fd, 'method'),
    reference: strOrNull(fd, 'reference'),
    notes: strOrNull(fd, 'notes'),
    created_by: user?.id ?? null,
  })
  if (error) return { error: error.message }

  const refreshed = await refreshSupplierBillStatus(supabase, billId)
  if (refreshed.status === 'paid') {
    const now = new Date().toISOString()
    for (const item of refreshed.items) {
      await supabase
        .from('deliveries')
        .update({ supplier_paid_at: now, updated_at: now })
        .eq('id', item.delivery_id)
        .is('supplier_paid_at', null)
      await logDeliveryEvent(supabase, item.delivery_id, 'milestone', {
        toStage: 'supplier_paid_at',
        note: 'Supplier bill paid in full',
      })
    }
    revalidatePath('/deliveries')
  }

  revalidatePath('/bills')
  revalidatePath(`/bills/${billId}`)
  redirect(`/bills/${billId}`)
}

// ---------------------------------------------------------------------------
// Delete (only before any payment is recorded)
// ---------------------------------------------------------------------------

export async function deleteSupplierBill(billId: string): Promise<void> {
  const supabase = await createClient()

  const { data: payments } = await supabase
    .from('payments')
    .select('id')
    .eq('supplier_bill_id', billId)
    .limit(1)
  if ((payments ?? []).length > 0) return

  const { data: items } = await supabase
    .from('supplier_bill_items')
    .select('delivery_id')
    .eq('supplier_bill_id', billId)

  await supabase.from('supplier_bills').delete().eq('id', billId)

  const now = new Date().toISOString()
  for (const item of items ?? []) {
    await supabase
      .from('deliveries')
      .update({ supplier_invoiced_at: null, updated_at: now })
      .eq('id', item.delivery_id)
    await logDeliveryEvent(supabase, item.delivery_id, 'bill_deleted', {
      note: 'Removed from a deleted supplier bill',
    })
  }

  revalidatePath('/bills')
  revalidatePath('/deliveries')
  redirect('/bills')
}
