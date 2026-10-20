import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DeleteButton } from '@/components/delete-button'
import { PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import { PaymentForm } from '@/components/payment-form'
import { fmtDate, fmtMoney } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Payment, SubInvoice, SubInvoiceItem } from '@/lib/types'
import { deleteSubInvoice, recordInvoicePayment } from '../actions'
import { StatusBadge } from '@/components/status-badge'

type ItemRow = SubInvoiceItem & {
  deliveries: {
    id: string
    order_placed_at: string | null
    actual_tons: number | null
    sell_per_ton: number
    qty_mode: 'tons' | 'bags'
    actual_sell_qty: number | null
    sell_unit: 'bag' | 'pallet' | null
    sell_unit_price: number | null
    sites: { name: string } | null
    products: { name: string } | null
  } | null
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: invoice }, { data: items }, { data: payments }] = await Promise.all([
    supabase.from('sub_invoices').select('*, subcontractors(name), seasons(name)').eq('id', id).single(),
    supabase
      .from('sub_invoice_items')
      .select('*, deliveries(id, order_placed_at, actual_tons, sell_per_ton, qty_mode, actual_sell_qty, sell_unit, sell_unit_price, sites(name), products(name))')
      .eq('sub_invoice_id', id),
    supabase.from('payments').select('*').eq('sub_invoice_id', id).order('payment_date', { ascending: false }),
  ])
  if (!invoice) notFound()

  const inv = invoice as SubInvoice & {
    subcontractors: { name: string } | null
    seasons: { name: string } | null
  }
  const itemRows = (items ?? []) as unknown as ItemRow[]
  const paymentRows = (payments ?? []) as Payment[]

  const total = itemRows.reduce((sum, i) => sum + Number(i.amount), 0)
  const paid = paymentRows.reduce((sum, p) => sum + Number(p.amount), 0)
  const balance = Math.round((total - paid) * 100) / 100

  return (
    <main className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <PageHeader title={`Invoice ${inv.invoice_number} — ${inv.subcontractors?.name ?? ''}`} />
          <StatusBadge status={inv.status} />
        </div>
        {paymentRows.length === 0 ? (
          <DeleteButton action={deleteSubInvoice.bind(null, inv.id)} label="Delete invoice" />
        ) : null}
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
          <div><dt className="text-zinc-500">Season</dt><dd className="font-medium text-zinc-900">{inv.seasons?.name ?? '—'}</dd></div>
          <div><dt className="text-zinc-500">Issued</dt><dd className="font-medium text-zinc-900">{fmtDate(inv.issue_date)}</dd></div>
          <div><dt className="text-zinc-500">Due</dt><dd className="font-medium text-zinc-900">{fmtDate(inv.due_date)}</dd></div>
          <div><dt className="text-zinc-500">Balance</dt><dd className="font-medium text-zinc-900">{fmtMoney(balance)}</dd></div>
        </dl>
        {inv.notes ? <p className="mt-3 text-sm text-zinc-600">Notes: {inv.notes}</p> : null}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium text-zinc-900">Deliveries on this invoice</h3>
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Ordered</th>
                <th className={thCls}>Site</th>
                <th className={thCls}>Product</th>
                <th className={thCls}>Qty</th>
                <th className={thCls}>Sell</th>
                <th className={thCls}>Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {itemRows.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50">
                  <td className={tdCls}>
                    {item.deliveries ? (
                      <Link href={`/deliveries/${item.deliveries.id}`} className="text-zinc-900 hover:underline">
                        {fmtDate(item.deliveries.order_placed_at)}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className={tdCls}>{item.deliveries?.sites?.name ?? '—'}</td>
                  <td className={tdCls}>{item.deliveries?.products?.name ?? '—'}</td>
                  <td className={tdCls}>
                    {!item.deliveries ? '—' : item.deliveries.qty_mode === 'bags'
                      ? `${item.deliveries.actual_sell_qty ?? '—'} ${item.deliveries.sell_unit}(s)`
                      : `${Number(item.deliveries.actual_tons).toFixed(2)} t`}
                  </td>
                  <td className={tdCls}>
                    {!item.deliveries ? '—' : item.deliveries.qty_mode === 'bags'
                      ? `$${Number(item.deliveries.sell_unit_price ?? 0).toFixed(2)}/${item.deliveries.sell_unit}`
                      : `$${Number(item.deliveries.sell_per_ton).toFixed(2)}/t`}
                  </td>
                  <td className={`${tdCls} font-medium text-zinc-900`}>{fmtMoney(item.amount)}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50">
                <td colSpan={5} className="px-4 py-2 text-right text-sm font-medium text-zinc-500">Total</td>
                <td className="px-4 py-2 text-sm font-semibold text-zinc-900">{fmtMoney(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-medium text-zinc-900">Payments received ({fmtMoney(paid)})</h3>
          {paymentRows.length === 0 ? (
            <p className="text-sm text-zinc-400">No payments recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {paymentRows.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-zinc-700">
                    {fmtMoney(p.amount)}
                    {p.method ? ` · ${p.method}` : ''}
                    {p.reference ? ` · #${p.reference}` : ''}
                  </span>
                  <time className="shrink-0 text-xs text-zinc-400">{fmtDate(p.payment_date)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>

        {balance > 0 && inv.status !== 'void' ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-medium text-zinc-900">Record a payment</h3>
            <PaymentForm
              action={recordInvoicePayment.bind(null, inv.id)}
              balance={balance}
              submitLabel="Record payment"
            />
          </section>
        ) : null}
      </div>
    </main>
  )
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Detail params={params} />
    </Suspense>
  )
}
