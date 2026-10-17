import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { DeleteButton } from '@/components/delete-button'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import { getMyRole } from '@/lib/role'
import type { Product, Supplier, SupplierPrice } from '@/lib/types'
import { deleteSupplierPrice, updateSupplierPrice } from '../actions'
import { SupplierPriceForm } from '../form'

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  if ((await getMyRole()) !== 'admin') redirect('/settings/supplier-prices')

  const { id } = await params
  const supabase = await createClient()
  const [{ data: price }, { data: suppliers }, { data: products }] = await Promise.all([
    supabase.from('supplier_prices').select('*').eq('id', id).single(),
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('products').select('*').eq('active', true).order('name'),
  ])
  if (!price) notFound()

  return (
    <main>
      <div className="flex items-start justify-between">
        <PageHeader title="Edit supplier price" />
        <DeleteButton action={deleteSupplierPrice.bind(null, id)} />
      </div>
      <SupplierPriceForm
        action={updateSupplierPrice.bind(null, id)}
        initial={price as SupplierPrice}
        suppliers={(suppliers ?? []) as Supplier[]}
        products={(products ?? []) as Product[]}
      />
    </main>
  )
}

export default function EditSupplierPricePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Editor params={params} />
    </Suspense>
  )
}
