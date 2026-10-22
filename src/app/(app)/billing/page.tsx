import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmptyRow, PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import { StatusBadge } from '@/components/status-badge'
import { inputCls } from '@/components/forms'
import { fmtDate, fmtMoney } from '@/lib/format'
import { qtyDisplay } from '@/lib/money'
import { buildDocMaps, daysUntilDue, sideFor, type Side } from '@/lib/doc-balances'
import type { Delivery, Season } from '@/lib/types'

type Row = Delivery & {
  subcontractors: { name: string; company: string | null } | null
  sites: { name: string } | null
  products: { name: string } | null
}

type Filters = { season_id?: string; hide_settled?: string }

function DueChip({ due }: { due: string | null }) {
  if (!due) return <span className="text-xs text-zinc-400">No due date</span>
  const daysUntil = daysUntilDue(due)
  if (daysUntil < 0) {
    return (
      <span className="inline-block w-fit rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        {-daysUntil}d overdue
      </span>
    )
  }
  return (
    <span
      className={`inline-block w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
        daysUntil <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600'
      }`}
    >
      Due {fmtDate(due)}
    </span>
  )
}

function DocCell({
  side,
  hrefBase,
  noneLabel,
  newHref,
  newLabel,
}: {
  side: Side
  hrefBase: string
  noneLabel: string
  newHref: string
  newLabel: string
}) {
  if (side.kind === 'none') {
    return (
      <span className="flex flex-col items-start gap-1">
        <span className="text-xs text-zinc-400">{noneLabel}</span>
        <Link href={newHref} className="text-xs font-medium text-zinc-600 hover:underline">
          {newLabel}
        </Link>
      </span>
    )
  }
  if (side.kind === 'paid') {
    return (
      <span className="flex flex-col gap-1">
        <Link href={`${hrefBase}/${side.docId}`} className="font-medium text-zinc-900 hover:underline">
          #{side.number}
        </Link>
        <span className="inline-block w-fit rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          Paid
        </span>
      </span>
    )
  }
  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <Link href={`${hrefBase}/${side.docId}`} className="font-medium text-zinc-900 hover:underline">
          #{side.number}
        </Link>
        <StatusBadge status={side.status} />
      </span>
      <span className="text-sm font-medium text-zinc-900">{fmtMoney(side.amount)} due</span>
      <DueChip due={side.due} />
    </span>
  )
}

async function Content({ searchParams }: { searchParams: Promise<Filters> }) {
  const filters = await searchParams
  const supabase = await createClient()

  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .order('start_date', { ascending: false, nullsFirst: false })
  const seasonList = (seasons ?? []) as Season[]
  const activeSeason = seasonList.find((s) => s.is_active)
  const seasonId = filters.season_id || activeSeason?.id || undefined

  let deliveriesQuery = supabase
    .from('deliveries')
    .select('*, subcontractors(name, company), sites(name), products(name)')
    .order('order_placed_at', { ascending: false, nullsFirst: false })
    .limit(500)
  if (seasonId) deliveriesQuery = deliveriesQuery.eq('season_id', seasonId)

  const [
    { data: deliveries },
    { data: invoices },
    { data: invoiceItems },
    { data: invoicePayments },
    { data: bills },
    { data: billItems },
    { data: billPayments },
  ] = await Promise.all([
    deliveriesQuery,
    supabase.from('sub_invoices').select('id, invoice_number, due_date, status'),
    supabase.from('sub_invoice_items').select('sub_invoice_id, delivery_id, amount'),
    supabase.from('payments').select('sub_invoice_id, amount').not('sub_invoice_id', 'is', null),
    supabase.from('supplier_bills').select('id, bill_number, due_date, status'),
    supabase.from('supplier_bill_items').select('supplier_bill_id, delivery_id, amount'),
    supabase.from('payments').select('supplier_bill_id, amount').not('supplier_bill_id', 'is', null),
  ])

  const inv = buildDocMaps(
    (invoices ?? []).map((d) => ({ id: d.id, number: d.invoice_number, due_date: d.due_date, status: d.status })),
    (invoiceItems ?? []).map((i) => ({ doc_id: i.sub_invoice_id, delivery_id: i.delivery_id, amount: i.amount })),
    (invoicePayments ?? []).map((p) => ({ doc_id: p.sub_invoice_id as string, amount: p.amount }))
  )
  const bill = buildDocMaps(
    (bills ?? []).map((d) => ({ id: d.id, number: d.bill_number, due_date: d.due_date, status: d.status })),
    (billItems ?? []).map((i) => ({ doc_id: i.supplier_bill_id, delivery_id: i.delivery_id, amount: i.amount })),
    (billPayments ?? []).map((p) => ({ doc_id: p.supplier_bill_id as string, amount: p.amount }))
  )

  let rows = ((deliveries ?? []) as unknown as Row[]).map((d) => ({
    delivery: d,
    subSide: sideFor(d.id, inv.itemByDelivery, inv.docById),
    supplierSide: sideFor(d.id, bill.itemByDelivery, bill.docById),
  }))
  if (filters.hide_settled) {
    rows = rows.filter((r) => !(r.subSide.kind === 'paid' && r.supplierSide.kind === 'paid'))
  }

  const hideSettled = Boolean(filters.hide_settled)

  return (
    <main className="flex flex-col gap-6">
      <PageHeader title="Billing" actionHref="/bills/new" actionLabel="New supplier bill" />

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
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
        <label className="flex items-center gap-2 pb-2 text-sm text-zinc-600">
          <input type="checkbox" name="hide_settled" value="1" defaultChecked={hideSettled} className="h-4 w-4" />
          Hide fully settled
        </label>
        <button type="submit" className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
          Apply
        </button>
      </form>

      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Ordered</th>
              <th className={thCls}>Sub</th>
              <th className={thCls}>Site</th>
              <th className={thCls}>Product</th>
              <th className={thCls}>Qty</th>
              <th className={thCls}>Supplier bill</th>
              <th className={thCls}>Sub invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <EmptyRow colSpan={7}>No deliveries in this view.</EmptyRow>
            ) : (
              rows.map(({ delivery: d, subSide, supplierSide }) => (
                <tr key={d.id} className="odd:bg-white even:bg-zinc-50 hover:bg-zinc-100">
                  <td className={tdCls}>
                    <Link href={`/deliveries/${d.id}`} className="font-medium text-zinc-900 hover:underline">
                      {fmtDate(d.order_placed_at)}
                    </Link>
                  </td>
                  <td className={tdCls}>{d.subcontractors?.company ?? d.subcontractors?.name ?? '—'}</td>
                  <td className={tdCls}>{d.sites?.name ?? '—'}</td>
                  <td className={tdCls}>{d.products?.name ?? '—'}</td>
                  <td className={tdCls}>{qtyDisplay(d)}</td>
                  <td className={tdCls}>
                    <DocCell
                      side={supplierSide}
                      hrefBase="/bills"
                      noneLabel="No bill yet"
                      newHref="/bills/new"
                      newLabel="+ New bill"
                    />
                  </td>
                  <td className={tdCls}>
                    <DocCell
                      side={subSide}
                      hrefBase="/invoices"
                      noneLabel="Not invoiced"
                      newHref="/invoices/new"
                      newLabel="+ New invoice"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}

export default function BillingPage({
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
