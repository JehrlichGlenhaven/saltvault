'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { numOrNull, str, strOrNull, type FormState } from '@/lib/forms'
import { MILESTONE_KEYS, currentStage, milestoneLabel, type MilestoneKey } from '@/lib/milestones'
import type { Delivery } from '@/lib/types'

// ---------------------------------------------------------------------------
// Price quote: current supplier price + most specific active markup rule
// (subcontractor > product > global)
// ---------------------------------------------------------------------------

export type PriceQuote = {
  costPerTon: number | null
  sellPerTon: number | null
  markupPct: number | null
}

export async function getPriceQuote(
  supplierId: string,
  productId: string,
  subcontractorId: string
): Promise<PriceQuote> {
  const empty = { costPerTon: null, sellPerTon: null, markupPct: null }
  if (!supplierId || !productId || !subcontractorId) return empty

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: price } = await supabase
    .from('supplier_prices')
    .select('price_per_ton')
    .eq('supplier_id', supplierId)
    .eq('product_id', productId)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle()

  const costPerTon = price ? Number(price.price_per_ton) : null

  const { data: rules } = await supabase
    .from('markup_rules')
    .select('scope, product_id, subcontractor_id, markup_pct, effective_from')
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('effective_from', { ascending: false })

  const active = rules ?? []
  const subRule = active.find(
    (r) => r.scope === 'subcontractor' && r.subcontractor_id === subcontractorId
  )
  const productRule = active.find(
    (r) => r.scope === 'product' && r.product_id === productId
  )
  const globalRule = active.find((r) => r.scope === 'global')
  const rule = subRule ?? productRule ?? globalRule ?? null

  const markupPct = rule ? Number(rule.markup_pct) : null
  const sellPerTon =
    costPerTon !== null && markupPct !== null
      ? Math.round(costPerTon * (1 + markupPct / 100) * 100) / 100
      : null

  return { costPerTon, sellPerTon, markupPct }
}

// ---------------------------------------------------------------------------
// Create / update / delete
// ---------------------------------------------------------------------------

function parseDelivery(fd: FormData) {
  return {
    season_id: str(fd, 'season_id'),
    supplier_id: str(fd, 'supplier_id'),
    product_id: str(fd, 'product_id'),
    subcontractor_id: str(fd, 'subcontractor_id'),
    site_id: str(fd, 'site_id'),
    loads: numOrNull(fd, 'loads'),
    est_tons_per_load: numOrNull(fd, 'est_tons_per_load'),
    cost_per_ton: numOrNull(fd, 'cost_per_ton'),
    sell_per_ton: numOrNull(fd, 'sell_per_ton'),
    misc_fee: numOrNull(fd, 'misc_fee') ?? 0,
    supplier_ticket: strOrNull(fd, 'supplier_ticket'),
    notes: strOrNull(fd, 'notes'),
  }
}

function validateDelivery(parsed: ReturnType<typeof parseDelivery>): string | null {
  if (
    !parsed.season_id ||
    !parsed.supplier_id ||
    !parsed.product_id ||
    !parsed.subcontractor_id ||
    !parsed.site_id
  ) {
    return 'Season, supplier, product, subcontractor, and site are all required.'
  }
  if (parsed.loads === null || parsed.loads <= 0) return 'Loads must be greater than zero.'
  if (parsed.est_tons_per_load === null || parsed.est_tons_per_load <= 0) {
    return 'Estimated tons per load must be greater than zero.'
  }
  if (parsed.cost_per_ton === null || parsed.cost_per_ton < 0) return 'Enter a valid cost per ton.'
  if (parsed.sell_per_ton === null || parsed.sell_per_ton < 0) return 'Enter a valid sell per ton.'
  return null
}

async function logEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  deliveryId: string,
  event: string,
  options: { fromStage?: string | null; toStage?: string | null; note?: string | null } = {}
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  await supabase.from('delivery_events').insert({
    delivery_id: deliveryId,
    event,
    from_stage: options.fromStage ?? null,
    to_stage: options.toStage ?? null,
    note: options.note ?? null,
    created_by: user?.id ?? null,
  })
}

export async function createDelivery(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parseDelivery(fd)
  const validationError = validateDelivery(parsed)
  if (validationError) return { error: validationError }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      ...parsed,
      order_placed_at: new Date().toISOString(),
      created_by: user?.id ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logEvent(supabase, data.id, 'created', { toStage: 'order_placed_at' })

  revalidatePath('/deliveries')
  redirect(`/deliveries/${data.id}`)
}

export async function updateDelivery(
  id: string,
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('deliveries')
    .select('reconciled_at')
    .eq('id', id)
    .single()
  if (existing?.reconciled_at) {
    return { error: 'This delivery is reconciled — quantities and prices are locked.' }
  }

  const parsed = parseDelivery(fd)
  const validationError = validateDelivery(parsed)
  if (validationError) return { error: validationError }

  const { error } = await supabase
    .from('deliveries')
    .update({ ...parsed, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }

  await logEvent(supabase, id, 'edited')

  revalidatePath('/deliveries')
  revalidatePath(`/deliveries/${id}`)
  redirect(`/deliveries/${id}`)
}

export async function deleteDelivery(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('deliveries').delete().eq('id', id)
  revalidatePath('/deliveries')
  redirect('/deliveries')
}

// ---------------------------------------------------------------------------
// Pipeline milestones
// ---------------------------------------------------------------------------

export async function advanceMilestone(id: string, milestone: MilestoneKey): Promise<void> {
  if (!MILESTONE_KEYS.includes(milestone) || milestone === 'reconciled_at') return

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('deliveries')
    .select('*')
    .eq('id', id)
    .single()
  if (!existing || existing[milestone]) return // already set

  const from = currentStage(existing as Delivery)

  await supabase
    .from('deliveries')
    .update({ [milestone]: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)

  await logEvent(supabase, id, 'milestone', {
    fromStage: from,
    toStage: milestone,
    note: milestoneLabel(milestone),
  })

  revalidatePath('/deliveries')
  revalidatePath(`/deliveries/${id}`)
}

export async function reconcileDelivery(
  id: string,
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const actualTons = numOrNull(fd, 'actual_tons')
  if (actualTons === null || actualTons <= 0) {
    return { error: 'Enter the actual tonnage from the supplier invoice.' }
  }
  const actualCostPerTon = numOrNull(fd, 'actual_cost_per_ton')
  if (actualCostPerTon === null || actualCostPerTon < 0) {
    return { error: 'Enter the actual cost per ton from the supplier invoice.' }
  }
  const supplierTicket = strOrNull(fd, 'supplier_ticket')
  const note = strOrNull(fd, 'note')

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('deliveries')
    .select('reconciled_at, cost_per_ton')
    .eq('id', id)
    .single()
  if (existing?.reconciled_at) {
    return { error: 'This delivery is already reconciled.' }
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('deliveries')
    .update({
      actual_tons: actualTons,
      cost_per_ton: actualCostPerTon,
      ...(supplierTicket ? { supplier_ticket: supplierTicket } : {}),
      reconciled_at: now,
      updated_at: now,
    })
    .eq('id', id)
  if (error) return { error: error.message }

  const costChanged = Number(existing?.cost_per_ton) !== actualCostPerTon
  await logEvent(supabase, id, 'reconciled', {
    toStage: 'reconciled_at',
    note: `Actual tons: ${actualTons} · cost $${actualCostPerTon.toFixed(2)}/t${
      costChanged ? ` (was $${Number(existing?.cost_per_ton).toFixed(2)}/t)` : ''
    }${note ? ` — ${note}` : ''}`,
  })

  revalidatePath('/deliveries')
  revalidatePath(`/deliveries/${id}`)
  redirect(`/deliveries/${id}`)
}
