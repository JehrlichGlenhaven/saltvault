import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmptyRow, PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import { fmtDate, fmtMoney } from '@/lib/format'
import { paymentStatus } from '@/lib/status'
import type { SubInvoice } from '@/lib/types'

type InvoiceRow = SubInvoice & {
  subcontractors: { name: string } | null
  seasons: { name: string } | null
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-amber-100 text-amber-800',
    partial: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    void: 'bg-zinc-100 text-zinc-500',
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.open}`}>
      {status}
    </span>
  )
}

async function Content() {
  const supabase = await createClient()
  const [{ data: invoices, error }, { data: items }, { data: payments }] = await Promise.all([
    supabase
      .from('sub_invoices')
      .select('*, subcontractors(name), seasons(name)')
      .order('issue_date', { ascending: false }),
    supabase.from('sub_invoice_items').select('sub_invoice_id, amount'),
    supabase.from('payments').select('sub_invoice_id, amount').not('sub_invoice_id', 'is', null),
  ])

  const totals = new Map<string, number>()
  for (const item of items ?? []) {
    totals.set(item.sub_invoice_id, (totals.get(item.sub_invoice_id) ?? 0) + Number(item.amount))
  }
  const paidMap = new Map<string, number>()
  for (const p of payments ?? []) {
    if (p.sub_invoice_id) {
      paidMap.set(p.sub_invoice_id, (paidMap.get(p.sub_invoice_id) ?? 0) + Number(p.amount))
    }
  }

  const rows = (invoices ?? []) as unknown as InvoiceRow[]

  return (
    <main>
      <PageHeader title="Sub Invoices" actionHref="/invoices/new" actionLabel="New invoice" />
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Invoice #</th>
              <th className={thCls}>Sub</th>
              <th className={thCls}>Issued</th>
              <th className={thCls}>Due</th>
              <th className={thCls}>Total</th>
              <th className={thCls}>Paid</th>
              <th className={thCls}>Balance</th>
              <th className={thCls}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {error ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-red-600">
                  {error.message}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={8}>No invoices yet.</EmptyRow>
            ) : (
              rows.map((inv) => {
                const total = totals.get(inv.id) ?? 0
                const paid = paidMap.get(inv.id) ?? 0
                return (
                  <tr key={inv.id} className="hover:bg-zinc-50">
                    <td className={tdCls}>
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-zinc-900 hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className={tdCls}>{inv.subcontractors?.name ?? '—'}</td>
                    <td className={tdCls}>{fmtDate(inv.issue_date)}</td>
                    <td className={tdCls}>{fmtDate(inv.due_date)}</td>
                    <td className={tdCls}>{fmtMoney(total)}</td>
                    <td className={tdCls}>{fmtMoney(paid)}</td>
                    <td className={tdCls}>{fmtMoney(total - paid)}</td>
                    <td className={tdCls}>
                      <StatusBadge status={paymentStatus(total, paid) === inv.status ? inv.status : paymentStatus(total, paid)} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Content />
    </Suspense>
  )
}
