import { Suspense } from 'react'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import type { Product, Season, Site, Subcontractor, Supplier, InventoryLocation } from '@/lib/types'
import { createDelivery } from '../actions'
import { DeliveryForm } from '../form'

async function NewDelivery() {
  const supabase = await createClient()
  const [{ data: seasons }, { data: suppliers }, { data: products }, { data: subs }, { data: sites }, { data: locations }, { data: movements }] =
    await Promise.all([
      supabase.from('seasons').select('*').order('start_date', { ascending: false, nullsFirst: false }),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('products').select('*').eq('active', true).order('name'),
      supabase.from('subcontractors').select('*').eq('active', true).order('name'),
      supabase.from('sites').select('*').order('name'),
      supabase.from('inventory_locations').select('*').order('name'),
      supabase
        .from('inventory_movements')
        .select('location_id, product_id, qty_bags, kind, unit_cost')
        .order('created_at', { ascending: false })
        .limit(5000),
    ])

  const typedSeasons = (seasons ?? []) as Season[]
  const activeSeason = typedSeasons.find((s) => s.is_active)

  // stock maps for the "From our inventory" panel (movements are newest-first)
  const onHand: Record<string, number> = {}
  const lastCosts: Record<string, number> = {}
  for (const m of movements ?? []) {
    const key = `${m.location_id}:${m.product_id}`
    onHand[key] = (onHand[key] ?? 0) + Number(m.qty_bags)
    if (m.kind === 'purchase' && m.unit_cost !== null && !(key in lastCosts)) {
      lastCosts[key] = Number(m.unit_cost)
    }
  }

  return (
    <main>
      <PageHeader title="New delivery" />
      <p className="mb-6 text-sm text-zinc-500">
        Placing the order stamps the first milestone (order placed). Cost and markup
        auto-fill from the price tables for supplier deliveries once you pick supplier,
        product, and sub — or flip to “From our inventory” to sell stock you hold.
      </p>
      <DeliveryForm
        action={createDelivery}
        seasons={typedSeasons}
        suppliers={(suppliers ?? []) as Supplier[]}
        products={(products ?? []) as Product[]}
        subcontractors={(subs ?? []) as Subcontractor[]}
        sites={(sites ?? []) as Site[]}
        defaultSeasonId={activeSeason?.id}
        locations={(locations ?? []) as InventoryLocation[]}
        onHand={onHand}
        lastCosts={lastCosts}
      />
    </main>
  )
}

export default function NewDeliveryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <NewDelivery />
    </Suspense>
  )
}
