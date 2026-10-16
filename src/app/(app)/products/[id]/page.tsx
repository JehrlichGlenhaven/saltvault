import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { DeleteButton } from '@/components/delete-button'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import type { Product } from '@/lib/types'
import { deleteProduct, updateProduct } from '../actions'
import { ProductForm } from '../form'

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('products').select('*').eq('id', id).single()
  if (!data) notFound()

  const product = data as Product

  return (
    <main>
      <div className="flex items-start justify-between">
        <PageHeader title={`Edit product — ${product.name}`} />
        <DeleteButton action={deleteProduct.bind(null, id)} />
      </div>
      <ProductForm action={updateProduct.bind(null, id)} initial={product} />
    </main>
  )
}

export default function EditProductPage({
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
