import { Suspense } from 'react'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import type { Subcontractor } from '@/lib/types'
import { createSubInvoice } from '../actions'
import { NewInvoiceForm, type InvoiceCandidate } from '../new-form'

async function NewInvoice() {
  const supabase = await createClient()
  const [{ data: subs }, { data: candidates }, { count }] = await Promise.all([
    supabase.from('subcontractors').select('*').eq('active', true).order('name'),
    supabase
      .from('deliveries')
      .select('*, sites(name), products(name)')
      .not('reconciled_at', 'is', null)
      .is('sub_invoiced_at', null)
      .order('order_placed_at', { ascending: true, nullsFirst: false }),
    supabase.from('sub_invoices').select('*', { count: 'exact', head: true }),
  ])

  return (
    <main>
      <PageHeader title="New sub invoice" />
      <p className="mb-6 text-sm text-zinc-500">
        Only reconciled deliveries (actual tonnage known) that aren&apos;t already invoiced
        appear below. Creating the invoice stamps “sub invoiced” on those deliveries.
      </p>
      <NewInvoiceForm
        action={createSubInvoice}
        subcontractors={(subs ?? []) as Subcontractor[]}
        candidates={(candidates ?? []) as unknown as InvoiceCandidate[]}
        suggestedNumber={`INV-${String((count ?? 0) + 1).padStart(4, '0')}`}
      />
    </main>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <NewInvoice />
    </Suspense>
  )
}
