'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { numOrNull, str, strOrNull, type FormState } from '@/lib/forms'
import { MILESTONE_KEYS, currentStage, milestoneLabel, type MilestoneKey } from '@/lib/milestones'
import { createAutoInvoiceForDelivery, syncInvoiceAmountForDelivery } from '@/lib/auto-invoice'
import { costPerSellUnit } from '@/lib/money'
import type { Delivery } from '@/lib/types'

// ---------------------------------------------------------------------------
// Price quote: current supplier price + most specific active markup rule
// (subcontractor > product > global)
// ---------------------------------------------------------------------------

export type PriceQuote = {
  costPerTon: number | null
  markupPerTon: number | null
  markupPct: number | null
}

export async function getPriceQuote(
  supplierId: string,
  productId: string,
  subcontractorId: string
): Promise<PriceQuote> {
  const empty = { costPerTon: null, markupPerTon: null, markupPct: null }
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
  const markupPerTon =
    costPerTon !== null && markupPct !== null
      ? Math.round(costPerTon * (markupPct / 100) * 100) / 100
      : null

  return { costPerTon, markupPerTon, markupPct }
}

// ---------------------------------------------------------------------------
// Create / update / delete
// ---------------------------------------------------------------------------

function parseDelivery(fd: FormData) {
  const base = {
    season_id: str(fd, 'season_id'),
    supplier_id: strOrNull(fd, 'supplier_id'),
    product_id: str(fd, 'product_id'),
    subcontractor_id: str(fd, 'subcontractor_id'),
    site_id: str(fd, 'site_id'),
    source: str(fd, 'source') === 'inventory' ? ('inventory' as const) : ('supplier' as const),
    inventory_location_id: strOrNull(fd, 'inventory_location_id'),
    misc_fee: numOrNull(fd, 'misc_fee') ?? 0,
    supplier_ticket: strOrNull(fd, 'supplier_ticket'),
    notes: strOrNull(fd, 'notes'),
  }

  if (str(fd, 'qty_mode') === 'bags') {
    return {
      ...base,
      qty_mode: 'bags' as const,
      // ton columns unused in bag mode (sell_per_ton is generated from these)
      loads: 1,
      est_tons_per_load: 22,
      cost_per_ton: 0,
      markup_per_ton: 0,
      buy_unit: str(fd, 'buy_unit'),
      buy_qty: numOrNull(fd, 'buy_qty'),
      buy_unit_cost: numOrNull(fd, 'buy_unit_cost'),
      sell_unit: str(fd, 'sell_unit'),
      sell_qty: numOrNull(fd, 'sell_qty'),
      sell_markup_per_unit: numOrNull(fd, 'sell_markup_per_unit'),
      bags_per_pallet: numOrNull(fd, 'bags_per_pallet'),
      sell_unit_price: null as number | null,
    }
  }

  return {
    ...base,
    qty_mode: 'tons' as const,
    loads: numOrNull(fd, 'loads'),
    est_tons_per_load: numOrNull(fd, 'est_tons_per_load'),
    cost_per_ton: numOrNull(fd, 'cost_per_ton'),
    markup_per_ton: numOrNull(fd, 'markup_per_ton'),
    buy_unit: null,
    buy_qty: null,
    buy_unit_cost: null,
    sell_unit: null,
    sell_qty: null,
    sell_markup_per_unit: null,
    bags_per_pallet: null,
    sell_unit_price: null,
  }
}

function validateDelivery(parsed: ReturnType<typeof parseDelivery>): string | null {
  if (!parsed.season_id || !parsed.product_id || !parsed.subcontractor_id || !parsed.site_id) {
    return 'Season, product, subcontractor, and site are all required.'
  }
  if (parsed.source === 'supplier' && !parsed.supplier_id) return 'Pick a supplier.'
  if (parsed.source === 'inventory') {
    if (!parsed.inventory_location_id) return 'Pick an inventory location.'
  }

  if (parsed.qty_mode === 'bags') {
    if (!['bag', 'pallet'].includes(parsed.buy_unit) || !['bag', 'pallet'].includes(parsed.sell_unit)) {
      return 'Pick the buy and sell units (bags or pallets).'
    }
    if (parsed.buy_qty === null || parsed.buy_qty <= 0) return 'Enter the buy quantity.'
    if (parsed.buy_unit_cost === null || parsed.buy_unit_cost < 0) return 'Enter the buy cost per unit.'
    if (parsed.sell_qty === null || parsed.sell_qty <= 0) return 'Enter the sell quantity.'
    if (parsed.sell_markup_per_unit === null || parsed.sell_markup_per_unit < 0) {
      return 'Enter the markup per unit.'
    }
    if (parsed.bags_per_pallet === null || parsed.bags_per_pallet <= 0) return 'Enter bags per pallet.'
    // sell price per unit = buy cost converted to the sell unit + markup
    parsed.sell_unit_price =
      Math.round(
        (costPerSellUnit(
          parsed.buy_unit as 'bag' | 'pallet',
          parsed.sell_unit as 'bag' | 'pallet',
          parsed.buy_unit_cost,
          parsed.bags_per_pallet
        ) +
          parsed.sell_markup_per_unit) *
          100
      ) / 100
    return null
  }

  if (parsed.loads === null || parsed.loads <= 0) return 'Loads must be greater than zero.'
  if (parsed.est_tons_per_load === null || parsed.est_tons_per_load <= 0) {
    return 'Estimated tons per load must be greater than zero.'
  }
  if (parsed.cost_per_ton === null || parsed.cost_per_ton < 0) return 'Enter a valid cost per ton.'
  if (parsed.markup_per_ton === null || parsed.markup_per_ton < 0) return 'Enter a valid markup per ton.'
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

async function createInventoryDelivery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parsed: ReturnType<typeof parseDelivery>,
  userId: string | null
): Promise<FormState> {
  const { data: product } = await supabase
    .from('products')
    .select('unit')
    .eq('id', parsed.product_id)
    .single()
  const productUnit = product?.unit === 'ton' ? 'ton' : product?.unit === 'bag' ? 'bag' : null
  if (!productUnit) return { error: 'Inventory sales need a bagged or bulk (ton) product.' }
  if (productUnit === 'bag' && parsed.qty_mode !== 'bags') {
    return { error: 'That is a bagged product — use the bags/pallets panel.' }
  }
  if (productUnit === 'ton' && parsed.qty_mode !== 'tons') {
    return { error: 'That is a bulk product — use the loads/tons panel.' }
  }

  // quantity leaving stock, in the product's unit
  const bpp = parsed.bags_per_pallet ?? 50
  const sellQty =
    productUnit === 'ton'
      ? parsed.loads! * parsed.est_tons_per_load!
      : parsed.sell_unit === 'pallet'
        ? parsed.sell_qty! * bpp
        : parsed.sell_qty!
  const ledgerCost =
    productUnit === 'ton'
      ? parsed.cost_per_ton!
      : parsed.buy_unit === 'pallet'
        ? parsed.buy_unit_cost! / bpp
        : parsed.buy_unit_cost!

  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('qty')
    .eq('location_id', parsed.inventory_location_id!)
    .eq('product_id', parsed.product_id)
  const onHand = (movements ?? []).reduce((sum, m) => sum + Number(m.qty), 0)
  if (sellQty > onHand + 0.001) {
    return {
      error: `Not enough stock — ${Number(onHand.toFixed(2))} ${productUnit === 'ton' ? 'tons' : 'bags'} on hand at that location; you tried to sell ${Number(sellQty.toFixed(2))}.`,
    }
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      ...parsed,
      // inventory sales are actual at creation — nothing to reconcile
      ...(productUnit === 'ton'
        ? { actual_tons: sellQty }
        : {
            actual_sell_qty: parsed.sell_qty,
            actual_buy_qty: parsed.buy_qty,
            actual_buy_unit_cost: parsed.buy_unit_cost,
          }),
      reconciled_at: now,
      order_placed_at: now,
      created_by: userId,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }

  await supabase.from('inventory_movements').insert({
    location_id: parsed.inventory_location_id,
    product_id: parsed.product_id,
    qty: -sellQty,
    kind: 'sale',
    unit_cost: Math.round(ledgerCost * 10000) / 10000,
    delivery_id: data.id,
    created_by: userId,
  })

  await logEvent(supabase, data.id, 'created', {
    toStage: 'order_placed_at',
    note: 'Sold from inventory',
  })

  // auto-invoice (inventory sale amounts are final at creation)
  const invAmount =
    parsed.qty_mode === 'bags'
      ? parsed.sell_qty! * parsed.sell_unit_price!
      : parsed.loads! * parsed.est_tons_per_load! * (parsed.cost_per_ton! + parsed.markup_per_ton!)
  const invResult = await createAutoInvoiceForDelivery(
    supabase,
    { id: data.id, subcontractor_id: parsed.subcontractor_id, season_id: parsed.season_id },
    invAmount,
    userId
  )
  if (invResult.error) {
    return { error: `Delivery was created — but the auto-invoice failed: ${invResult.error}. Create it manually from Invoices.` }
  }

  revalidatePath('/deliveries')
  revalidatePath('/inventory')
  revalidatePath('/invoices')
  redirect(`/deliveries/${data.id}`)
}

export async function createDelivery(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parseDelivery(fd)
  const validationError = validateDelivery(parsed)
  if (validationError) return { error: validationError }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (parsed.source === 'inventory') {
    return createInventoryDelivery(supabase, parsed, user?.id ?? null)
  }

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

  // auto-invoice at the order-time estimate (corrected to actuals at reconcile)
  const estAmount =
    parsed.qty_mode === 'bags'
      ? parsed.sell_qty! * parsed.sell_unit_price!
      : parsed.loads! * parsed.est_tons_per_load! * (parsed.cost_per_ton! + parsed.markup_per_ton!)
  const invoiceResult = await createAutoInvoiceForDelivery(
    supabase,
    { id: data.id, subcontractor_id: parsed.subcontractor_id, season_id: parsed.season_id },
    estAmount,
    user?.id ?? null
  )
  if (invoiceResult.error) {
    return { error: `Delivery was created — but the auto-invoice failed: ${invoiceResult.error}. Create it manually from Invoices.` }
  }

  revalidatePath('/deliveries')
  revalidatePath('/invoices')
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

export async function deleteDelivery(id: string): Promise<FormState> {
  const supabase = await createClient()

  // auto-invoice cleanup: remove the linked invoice, unless it has payments
  const { data: linkedItem } = await supabase
    .from('sub_invoice_items')
    .select('sub_invoice_id')
    .eq('delivery_id', id)
    .maybeSingle()
  if (linkedItem) {
    const { data: payments } = await supabase
      .from('payments')
      .select('id')
      .eq('sub_invoice_id', linkedItem.sub_invoice_id)
      .limit(1)
    if ((payments ?? []).length > 0) {
      return { error: 'This delivery’s invoice has payments recorded — it can’t be deleted.' }
    }
    await supabase.from('sub_invoices').delete().eq('id', linkedItem.sub_invoice_id)
  }

  // deleting an inventory sale returns the stock
  const { data: existing } = await supabase
    .from('deliveries')
    .select('source, inventory_location_id, product_id')
    .eq('id', id)
    .single()
  if (existing?.source === 'inventory' && existing.inventory_location_id) {
    const { data: saleMovements } = await supabase
      .from('inventory_movements')
      .select('qty')
      .eq('delivery_id', id)
      .eq('kind', 'sale')
    const soldBags = (saleMovements ?? []).reduce((sum, m) => sum + Math.abs(Number(m.qty)), 0)
    if (soldBags > 0) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      await supabase.from('inventory_movements').insert({
        location_id: existing.inventory_location_id,
        product_id: existing.product_id,
        qty: soldBags,
        kind: 'adjustment',
        note: 'Restored from deleted delivery',
        created_by: user?.id ?? null,
      })
    }
  }

  await supabase.from('deliveries').delete().eq('id', id)
  revalidatePath('/deliveries')
  revalidatePath('/inventory')
  revalidatePath('/invoices')
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
  const supplierTicket = strOrNull(fd, 'supplier_ticket')
  const note = strOrNull(fd, 'note')

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('deliveries')
    .select('reconciled_at, cost_per_ton, markup_per_ton, qty_mode, buy_unit, sell_unit, bags_per_pallet')
    .eq('id', id)
    .single()
  if (existing?.reconciled_at) {
    return { error: 'This delivery is already reconciled.' }
  }

  const now = new Date().toISOString()

  if (existing?.qty_mode === 'bags') {
    const actualSellQty = numOrNull(fd, 'actual_sell_qty')
    const actualBuyQty = numOrNull(fd, 'actual_buy_qty')
    const actualBuyCost = numOrNull(fd, 'actual_buy_unit_cost')
    const markup = numOrNull(fd, 'sell_markup_per_unit')
    if (actualSellQty === null || actualSellQty <= 0) return { error: 'Enter the actual quantity delivered to the sub.' }
    if (actualBuyQty === null || actualBuyQty <= 0) return { error: 'Enter the actual buy quantity from the supplier invoice.' }
    if (actualBuyCost === null || actualBuyCost < 0) return { error: 'Enter the actual buy cost per unit.' }
    if (markup === null || markup < 0) return { error: 'Enter the markup per unit.' }

    const sellUnitPrice =
      Math.round(
        (costPerSellUnit(
          existing.buy_unit as 'bag' | 'pallet',
          existing.sell_unit as 'bag' | 'pallet',
          actualBuyCost,
          Number(existing.bags_per_pallet)
        ) +
          markup) *
          100
      ) / 100

    const { error } = await supabase
      .from('deliveries')
      .update({
        actual_sell_qty: actualSellQty,
        actual_buy_qty: actualBuyQty,
        actual_buy_unit_cost: actualBuyCost,
        sell_markup_per_unit: markup,
        sell_unit_price: sellUnitPrice,
        ...(supplierTicket ? { supplier_ticket: supplierTicket } : {}),
        reconciled_at: now,
        updated_at: now,
      })
      .eq('id', id)
    if (error) return { error: error.message }

    await logEvent(supabase, id, 'reconciled', {
      toStage: 'reconciled_at',
      note: `Actual: sold ${actualSellQty} ${existing.sell_unit}(s) · bought ${actualBuyQty} ${existing.buy_unit}(s) @ $${actualBuyCost.toFixed(2)} · markup $${markup.toFixed(2)}/unit${note ? ` — ${note}` : ''}`,
    })

    await syncInvoiceAmountForDelivery(supabase, id, actualSellQty * sellUnitPrice)

    revalidatePath('/deliveries')
    revalidatePath('/invoices')
    revalidatePath(`/deliveries/${id}`)
    redirect(`/deliveries/${id}`)
  }

  const actualTons = numOrNull(fd, 'actual_tons')
  if (actualTons === null || actualTons <= 0) {
    return { error: 'Enter the actual tonnage from the supplier invoice.' }
  }
  const actualCostPerTon = numOrNull(fd, 'actual_cost_per_ton')
  if (actualCostPerTon === null || actualCostPerTon < 0) {
    return { error: 'Enter the actual cost per ton from the supplier invoice.' }
  }
  const markupPerTon = numOrNull(fd, 'markup_per_ton')
  if (markupPerTon === null || markupPerTon < 0) {
    return { error: 'Enter the markup per ton.' }
  }

  const { error } = await supabase
    .from('deliveries')
    .update({
      actual_tons: actualTons,
      cost_per_ton: actualCostPerTon,
      markup_per_ton: markupPerTon,
      ...(supplierTicket ? { supplier_ticket: supplierTicket } : {}),
      reconciled_at: now,
      updated_at: now,
    })
    .eq('id', id)
  if (error) return { error: error.message }

  const costChanged = Number(existing?.cost_per_ton) !== actualCostPerTon
  const markupChanged = Number(existing?.markup_per_ton) !== markupPerTon
  await logEvent(supabase, id, 'reconciled', {
    toStage: 'reconciled_at',
    note: `Actual tons: ${actualTons} · cost $${actualCostPerTon.toFixed(2)}/t${
      costChanged ? ` (was $${Number(existing?.cost_per_ton).toFixed(2)}/t)` : ''
    } · markup $${markupPerTon.toFixed(2)}/t${
      markupChanged ? ` (was $${Number(existing?.markup_per_ton).toFixed(2)}/t)` : ''
    }${note ? ` — ${note}` : ''}`,
  })

  await syncInvoiceAmountForDelivery(supabase, id, actualTons * (actualCostPerTon + markupPerTon))

  revalidatePath('/deliveries')
  revalidatePath('/invoices')
  revalidatePath(`/deliveries/${id}`)
  redirect(`/deliveries/${id}`)
}
