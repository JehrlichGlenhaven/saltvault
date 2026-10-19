import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmptyRow, PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import { inputCls } from '@/components/forms'
import { fmtDate, fmtMoney } from '@/lib/format'
import { MILESTONES, currentStageLabel, milestoneLabel } from '@/lib/milestones'
import { deliveryCost, deliveryMargin, deliveryRevenue, isBagged, qtyDisplay } from '@/lib/money'
import { aggregate, fetchOutstanding, fetchReportRows, type ReportFilters } from '@/lib/report'
import type { Season } from '@/lib/types'

function exportHref(type: string, filters: ReportFilters): string {
  const params = new URLSearchParams({ type })
  if (filters.season_id) params.set('season_id', filters.season_id)
  if (filters.source) params.set('source', filters.source)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  return `/reports/export?${params.toString()}`
}

function CsvLink({ type, filters }: { type: string; filters: ReportFilters }) {
  return (
    <a
      href={exportHref(type, filters)}
      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
    >
      Export CSV
    </a>
  )
}

async function Content({ searchParams }: { searchParams: Promise<ReportFilters> }) {
  const filters = await searchParams
  const supabase = await createClient()

  const [{ data: seasons }, rows, outstanding] = await Promise.all([
    supabase.from('seasons').select('*').order('start_date', { ascending: false, nullsFirst: false }),
    fetchReportRows(supabase, filters),
    fetchOutstanding(supabase, filters.season_id || undefined),
  ])

  const agg = aggregate(rows)
  const activeSeason = ((seasons ?? []) as Season[]).find((s) => s.is_active)
  const marginClass = (v: number) => (v >= 0 ? 'text-green-700' : 'text-red-700')

  return (
    <main className="flex flex-col gap-8">
      <PageHeader title="Reports" />

      {/* Filters */}
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          Season
          <select name="season_id" defaultValue={filters.season_id ?? ''} className={inputCls}>
            <option value="">All seasons</option>
            {((seasons ?? []) as Season[]).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.is_active ? ' (active)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          Source
          <select name="source" defaultValue={filters.source ?? ''} className={inputCls}>
            <option value="">All</option>
            <option value="supplier">Supplier deliveries</option>
            <option value="inventory">From inventory</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          From (order date)
          <input name="from" type="date" defaultValue={filters.from ?? ''} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          To
          <input name="to" type="date" defaultValue={filters.to ?? ''} className={inputCls} />
        </label>
        <button type="submit" className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
          Apply
        </button>
        {!filters.season_id && activeSeason ? (
          <Link href={`/reports?season_id=${activeSeason.id}`} className="px-2 py-2 text-sm text-zinc-500 hover:underline">
            Jump to active season
          </Link>
        ) : (
          <Link href="/reports" className="px-2 py-2 text-sm text-zinc-500 hover:underline">
            Reset
          </Link>
        )}
      </form>

      {/* Season totals */}
      <section>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-semibold text-zinc-900">{agg.loads}</div>
            <div className="mt-1 text-sm text-zinc-500">Loads (triaxles)</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-semibold text-zinc-900">{agg.tons.toFixed(1)}</div>
            <div className="mt-1 text-sm text-zinc-500">Tons moved</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-semibold text-zinc-900">{fmtMoney(agg.revenue)}</div>
            <div className="mt-1 text-sm text-zinc-500">Revenue</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-semibold text-zinc-900">{fmtMoney(agg.cost)}</div>
            <div className="mt-1 text-sm text-zinc-500">Cost</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className={`text-2xl font-semibold ${marginClass(agg.margin)}`}>
              {fmtMoney(agg.margin)}
              {agg.marginPct !== null ? <span className="text-sm font-normal"> ({agg.marginPct.toFixed(1)}%)</span> : null}
            </div>
            <div className="mt-1 text-sm text-zinc-500">Margin</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-semibold text-zinc-900">{fmtMoney(outstanding.receivable)}</div>
            <div className="mt-1 text-sm text-zinc-500">Receivables outstanding</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-semibold text-zinc-900">{fmtMoney(outstanding.payable)}</div>
            <div className="mt-1 text-sm text-zinc-500">Payables outstanding</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-semibold text-zinc-900">{rows.length}</div>
            <div className="mt-1 text-sm text-zinc-500">Deliveries</div>
          </div>
        </div>

        {/* Pipeline stage counts */}
        <div className="mt-4 flex flex-wrap gap-2">
          {MILESTONES.map((m) => {
            const count = agg.stageCounts.get(milestoneLabel(m.key)) ?? 0
            return (
              <span key={m.key} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200">
                {m.label}: {count}
              </span>
            )
          })}
        </div>
      </section>

      {/* Per sub */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-900">Per subcontractor</h3>
          <CsvLink type="subs" filters={filters} />
        </div>
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Sub</th>
                <th className={thCls}>Loads</th>
                <th className={thCls}>Tons</th>
                <th className={thCls}>Revenue</th>
                <th className={thCls}>Cost</th>
                <th className={thCls}>Margin</th>
                <th className={thCls}>Margin %</th>
                <th className={thCls}>Open balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {agg.bySub.length === 0 ? (
                <EmptyRow colSpan={8}>No deliveries in this range.</EmptyRow>
              ) : (
                agg.bySub.map((sub) => (
                  <tr key={sub.id} className="hover:bg-zinc-50">
                    <td className={`${tdCls} font-medium text-zinc-900`}>{sub.name}</td>
                    <td className={tdCls}>{sub.loads}</td>
                    <td className={tdCls}>{sub.tons.toFixed(1)}</td>
                    <td className={tdCls}>{fmtMoney(sub.revenue)}</td>
                    <td className={tdCls}>{fmtMoney(sub.cost)}</td>
                    <td className={`${tdCls} ${marginClass(sub.margin)}`}>{fmtMoney(sub.margin)}</td>
                    <td className={tdCls}>{sub.revenue === 0 ? '—' : `${((sub.margin / sub.revenue) * 100).toFixed(1)}%`}</td>
                    <td className={tdCls}>{fmtMoney(outstanding.receivableBySub.get(sub.id) ?? 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per site */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-900">Per site</h3>
          <CsvLink type="sites" filters={filters} />
        </div>
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Site</th>
                <th className={thCls}>Sub</th>
                <th className={thCls}>Loads</th>
                <th className={thCls}>Tons</th>
                <th className={thCls}>Revenue</th>
                <th className={thCls}>Cost</th>
                <th className={thCls}>Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {agg.bySite.length === 0 ? (
                <EmptyRow colSpan={7}>No deliveries in this range.</EmptyRow>
              ) : (
                agg.bySite.map((site) => (
                  <tr key={site.id} className="hover:bg-zinc-50">
                    <td className={`${tdCls} font-medium text-zinc-900`}>{site.name}</td>
                    <td className={tdCls}>{site.subName}</td>
                    <td className={tdCls}>{site.loads}</td>
                    <td className={tdCls}>{site.tons.toFixed(1)}</td>
                    <td className={tdCls}>{fmtMoney(site.revenue)}</td>
                    <td className={tdCls}>{fmtMoney(site.cost)}</td>
                    <td className={`${tdCls} ${marginClass(site.margin)}`}>{fmtMoney(site.margin)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per delivery */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-900">Per delivery</h3>
          <CsvLink type="deliveries" filters={filters} />
        </div>
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
                <th className={thCls}>Revenue</th>
                <th className={thCls}>Cost</th>
                <th className={thCls}>Margin</th>
                <th className={thCls}>Margin %</th>
                <th className={thCls}>Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.length === 0 ? (
                <EmptyRow colSpan={11}>No deliveries in this range.</EmptyRow>
              ) : (
                rows.map((d) => {
                  const revenue = deliveryRevenue(d)
                  const margin = deliveryMargin(d)
                  return (
                    <tr key={d.id} className="hover:bg-zinc-50">
                      <td className={tdCls}>
                        <Link href={`/deliveries/${d.id}`} className="font-medium text-zinc-900 hover:underline">
                          {fmtDate(d.order_placed_at)}
                        </Link>
                      </td>
                      <td className={tdCls}>{d.subcontractors?.name ?? '—'}</td>
                      <td className={tdCls}>{d.sites?.name ?? '—'}</td>
                      <td className={tdCls}>{d.products?.name ?? '—'}</td>
                      <td className={tdCls}>{isBagged(d) ? '—' : d.loads}</td>
                      <td className={tdCls}>{qtyDisplay(d)}</td>
                      <td className={tdCls}>{fmtMoney(revenue)}</td>
                      <td className={tdCls}>{fmtMoney(deliveryCost(d))}</td>
                      <td className={`${tdCls} ${marginClass(margin)}`}>{fmtMoney(margin)}</td>
                      <td className={tdCls}>{revenue === 0 ? '—' : `${((margin / revenue) * 100).toFixed(1)}%`}</td>
                      <td className={tdCls}>{currentStageLabel(d)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportFilters>
}) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  )
}
