import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import { getMyRole } from '@/lib/role'
import type { Product, Supplier } from '@/lib/types'
import { createSupplierPrice } from '../actions'
import { SupplierPriceForm } from '../form'

async function NewPrice() {
  if ((await getMyRole()) !== 'admin') redirect('/settings/supplier-prices')

  const supabase = await createClient()
  const [{ data: suppliers }, { data: products }] = await Promise.all([
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('products').select('*').eq('active', true).order('name'),
  ])

  return (
    <main>
      <PageHeader title="Add supplier price" />
      <SupplierPriceForm
        action={createSupplierPrice}
        suppliers={(suppliers ?? []) as Supplier[]}
        products={(products ?? []) as Product[]}
      />
    </main>
  )
}

export default function NewSupplierPricePage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <NewPrice />
    </Suspense>
  )
}
