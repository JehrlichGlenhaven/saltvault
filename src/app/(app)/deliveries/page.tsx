import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClickableRow } from '@/components/clickable-row'
import { EmptyRow, PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import { inputCls } from '@/components/forms'
import { fmtDate, fmtMoney } from '@/lib/format'
import { MILESTONES, currentStage, currentStageLabel } from '@/lib/milestones'
import { deliveryMargin, isBagged, isReconciled, qtyDisplay } from '@/lib/money'
import type { Delivery, Season, Site, Subcontractor } from '@/lib/types'

type DeliveryRow = Delivery & {
  subcontractors: { name: string } | null
  sites: { name: string } | null
  products: { name: string } | null
}

type Filters = {
  season_id?: string
  subcontractor_id?: string
  site_id?: string
  stage?: string
  from?: string
  to?: string
}

async function Content({ searchParams }: { searchParams: Promise<Filters> }) {
  const filters = await searchParams
  const supabase = await createClient()

  const [{ data: seasons }, { data: subs }, { data: sites }] = await Promise.all([
    supabase.from('seasons').select('*').order('start_date', { ascending: false, nullsFirst: false }),
    supabase.from('subcontractors').select('*').order('name'),
    supabase.from('sites').select('*').order('name'),
  ])

  let query = supabase
    .from('deliveries')
    .select('*, subcontractors(name), sites(name), products(name)')
    .order('order_placed_at', { ascending: false, nullsFirst: false })
    .limit(200)

  if (filters.season_id) query = query.eq('season_id', filters.season_id)
  if (filters.subcontractor_id) query = query.eq('subcontractor_id', filters.subcontractor_id)
  if (filters.site_id) query = query.eq('site_id', filters.site_id)
  if (filters.from) query = query.gte('order_placed_at', filters.from)
  if (filters.to) query = query.lte('order_placed_at', `${filters.to}T23:59:59`)

  const { data, error } = await query

  let deliveries = (data ?? []) as unknown as DeliveryRow[]
  if (filters.stage) {
    deliveries = deliveries.filter((d) => (currentStage(d) ?? 'draft') === filters.stage)
  }

  return (
    <main>
      <PageHeader title="Deliveries" actionHref="/deliveries/new" actionLabel="New delivery" />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          Season
          <select name="season_id" defaultValue={filters.season_id ?? ''} className={inputCls}>
            <option value="">All</option>
            {((seasons ?? []) as Season[]).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          Subcontractor
          <select name="subcontractor_id" defaultValue={filters.subcontractor_id ?? ''} className={inputCls}>
            <option value="">All</option>
            {((subs ?? []) as Subcontractor[]).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          Site
          <select name="site_id" defaultValue={filters.site_id ?? ''} className={inputCls}>
            <option value="">All</option>
            {((sites ?? []) as Site[]).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          Stage
          <select name="stage" defaultValue={filters.stage ?? ''} className={inputCls}>
            <option value="">All</option>
            {MILESTONES.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          From
          <input name="from" type="date" defaultValue={filters.from ?? ''} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          To
          <input name="to" type="date" defaultValue={filters.to ?? ''} className={inputCls} />
        </label>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Filter
        </button>
        <Link href="/deliveries" className="px-2 py-2 text-sm text-zinc-500 hover:underline">
          Reset
        </Link>
      </form>

      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Ordered</th>
              <th className={thCls}>Sub</th>
              <th className={thCls}>Site</th>
              <th className={thCls}>Product</th>
              <th className={thCls}>Loads</th>
              <th className={thCls}>Qty</th>
              <th className={thCls}>Sell</th>
              <th className={thCls}>Margin</th>
              <th className={thCls}>Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {error ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-sm text-red-600">
                  {error.message}
                </td>
              </tr>
            ) : deliveries.length === 0 ? (
              <EmptyRow colSpan={9}>No deliveries match these filters.</EmptyRow>
            ) : (
              deliveries.map((d) => {
                const reconciled = isReconciled(d)
                return (
                  <ClickableRow key={d.id} href={`/deliveries/${d.id}`}>
                    <td className={tdCls}>
                      <span className="font-medium text-zinc-900">{fmtDate(d.order_placed_at)}</span>
                    </td>
                    <td className={tdCls}>{d.subcontractors?.name ?? '—'}</td>
                    <td className={tdCls}>{d.sites?.name ?? '—'}</td>
                    <td className={tdCls}>{d.products?.name ?? '—'}</td>
                    <td className={tdCls}>{isBagged(d) ? '—' : d.loads}</td>
                    <td className={tdCls}>{qtyDisplay(d)}</td>
                    <td className={tdCls}>
                      {isBagged(d)
                        ? `$${Number(d.sell_unit_price ?? 0).toFixed(2)}/${d.sell_unit}`
                        : `$${Number(d.sell_per_ton).toFixed(2)}/t`}
                    </td>
                    <td className={`${tdCls} ${deliveryMargin(d) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {fmtMoney(deliveryMargin(d))}
                      {reconciled ? '' : ' (est)'}
                    </td>
                    <td className={tdCls}>
                      <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        {currentStageLabel(d)}
                      </span>
                    </td>
                  </ClickableRow>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}

export default function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<Filters>
}) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  )
}
