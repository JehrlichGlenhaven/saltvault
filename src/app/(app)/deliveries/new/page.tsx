import { Suspense } from 'react'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import type { Product, Season, Site, Subcontractor, Supplier } from '@/lib/types'
import { createDelivery } from '../actions'
import { DeliveryForm } from '../form'

async function NewDelivery() {
  const supabase = await createClient()
  const [{ data: seasons }, { data: suppliers }, { data: products }, { data: subs }, { data: sites }] =
    await Promise.all([
      supabase.from('seasons').select('*').order('start_date', { ascending: false, nullsFirst: false }),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('products').select('*').eq('active', true).order('name'),
      supabase.from('subcontractors').select('*').eq('active', true).order('name'),
      supabase.from('sites').select('*').order('name'),
    ])

  const typedSeasons = (seasons ?? []) as Season[]
  const activeSeason = typedSeasons.find((s) => s.is_active)

  return (
    <main>
      <PageHeader title="New delivery" />
      <p className="mb-6 text-sm text-zinc-500">
        Placing the order stamps the first milestone (order placed). Cost and sell prices
        auto-fill from the price tables once you pick supplier, product, and sub — and stay
        editable.
      </p>
      <DeliveryForm
        action={createDelivery}
        seasons={typedSeasons}
        suppliers={(suppliers ?? []) as Supplier[]}
        products={(products ?? []) as Product[]}
        subcontractors={(subs ?? []) as Subcontractor[]}
        sites={(sites ?? []) as Site[]}
        defaultSeasonId={activeSeason?.id}
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
