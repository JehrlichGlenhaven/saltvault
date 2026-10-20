import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmptyRow, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import { fmtDate, fmtMoney } from '@/lib/format'
import { qtyDisplay } from '@/lib/money'
import type { Delivery } from '@/lib/types'
import { buildDocMaps, daysUntilDue, sideFor, urgency, type Side } from '@/lib/doc-balances'

type Row = Delivery & {
  subcontractors: { name: string } | null
  sites: { name: string } | null
  products: { name: string } | null
}


function SideCell({
  side,
  hrefBase,
  noneLabel,
}: {
  side: Side
  hrefBase: string
  noneLabel: string
}) {
  if (side.kind === 'paid') {
    return (
      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        Paid
      </span>
    )
  }
  if (side.kind === 'none') {
    return <span className="text-xs text-zinc-400">{noneLabel}</span>
  }

  let dueChip = null
  if (side.due) {
    const daysUntil = daysUntilDue(side.due)
    if (daysUntil < 0) {
      dueChip = (
        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
          {-daysUntil}d overdue
        </span>
      )
    } else {
      dueChip = (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${daysUntil <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600'}`}>
          Due {fmtDate(side.due)}
        </span>
      )
    }
  } else {
    dueChip = <span className="text-xs text-zinc-400">No due date</span>
  }

  return (
    <span className="flex flex-col gap-1">
      <Link href={`${hrefBase}/${side.docId}`} className="font-medium text-zinc-900 hover:underline">
        {fmtMoney(side.amount)}
        <span className="ml-1 text-xs font-normal text-zinc-400">#{side.number}</span>
      </Link>
      {dueChip}
    </span>
  )
}

/** Every delivery with both sides of its money: what the sub still owes us
 *  and what we still owe the supplier, with due dates. */
export async function DueTracker({ seasonId }: { seasonId?: string }) {
  const supabase = await createClient()

  let deliveriesQuery = supabase
    .from('deliveries')
    .select('*, subcontractors(name), sites(name), products(name)')
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

  const rows = ((deliveries ?? []) as unknown as Row[])
    .map((d) => ({
      delivery: d,
      subSide: sideFor(d.id, inv.itemByDelivery, inv.docById),
      supplierSide: sideFor(d.id, bill.itemByDelivery, bill.docById),
    }))
    .sort((a, b) => {
      const ua = Math.min(urgency(a.subSide), urgency(a.supplierSide))
      const ub = Math.min(urgency(b.subSide), urgency(b.supplierSide))
      if (ua !== ub) return ua - ub
      return (b.delivery.order_placed_at ?? '').localeCompare(a.delivery.order_placed_at ?? '')
    })

  const openCount = rows.filter(
    (r) => r.subSide.kind === 'open' || r.supplierSide.kind === 'open'
  ).length

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-zinc-900">Due date tracker — all deliveries</h3>
        <span className="text-xs text-zinc-400">
          {openCount} with money still moving · sorted most urgent first
        </span>
      </div>
      <div className={`${tableWrapCls} max-h-[30rem] overflow-y-auto`}>
        <table className={tableCls}>
          <thead className={`${theadCls} sticky top-0 z-10`}>
            <tr>
              <th className={thCls}>Ordered</th>
              <th className={thCls}>Sub</th>
              <th className={thCls}>Site</th>
              <th className={thCls}>Product</th>
              <th className={thCls}>Qty</th>
              <th className={thCls}>Sub owes us</th>
              <th className={thCls}>We owe supplier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <EmptyRow colSpan={7}>No deliveries yet.</EmptyRow>
            ) : (
              rows.map(({ delivery: d, subSide, supplierSide }) => (
                <tr key={d.id} className="hover:bg-zinc-50">
                  <td className={tdCls}>
                    <Link href={`/deliveries/${d.id}`} className="font-medium text-zinc-900 hover:underline">
                      {fmtDate(d.order_placed_at)}
                    </Link>
                  </td>
                  <td className={tdCls}>{d.subcontractors?.name ?? '—'}</td>
                  <td className={tdCls}>{d.sites?.name ?? '—'}</td>
                  <td className={tdCls}>{d.products?.name ?? '—'}</td>
                  <td className={tdCls}>{qtyDisplay(d)}</td>
                  <td className={tdCls}>
                    <SideCell side={subSide} hrefBase="/invoices" noneLabel="Not invoiced yet" />
                  </td>
                  <td className={tdCls}>
                    <SideCell side={supplierSide} hrefBase="/bills" noneLabel="No bill yet" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
