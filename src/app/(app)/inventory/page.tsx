import { Suspense } from 'react'
import Link from 'next/link'
import { EmptyRow, PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import { fmtDateTime, fmtMoney } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { InventoryLocation, InventoryMovement, Product } from '@/lib/types'
import { adjustStock, createLocation, receiveStock } from './actions'
import { AdjustStockForm, LocationForm, ReceiveStockForm } from './forms'

type MovementRow = InventoryMovement & {
  inventory_locations: { name: string } | null
  products: { name: string; unit: string } | null
}

const KIND_STYLES: Record<string, string> = {
  purchase: 'bg-green-100 text-green-800',
  sale: 'bg-blue-100 text-blue-800',
  adjustment: 'bg-amber-100 text-amber-800',
}

async function Content() {
  const supabase = await createClient()

  const [{ data: locations }, { data: products }, { data: movements }] = await Promise.all([
    supabase.from('inventory_locations').select('*').order('name'),
    supabase.from('products').select('*').eq('active', true).order('name'),
    supabase
      .from('inventory_movements')
      .select('*, inventory_locations(name), products(name, unit)')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const locs = (locations ?? []) as InventoryLocation[]
  const prods = (products ?? []) as Product[]
  const rows = (movements ?? []) as unknown as MovementRow[]

  // On hand per location × product, with value at movement costs
  const stock = new Map<
    string,
    { location: string; product: string; unit: string; qty: number; value: number; hasCost: boolean }
  >()
  for (const m of rows) {
    const key = `${m.location_id}:${m.product_id}`
    const entry = stock.get(key) ?? {
      location: m.inventory_locations?.name ?? '—',
      product: m.products?.name ?? '—',
      unit: m.products?.unit === 'ton' ? 'ton' : 'bag',
      qty: 0,
      value: 0,
      hasCost: false,
    }
    entry.qty += Number(m.qty)
    if (m.unit_cost !== null) {
      entry.value += Number(m.qty) * Number(m.unit_cost)
      entry.hasCost = true
    }
    stock.set(key, entry)
  }
  const onHand = [...stock.values()]
    .filter((s) => s.qty > 0.001)
    .sort((a, b) => a.location.localeCompare(b.location) || a.product.localeCompare(b.product))
  const totalValue = onHand.reduce((sum, s) => sum + s.value, 0)

  const activity = rows.slice(0, 50)

  return (
    <main className="flex flex-col gap-8">
      <PageHeader title="Inventory" />

      {/* On hand */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-zinc-900">On hand</h3>
          <span className="text-xs text-zinc-400">Stock value: {fmtMoney(totalValue)}</span>
        </div>
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Location</th>
                <th className={thCls}>Product</th>
                <th className={thCls}>On hand</th>
                <th className={thCls}>≈ Pallets</th>
                <th className={thCls}>Avg cost / unit</th>
                <th className={thCls}>Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {onHand.length === 0 ? (
                <EmptyRow colSpan={6}>Nothing in stock yet — receive your first purchase below.</EmptyRow>
              ) : (
                onHand.map((s) => (
                  <tr key={`${s.location}:${s.product}`} className="hover:bg-zinc-50">
                    <td className={`${tdCls} font-medium text-zinc-900`}>{s.location}</td>
                    <td className={tdCls}>{s.product}</td>
                    <td className={tdCls}>{Number(s.qty.toFixed(2))} {s.unit === 'ton' ? 't' : 'bags'}</td>
                    <td className={tdCls}>{s.unit === 'bag' ? (s.qty / 50).toFixed(2) : '—'}</td>
                    <td className={tdCls}>{s.hasCost && s.qty > 0 ? `$${(s.value / s.qty).toFixed(2)}` : '—'}</td>
                    <td className={tdCls}>{fmtMoney(s.value)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-zinc-400">Bagged quantities in bags (pallet equivalent assumes 50); bulk in tons.</p>
      </section>

      {/* Forms */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-medium text-zinc-900">Receive stock</h3>
          <ReceiveStockForm action={receiveStock} locations={locs} products={prods} />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-medium text-zinc-900">Adjust stock</h3>
          <AdjustStockForm action={adjustStock} locations={locs} products={prods} />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-medium text-zinc-900">Add location</h3>
          <LocationForm action={createLocation} />
        </div>
      </section>

      {/* Activity */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-zinc-900">Activity — purchases, sales to subs, adjustments</h3>
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>When</th>
                <th className={thCls}>Kind</th>
                <th className={thCls}>Location</th>
                <th className={thCls}>Product</th>
                <th className={thCls}>Qty</th>
                <th className={thCls}>Cost / bag</th>
                <th className={thCls}>Reference / note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {activity.length === 0 ? (
                <EmptyRow colSpan={7}>No movements yet.</EmptyRow>
              ) : (
                activity.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50">
                    <td className={tdCls}>{fmtDateTime(m.created_at)}</td>
                    <td className={tdCls}>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLES[m.kind]}`}>
                        {m.kind}
                      </span>
                    </td>
                    <td className={tdCls}>{m.inventory_locations?.name ?? '—'}</td>
                    <td className={tdCls}>{m.products?.name ?? '—'}</td>
                    <td className={`${tdCls} font-medium ${Number(m.qty) > 0 ? 'text-green-700' : 'text-zinc-900'}`}>
                      {Number(m.qty) > 0 ? '+' : ''}
                      {Number(m.qty)} {m.products?.unit === 'ton' ? 't' : 'bags'}
                    </td>
                    <td className={tdCls}>{m.unit_cost !== null ? `$${Number(m.unit_cost).toFixed(2)}` : '—'}</td>
                    <td className={tdCls}>
                      {m.delivery_id ? (
                        <Link href={`/deliveries/${m.delivery_id}`} className="text-zinc-900 hover:underline">
                          View delivery
                        </Link>
                      ) : (
                        [m.reference, m.note].filter(Boolean).join(' — ') || '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Content />
    </Suspense>
  )
}
