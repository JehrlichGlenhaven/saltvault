'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUniqueViolation, numOrNull, str, strOrNull, type FormState } from '@/lib/forms'

export async function receiveStock(_prev: FormState, fd: FormData): Promise<FormState> {
  const locationId = str(fd, 'location_id')
  const productId = str(fd, 'product_id')
  const qty = numOrNull(fd, 'qty')
  const unitRaw = str(fd, 'unit')
  const costPerUnit = numOrNull(fd, 'cost_per_unit')
  const bagsPerPallet = numOrNull(fd, 'bags_per_pallet')
  const reference = strOrNull(fd, 'reference')
  const note = strOrNull(fd, 'note')

  if (!locationId) return { error: 'Pick a location.' }
  if (!productId) return { error: 'Pick a product.' }
  if (qty === null || qty <= 0) return { error: 'Enter a quantity.' }
  if (costPerUnit === null || costPerUnit < 0) return { error: 'Enter the cost per unit.' }

  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('unit')
    .eq('id', productId)
    .single()
  const productUnit = product?.unit === 'ton' ? 'ton' : 'bag'

  let ledgerQty: number
  let ledgerCost: number
  let autoNote: string | null = null

  if (productUnit === 'ton') {
    // bulk product: qty and cost are per ton
    ledgerQty = qty
    ledgerCost = costPerUnit
  } else {
    const unit = unitRaw === 'pallet' ? 'pallet' : 'bag'
    if (unit === 'pallet' && (bagsPerPallet === null || bagsPerPallet <= 0)) {
      return { error: 'Enter bags per pallet.' }
    }
    const bpp = bagsPerPallet ?? 50
    ledgerQty = unit === 'pallet' ? qty * bpp : qty
    ledgerCost = unit === 'pallet' ? costPerUnit / bpp : costPerUnit
    autoNote = unit === 'pallet' ? `${qty} pallet(s) × ${bpp} bags` : null
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('inventory_movements').insert({
    location_id: locationId,
    product_id: productId,
    qty: ledgerQty,
    kind: 'purchase',
    unit_cost: Math.round(ledgerCost * 10000) / 10000,
    reference,
    note: note ?? autoNote,
    created_by: user?.id ?? null,
  })
  if (error) return { error: error.message }

  revalidatePath('/inventory')
  redirect('/inventory')
}

export async function adjustStock(_prev: FormState, fd: FormData): Promise<FormState> {
  const locationId = str(fd, 'location_id')
  const productId = str(fd, 'product_id')
  const qty = numOrNull(fd, 'qty')
  const note = strOrNull(fd, 'note')

  if (!locationId) return { error: 'Pick a location.' }
  if (!productId) return { error: 'Pick a product.' }
  if (qty === null || qty === 0) return { error: 'Enter a non-zero quantity (negative to remove).' }
  if (!note) return { error: 'Enter a reason for the adjustment.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('inventory_movements').insert({
    location_id: locationId,
    product_id: productId,
    qty: qty,
    kind: 'adjustment',
    note,
    created_by: user?.id ?? null,
  })
  if (error) return { error: error.message }

  revalidatePath('/inventory')
  redirect('/inventory')
}

export async function createLocation(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, 'name')
  if (!name) return { error: 'Enter a location name.' }

  const supabase = await createClient()
  const { error } = await supabase.from('inventory_locations').insert({
    name,
    address: strOrNull(fd, 'address'),
    notes: strOrNull(fd, 'notes'),
  })
  if (error) {
    return { error: isUniqueViolation(error) ? 'A location with that name already exists.' : error.message }
  }

  revalidatePath('/inventory')
  redirect('/inventory')
}
