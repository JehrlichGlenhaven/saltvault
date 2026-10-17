import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMyRole } from '@/lib/role'
import { EmptyRow, PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import type { SupplierPrice } from '@/lib/types'

type PriceRow = SupplierPrice & {
  suppliers: { name: string } | null
  products: { name: string } | null
}

async function PriceRows({ isAdmin }: { isAdmin: boolean }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('supplier_prices')
    .select('*, suppliers(name), products(name)')
    .order('effective_from', { ascending: false })

  if (error) {
    return (
      <tr>
        <td colSpan={4} className="px-4 py-6 text-center text-sm text-red-600">
          {error.message}
        </td>
      </tr>
    )
  }

  const prices = (data ?? []) as unknown as PriceRow[]
  if (prices.length === 0) {
    return <EmptyRow colSpan={4}>No supplier prices yet.</EmptyRow>
  }

  return prices.map((price) => (
    <tr key={price.id} className="hover:bg-zinc-50">
      <td className={tdCls}>
        {isAdmin ? (
          <Link href={`/settings/supplier-prices/${price.id}`} className="font-medium text-zinc-900 hover:underline">
            {price.products?.name ?? '—'}
          </Link>
        ) : (
          <span className="font-medium text-zinc-900">{price.products?.name ?? '—'}</span>
        )}
      </td>
      <td className={tdCls}>{price.suppliers?.name ?? '—'}</td>
      <td className={tdCls}>${Number(price.price_per_ton).toFixed(2)}/ton</td>
      <td className={tdCls}>
        {price.effective_from} → {price.effective_to ?? 'current'}
      </td>
    </tr>
  ))
}

async function Content() {
  const isAdmin = (await getMyRole()) === 'admin'

  return (
    <main>
      <PageHeader
        title="Supplier Prices"
        actionHref={isAdmin ? '/settings/supplier-prices/new' : undefined}
        actionLabel="Add price"
      />
      {!isAdmin ? (
        <p className="mb-4 text-sm text-zinc-500">Only admins can add or edit prices.</p>
      ) : null}
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Product</th>
              <th className={thCls}>Supplier</th>
              <th className={thCls}>Price</th>
              <th className={thCls}>Window</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            <PriceRows isAdmin={isAdmin} />
          </tbody>
        </table>
      </div>
    </main>
  )
}

export default function SupplierPricesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Content />
    </Suspense>
  )
}
