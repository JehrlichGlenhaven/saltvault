import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { DeleteButton } from '@/components/delete-button'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import type { Supplier } from '@/lib/types'
import { deleteSupplier, updateSupplier } from '../actions'
import { SupplierForm } from '../form'

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('suppliers').select('*').eq('id', id).single()
  if (!data) notFound()

  const supplier = data as Supplier

  return (
    <main>
      <div className="flex items-start justify-between">
        <PageHeader title={`Edit supplier — ${supplier.name}`} />
        <DeleteButton action={deleteSupplier.bind(null, id)} />
      </div>
      <SupplierForm action={updateSupplier.bind(null, id)} initial={supplier} />
    </main>
  )
}

export default function EditSupplierPage({
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
