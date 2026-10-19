import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aggregate, fetchOutstanding, fetchReportRows, type ReportFilters } from '@/lib/report'
import { deliveryCost, deliveryMargin, deliveryRevenue, isBagged, qtyDisplay } from '@/lib/money'
import { currentStageLabel } from '@/lib/milestones'
import { fmtDate } from '@/lib/format'

function csvCell(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n'
}

const money = (v: number) => v.toFixed(2)

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const type = sp.get('type') ?? 'deliveries'
  const filters: ReportFilters = {
    season_id: sp.get('season_id') || undefined,
    from: sp.get('from') || undefined,
    to: sp.get('to') || undefined,
    source: sp.get('source') || undefined,
  }

  const supabase = await createClient()
  const rows = await fetchReportRows(supabase, filters)
  const agg = aggregate(rows)

  let csv: string
  let filename: string

  if (type === 'subs') {
    const outstanding = await fetchOutstanding(supabase, filters.season_id)
    csv = toCsv([
      ['Subcontractor', 'Loads', 'Tons', 'Revenue', 'Cost', 'Margin', 'Margin %', 'Open balance'],
      ...agg.bySub.map((s) => [
        s.name,
        s.loads,
        s.tons.toFixed(2),
        money(s.revenue),
        money(s.cost),
        money(s.margin),
        s.revenue === 0 ? '' : ((s.margin / s.revenue) * 100).toFixed(1),
        money(outstanding.receivableBySub.get(s.id) ?? 0),
      ]),
    ])
    filename = 'subs-report.csv'
  } else if (type === 'sites') {
    csv = toCsv([
      ['Site', 'Subcontractor', 'Loads', 'Tons', 'Revenue', 'Cost', 'Margin'],
      ...agg.bySite.map((s) => [
        s.name,
        s.subName,
        s.loads,
        s.tons.toFixed(2),
        money(s.revenue),
        money(s.cost),
        money(s.margin),
      ]),
    ])
    filename = 'sites-report.csv'
  } else {
    csv = toCsv([
      [
        'Ordered', 'Subcontractor', 'Site', 'Product', 'Source', 'Loads', 'Quantity',
        'Cost per unit', 'Sell per unit', 'Misc fee', 'Revenue', 'Cost', 'Margin',
        'Margin %', 'Stage',
      ],
      ...rows.map((d) => {
        const revenue = deliveryRevenue(d)
        const margin = deliveryMargin(d)
        return [
          fmtDate(d.order_placed_at),
          d.subcontractors?.name ?? '',
          d.sites?.name ?? '',
          d.products?.name ?? '',
          d.source,
          isBagged(d) ? '' : d.loads,
          qtyDisplay(d),
          isBagged(d) ? money(d.actual_buy_unit_cost ?? d.buy_unit_cost ?? 0) : money(d.cost_per_ton),
          isBagged(d) ? money(d.sell_unit_price ?? 0) : money(d.sell_per_ton),
          money(d.misc_fee),
          money(revenue),
          money(deliveryCost(d)),
          money(margin),
          revenue === 0 ? '' : ((margin / revenue) * 100).toFixed(1),
          currentStageLabel(d),
        ]
      }),
    ])
    filename = 'deliveries-report.csv'
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
