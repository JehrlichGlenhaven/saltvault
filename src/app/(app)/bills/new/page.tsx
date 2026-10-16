import { Suspense } from 'react'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import type { Supplier } from '@/lib/types'
import { createSupplierBill } from '../actions'
import { NewBillForm, type BillCandidate } from '../new-form'

async function NewBill() {
  const supabase = await createClient()
  const [{ data: suppliers }, { data: candidates }] = await Promise.all([
    supabase.from('suppliers').select('*').order('name'),
    supabase
      .from('deliveries')
      .select('*, subcontractors(name), sites(name), products(name)')
      .is('supplier_invoiced_at', null)
      .order('order_placed_at', { ascending: true, nullsFirst: false }),
  ])

  return (
    <main>
      <PageHeader title="New supplier bill" />
      <p className="mb-6 text-sm text-zinc-500">
        Enter the bill from your supplier and check the deliveries it covers. For any
        delivery that isn&apos;t reconciled yet, type the actual tons from the bill —
        that reconciles it in one step.
      </p>
      <NewBillForm
        action={createSupplierBill}
        suppliers={(suppliers ?? []) as Supplier[]}
        candidates={(candidates ?? []) as unknown as BillCandidate[]}
      />
    </main>
  )
}

export default function NewBillPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <NewBill />
    </Suspense>
  )
}
