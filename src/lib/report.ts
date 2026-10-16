import type { SupabaseClient } from '@supabase/supabase-js'
import { currentStageLabel } from '@/lib/milestones'
import { deliveryCost, deliveryMargin, deliveryRevenue, deliveryTons, marginPct } from '@/lib/money'
import type { Delivery } from '@/lib/types'

export type ReportFilters = {
  season_id?: string
  from?: string
  to?: string
}

export type ReportRow = Delivery & {
  subcontractors: { name: string } | null
  sites: { name: string } | null
  products: { name: string } | null
}

export async function fetchReportRows(
  supabase: SupabaseClient,
  filters: ReportFilters
): Promise<ReportRow[]> {
  let query = supabase
    .from('deliveries')
    .select('*, subcontractors(name), sites(name), products(name)')
    .order('order_placed_at', { ascending: false, nullsFirst: false })
    .limit(5000)

  if (filters.season_id) query = query.eq('season_id', filters.season_id)
  if (filters.from) query = query.gte('order_placed_at', filters.from)
  if (filters.to) query = query.lte('order_placed_at', `${filters.to}T23:59:59`)

  const { data } = await query
  return (data ?? []) as unknown as ReportRow[]
}

export type SubAggregate = {
  id: string
  name: string
  loads: number
  tons: number
  revenue: number
  cost: number
  margin: number
}

export type SiteAggregate = {
  id: string
  name: string
  subName: string
  loads: number
  tons: number
  revenue: number
  cost: number
  margin: number
}

export type ReportAggregates = {
  loads: number
  tons: number
  revenue: number
  cost: number
  margin: number
  marginPct: number | null
  stageCounts: Map<string, number>
  bySub: SubAggregate[]
  bySite: SiteAggregate[]
}

export function aggregate(rows: ReportRow[]): ReportAggregates {
  const totals = { loads: 0, tons: 0, revenue: 0, cost: 0, margin: 0 }
  const stageCounts = new Map<string, number>()
  const subs = new Map<string, SubAggregate>()
  const sites = new Map<string, SiteAggregate>()

  for (const row of rows) {
    const tons = deliveryTons(row)
    const revenue = deliveryRevenue(row)
    const cost = deliveryCost(row)
    const margin = deliveryMargin(row)
    const loads = Number(row.loads)

    totals.loads += loads
    totals.tons += tons
    totals.revenue += revenue
    totals.cost += cost
    totals.margin += margin

    const stage = currentStageLabel(row)
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1)

    const subName = row.subcontractors?.name ?? '—'
    const sub = subs.get(row.subcontractor_id) ?? {
      id: row.subcontractor_id,
      name: subName,
      loads: 0,
      tons: 0,
      revenue: 0,
      cost: 0,
      margin: 0,
    }
    sub.loads += loads
    sub.tons += tons
    sub.revenue += revenue
    sub.cost += cost
    sub.margin += margin
    subs.set(row.subcontractor_id, sub)

    const site = sites.get(row.site_id) ?? {
      id: row.site_id,
      name: row.sites?.name ?? '—',
      subName,
      loads: 0,
      tons: 0,
      revenue: 0,
      cost: 0,
      margin: 0,
    }
    site.loads += loads
    site.tons += tons
    site.revenue += revenue
    site.cost += cost
    site.margin += margin
    sites.set(row.site_id, site)
  }

  return {
    ...totals,
    marginPct: totals.revenue === 0 ? null : (totals.margin / totals.revenue) * 100,
    stageCounts,
    bySub: [...subs.values()].sort((a, b) => b.margin - a.margin),
    bySite: [...sites.values()].sort((a, b) => b.margin - a.margin),
  }
}

export type Outstanding = {
  receivable: number
  payable: number
  /** open invoice balance per subcontractor id */
  receivableBySub: Map<string, number>
}

export async function fetchOutstanding(
  supabase: SupabaseClient,
  seasonId?: string
): Promise<Outstanding> {
  let invoicesQuery = supabase
    .from('sub_invoices')
    .select('id, subcontractor_id')
    .in('status', ['open', 'partial'])
  let billsQuery = supabase
    .from('supplier_bills')
    .select('id')
    .in('status', ['open', 'partial'])
  if (seasonId) {
    invoicesQuery = invoicesQuery.eq('season_id', seasonId)
    billsQuery = billsQuery.eq('season_id', seasonId)
  }

  const [{ data: invoices }, { data: invoiceItems }, { data: invoicePayments },
    { data: bills }, { data: billItems }, { data: billPayments }] = await Promise.all([
    invoicesQuery,
    supabase.from('sub_invoice_items').select('sub_invoice_id, amount'),
    supabase.from('payments').select('sub_invoice_id, amount').not('sub_invoice_id', 'is', null),
    billsQuery,
    supabase.from('supplier_bill_items').select('supplier_bill_id, amount'),
    supabase.from('payments').select('supplier_bill_id, amount').not('supplier_bill_id', 'is', null),
  ])

  const sumFor = (
    rows: { amount: number | string }[] | null,
    key: string,
    id: string
  ) =>
    (rows ?? [])
      .filter((r) => (r as Record<string, unknown>)[key] === id)
      .reduce((s, r) => s + Number(r.amount), 0)

  const receivableBySub = new Map<string, number>()
  let receivable = 0
  for (const inv of invoices ?? []) {
    const balance = sumFor(invoiceItems, 'sub_invoice_id', inv.id) - sumFor(invoicePayments, 'sub_invoice_id', inv.id)
    if (balance > 0.001) {
      receivable += balance
      receivableBySub.set(
        inv.subcontractor_id,
        (receivableBySub.get(inv.subcontractor_id) ?? 0) + balance
      )
    }
  }

  let payable = 0
  for (const bill of bills ?? []) {
    const balance = sumFor(billItems, 'supplier_bill_id', bill.id) - sumFor(billPayments, 'supplier_bill_id', bill.id)
    if (balance > 0.001) payable += balance
  }

  return { receivable, payable, receivableBySub }
}

export function rowMarginPct(row: ReportRow): number | null {
  return marginPct(row)
}
