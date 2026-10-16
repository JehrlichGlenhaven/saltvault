import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmptyRow, PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import { fmtDate, fmtMoney } from '@/lib/format'
import { paymentStatus } from '@/lib/status'
import type { SupplierBill } from '@/lib/types'
import { StatusBadge } from '../invoices/page'

type BillRow = SupplierBill & {
  suppliers: { name: string } | null
  seasons: { name: string } | null
}

async function Content() {
  const supabase = await createClient()
  const [{ data: bills, error }, { data: items }, { data: payments }] = await Promise.all([
    supabase
      .from('supplier_bills')
      .select('*, suppliers(name), seasons(name)')
      .order('issue_date', { ascending: false }),
    supabase.from('supplier_bill_items').select('supplier_bill_id, amount'),
    supabase.from('payments').select('supplier_bill_id, amount').not('supplier_bill_id', 'is', null),
  ])

  const totals = new Map<string, number>()
  for (const item of items ?? []) {
    totals.set(item.supplier_bill_id, (totals.get(item.supplier_bill_id) ?? 0) + Number(item.amount))
  }
  const paidMap = new Map<string, number>()
  for (const p of payments ?? []) {
    if (p.supplier_bill_id) {
      paidMap.set(p.supplier_bill_id, (paidMap.get(p.supplier_bill_id) ?? 0) + Number(p.amount))
    }
  }

  const rows = (bills ?? []) as unknown as BillRow[]

  return (
    <main>
      <PageHeader title="Supplier Bills" actionHref="/bills/new" actionLabel="New supplier bill" />
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Bill #</th>
              <th className={thCls}>Supplier</th>
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
              <EmptyRow colSpan={8}>No supplier bills yet.</EmptyRow>
            ) : (
              rows.map((bill) => {
                const total = totals.get(bill.id) ?? 0
                const paid = paidMap.get(bill.id) ?? 0
                return (
                  <tr key={bill.id} className="hover:bg-zinc-50">
                    <td className={tdCls}>
                      <Link href={`/bills/${bill.id}`} className="font-medium text-zinc-900 hover:underline">
                        {bill.bill_number}
                      </Link>
                    </td>
                    <td className={tdCls}>{bill.suppliers?.name ?? '—'}</td>
                    <td className={tdCls}>{fmtDate(bill.issue_date)}</td>
                    <td className={tdCls}>{fmtDate(bill.due_date)}</td>
                    <td className={tdCls}>{fmtMoney(total)}</td>
                    <td className={tdCls}>{fmtMoney(paid)}</td>
                    <td className={tdCls}>{fmtMoney(total - paid)}</td>
                    <td className={tdCls}>
                      <StatusBadge status={paymentStatus(total, paid)} />
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

export default function BillsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Content />
    </Suspense>
  )
}
