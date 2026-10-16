'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { numOrNull, str, strOrNull, type FormState } from '@/lib/forms'
import { hasOverlappingWindow } from '@/lib/overlap'
import { getMyRole } from '@/lib/role'

function parsePrice(fd: FormData) {
  return {
    supplier_id: str(fd, 'supplier_id'),
    product_id: str(fd, 'product_id'),
    price_per_ton: numOrNull(fd, 'price_per_ton'),
    effective_from: str(fd, 'effective_from'),
    effective_to: strOrNull(fd, 'effective_to'),
  }
}

async function validate(
  parsed: ReturnType<typeof parsePrice>,
  excludeId?: string
): Promise<string | null> {
  if (await getMyRole() !== 'admin') return 'Only admins can manage supplier prices.'
  if (!parsed.supplier_id || !parsed.product_id) return 'Pick a supplier and a product.'
  if (parsed.price_per_ton === null || parsed.price_per_ton < 0) return 'Enter a valid price per ton.'
  if (!parsed.effective_from) return 'Enter an effective-from date.'
  if (parsed.effective_to && parsed.effective_to <= parsed.effective_from) {
    return 'Effective-to must be after effective-from.'
  }

  const supabase = await createClient()
  const overlaps = await hasOverlappingWindow(
    supabase,
    'supplier_prices',
    { supplier_id: parsed.supplier_id, product_id: parsed.product_id },
    parsed.effective_from,
    parsed.effective_to,
    excludeId
  )
  if (overlaps) {
    return 'This overlaps an existing price window for that supplier and product. Close the old window first.'
  }
  return null
}

export async function createSupplierPrice(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parsePrice(fd)
  const validationError = await validate(parsed)
  if (validationError) return { error: validationError }

  const supabase = await createClient()
  const { error } = await supabase.from('supplier_prices').insert({
    supplier_id: parsed.supplier_id,
    product_id: parsed.product_id,
    price_per_ton: parsed.price_per_ton,
    effective_from: parsed.effective_from,
    effective_to: parsed.effective_to,
  })
  if (error) return { error: error.message }
  revalidatePath('/supplier-prices')
  redirect('/supplier-prices')
}

export async function updateSupplierPrice(
  id: string,
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const parsed = parsePrice(fd)
  const validationError = await validate(parsed, id)
  if (validationError) return { error: validationError }

  const supabase = await createClient()
  const { error } = await supabase
    .from('supplier_prices')
    .update({
      supplier_id: parsed.supplier_id,
      product_id: parsed.product_id,
      price_per_ton: parsed.price_per_ton,
      effective_from: parsed.effective_from,
      effective_to: parsed.effective_to,
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/supplier-prices')
  redirect('/supplier-prices')
}

export async function deleteSupplierPrice(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('supplier_prices').delete().eq('id', id)
  revalidatePath('/supplier-prices')
  redirect('/supplier-prices')
}
