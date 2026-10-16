import { Suspense } from 'react'
import { AgingSections } from '@/components/aging-sections'
import { inputCls } from '@/components/forms'
import { PageHeader } from '@/components/page'
import { fmtMoney } from '@/lib/format'
import { MILESTONES, milestoneLabel } from '@/lib/milestones'
import { aggregate, fetchOutstanding, fetchReportRows } from '@/lib/report'
import { createClient } from '@/lib/supabase/server'
import type { Season } from '@/lib/types'

function Card({
  value,
  label,
  sub,
  valueClass = 'text-zinc-900',
}: {
  value: string
  label: string
  sub?: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className={`text-2xl font-semibold ${valueClass}`}>{value}</div>
      <div className="mt-1 text-sm text-zinc-500">{label}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-400">{sub}</div> : null}
    </div>
  )
}

async function Content({ searchParams }: { searchParams: Promise<{ season_id?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .order('start_date', { ascending: false, nullsFirst: false })
  const seasonList = (seasons ?? []) as Season[]
  const activeSeason = seasonList.find((s) => s.is_active)
  const seasonId = params.season_id || activeSeason?.id || undefined
  const selectedSeason = seasonList.find((s) => s.id === seasonId)

  const [rows, outstanding] = await Promise.all([
    fetchReportRows(supabase, { season_id: seasonId }),
    fetchOutstanding(supabase, seasonId),
  ])
  const agg = aggregate(rows)

  const deliveredLoads = rows
    .filter((d) => d.delivered_at !== null)
    .reduce((sum, d) => sum + Number(d.loads), 0)

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Dashboard" />
        <form method="get" className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Season
            <select name="season_id" defaultValue={seasonId ?? ''} className={inputCls}>
              <option value="">All seasons</option>
              {seasonList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.is_active ? ' (active)' : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Apply
          </button>
        </form>
      </div>

      {/* Stats */}
      <section>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card
            value={String(agg.loads)}
            label="Loads (triaxles)"
            sub={`${deliveredLoads} delivered`}
          />
          <Card value={agg.tons.toFixed(1)} label="Tons moved" />
          <Card
            value={fmtMoney(agg.revenue)}
            label="Total revenue"
            sub={`Collected ${fmtMoney(outstanding.collected)} · Waiting ${fmtMoney(outstanding.receivable)}`}
          />
          <Card
            value={fmtMoney(agg.cost)}
            label="Total costs"
            sub={`Still owed to supplier ${fmtMoney(outstanding.payable)}`}
          />
          <Card
            value={fmtMoney(agg.margin)}
            label="Margin"
            sub={agg.marginPct !== null ? `${agg.marginPct.toFixed(1)}% of revenue` : undefined}
            valueClass={agg.margin >= 0 ? 'text-green-700' : 'text-red-700'}
          />
          <Card value={String(rows.length)} label="Deliveries" />
        </div>

        {/* Pipeline stage counts */}
        <div className="mt-4 flex flex-wrap gap-2">
          {MILESTONES.map((m) => {
            const count = agg.stageCounts.get(milestoneLabel(m.key)) ?? 0
            return (
              <span
                key={m.key}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200"
              >
                {m.label}: {count}
              </span>
            )
          })}
        </div>
      </section>

      {/* Aging */}
      <AgingSections seasonId={seasonId} />

      <p className="text-xs text-zinc-400">
        Showing {selectedSeason ? `season ${selectedSeason.name}` : 'all seasons'} — change the
        season above or visit Reports for per-sub / per-site / per-delivery breakdowns and CSV
        export.
      </p>
    </main>
  )
}

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ season_id?: string }>
}) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  )
}
