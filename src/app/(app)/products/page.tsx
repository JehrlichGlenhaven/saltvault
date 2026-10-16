import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmptyRow, PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import type { Product } from '@/lib/types'

async function ProductRows() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('products').select('*').order('name')

  if (error) {
    return (
      <tr>
        <td colSpan={3} className="px-4 py-6 text-center text-sm text-red-600">
          {error.message}
        </td>
      </tr>
    )
  }

  const products = (data ?? []) as Product[]
  if (products.length === 0) {
    return <EmptyRow colSpan={3}>No products yet.</EmptyRow>
  }

  return products.map((product) => (
    <tr key={product.id} className="hover:bg-zinc-50">
      <td className={tdCls}>
        <Link href={`/products/${product.id}`} className="font-medium text-zinc-900 hover:underline">
          {product.name}
        </Link>
      </td>
      <td className={tdCls}>{product.unit}</td>
      <td className={tdCls}>{product.active ? 'Active' : 'Inactive'}</td>
    </tr>
  ))
}

export default function ProductsPage() {
  return (
    <main>
      <PageHeader title="Products" actionHref="/products/new" actionLabel="Add product" />
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Name</th>
              <th className={thCls}>Unit</th>
              <th className={thCls}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            <Suspense fallback={<EmptyRow colSpan={3}>Loading…</EmptyRow>}>
              <ProductRows />
            </Suspense>
          </tbody>
        </table>
      </div>
    </main>
  )
}
