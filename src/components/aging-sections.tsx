import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmptyRow, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import { fmtDate, fmtMoney } from '@/lib/format'
import { daysOutstanding } from '@/lib/status'
import type { SubInvoice, SupplierBill } from '@/lib/types'
import { StatusBadge } from '@/app/(app)/invoices/page'

type InvoiceRow = SubInvoice & { subcontractors: { name: string } | null }
type BillRow = SupplierBill & { suppliers: { name: string } | null }

/** Receivables/payables summary cards + both aging tables. Shared by /aging and the dashboard. */
export async function AgingSections({ seasonId }: { seasonId?: string }) {
  const supabase = await createClient()

  let invoicesQuery = supabase
    .from('sub_invoices')
    .select('*, subcontractors(name)')
    .in('status', ['open', 'partial'])
    .order('issue_date')
  let billsQuery = supabase
    .from('supplier_bills')
    .select('*, suppliers(name)')
    .in('status', ['open', 'partial'])
    .order('issue_date')
  if (seasonId) {
    invoicesQuery = invoicesQuery.eq('season_id', seasonId)
    billsQuery = billsQuery.eq('season_id', seasonId)
  }

  const [
    { data: invoices },
    { data: invoiceItems },
    { data: invoicePayments },
    { data: bills },
    { data: billItems },
    { data: billPayments },
  ] = await Promise.all([
    invoicesQuery,
    supabase.from('sub_invoice_items').select('sub_invoice_id, amount'),
    supabase.from('payments').select('sub_invoice_id, amount').not('sub_invoice_id', 'is', null),
    billsQuery,
    supabase.from('supplier_bill_items').select('supplier_bill_id, amount'),
    supabase.from('payments').select('supplier_bill_id, amount').not('supplier_bill_id', 'is', null),
  ])

  const sum = (rows: { amount: number | string }[] | null, key: string, id: string) =>
    (rows ?? [])
      .filter((r) => (r as Record<string, unknown>)[key] === id)
      .reduce((s, r) => s + Number(r.amount), 0)

  const receivables = ((invoices ?? []) as unknown as InvoiceRow[])
    .map((inv) => {
      const total = sum(invoiceItems, 'sub_invoice_id', inv.id)
      const paid = sum(invoicePayments, 'sub_invoice_id', inv.id)
      return { inv, total, paid, balance: total - paid }
    })
    .filter((r) => r.balance > 0.001)

  const payables = ((bills ?? []) as unknown as BillRow[])
    .map((bill) => {
      const total = sum(billItems, 'supplier_bill_id', bill.id)
      const paid = sum(billPayments, 'supplier_bill_id', bill.id)
      return { bill, total, paid, balance: total - paid }
    })
    .filter((r) => r.balance > 0.001)

  const totalReceivable = receivables.reduce((s, r) => s + r.balance, 0)
  const totalPayable = payables.reduce((s, r) => s + r.balance, 0)

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-semibold text-zinc-900">{fmtMoney(totalReceivable)}</div>
          <div className="mt-1 text-sm text-zinc-500">Owed to us by subs</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-semibold text-zinc-900">{fmtMoney(totalPayable)}</div>
          <div className="mt-1 text-sm text-zinc-500">We owe suppliers</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className={`text-2xl font-semibold ${totalReceivable - totalPayable >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {fmtMoney(totalReceivable - totalPayable)}
          </div>
          <div className="mt-1 text-sm text-zinc-500">Net position</div>
        </div>
      </div>

      {/* Receivables */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-zinc-900">Receivables — subs owe us</h3>
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Invoice #</th>
                <th className={thCls}>Sub</th>
                <th className={thCls}>Issued</th>
                <th className={thCls}>Due</th>
                <th className={thCls}>Days</th>
                <th className={thCls}>Total</th>
                <th className={thCls}>Paid</th>
                <th className={thCls}>Balance</th>
                <th className={thCls}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {receivables.length === 0 ? (
                <EmptyRow colSpan={9}>Nothing outstanding — all sub invoices are paid.</EmptyRow>
              ) : (
                receivables.map(({ inv, total, paid, balance }) => (
                  <tr key={inv.id} className="hover:bg-zinc-50">
                    <td className={tdCls}>
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-zinc-900 hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className={tdCls}>{inv.subcontractors?.name ?? '—'}</td>
                    <td className={tdCls}>{fmtDate(inv.issue_date)}</td>
                    <td className={tdCls}>{fmtDate(inv.due_date)}</td>
                    <td className={tdCls}>{daysOutstanding(inv.issue_date)}</td>
                    <td className={tdCls}>{fmtMoney(total)}</td>
                    <td className={tdCls}>{fmtMoney(paid)}</td>
                    <td className={`${tdCls} font-medium text-zinc-900`}>{fmtMoney(balance)}</td>
                    <td className={tdCls}><StatusBadge status={inv.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payables */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-zinc-900">Payables — we owe the supplier</h3>
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Bill #</th>
                <th className={thCls}>Supplier</th>
                <th className={thCls}>Issued</th>
                <th className={thCls}>Due</th>
                <th className={thCls}>Days</th>
                <th className={thCls}>Total</th>
                <th className={thCls}>Paid</th>
                <th className={thCls}>Balance</th>
                <th className={thCls}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payables.length === 0 ? (
                <EmptyRow colSpan={9}>Nothing outstanding — all supplier bills are paid.</EmptyRow>
              ) : (
                payables.map(({ bill, total, paid, balance }) => (
                  <tr key={bill.id} className="hover:bg-zinc-50">
                    <td className={tdCls}>
                      <Link href={`/bills/${bill.id}`} className="font-medium text-zinc-900 hover:underline">
                        {bill.bill_number}
                      </Link>
                    </td>
                    <td className={tdCls}>{bill.suppliers?.name ?? '—'}</td>
                    <td className={tdCls}>{fmtDate(bill.issue_date)}</td>
                    <td className={tdCls}>{fmtDate(bill.due_date)}</td>
                    <td className={tdCls}>{daysOutstanding(bill.issue_date)}</td>
                    <td className={tdCls}>{fmtMoney(total)}</td>
                    <td className={tdCls}>{fmtMoney(paid)}</td>
                    <td className={`${tdCls} font-medium text-zinc-900`}>{fmtMoney(balance)}</td>
                    <td className={tdCls}><StatusBadge status={bill.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

/** Just the three summary cards — used at the top of the dashboard. */
export async function AgingSummary({ seasonId }: { seasonId?: string }) {
  const supabase = await createClient()

  let invoicesQuery = supabase
    .from('sub_invoices')
    .select('id')
    .in('status', ['open', 'partial'])
  let billsQuery = supabase
    .from('supplier_bills')
    .select('id')
    .in('status', ['open', 'partial'])
  if (seasonId) {
    invoicesQuery = invoicesQuery.eq('season_id', seasonId)
    billsQuery = billsQuery.eq('season_id', seasonId)
  }

  const [
    { data: invoices },
    { data: invoiceItems },
    { data: invoicePayments },
    { data: bills },
    { data: billItems },
    { data: billPayments },
  ] = await Promise.all([
    invoicesQuery,
    supabase.from('sub_invoice_items').select('sub_invoice_id, amount'),
    supabase.from('payments').select('sub_invoice_id, amount').not('sub_invoice_id', 'is', null),
    billsQuery,
    supabase.from('supplier_bill_items').select('supplier_bill_id, amount'),
    supabase.from('payments').select('supplier_bill_id, amount').not('supplier_bill_id', 'is', null),
  ])

  const sum = (rows: { amount: number | string }[] | null, key: string, id: string) =>
    (rows ?? [])
      .filter((r) => (r as Record<string, unknown>)[key] === id)
      .reduce((s, r) => s + Number(r.amount), 0)

  const balanceOf = (
    docs: { id: string }[] | null,
    items: { amount: number | string }[] | null,
    payments: { amount: number | string }[] | null,
    itemKey: string,
    paymentKey: string
  ) =>
    (docs ?? []).reduce((total, doc) => {
      const balance = sum(items, itemKey, doc.id) - sum(payments, paymentKey, doc.id)
      return balance > 0.001 ? total + balance : total
    }, 0)

  const totalReceivable = balanceOf(invoices, invoiceItems, invoicePayments, 'sub_invoice_id', 'sub_invoice_id')
  const totalPayable = balanceOf(bills, billItems, billPayments, 'supplier_bill_id', 'supplier_bill_id')

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-2xl font-semibold text-zinc-900">{fmtMoney(totalReceivable)}</div>
        <div className="mt-1 text-sm text-zinc-500">Owed to us by subs</div>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-2xl font-semibold text-zinc-900">{fmtMoney(totalPayable)}</div>
        <div className="mt-1 text-sm text-zinc-500">We owe suppliers</div>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className={`text-2xl font-semibold ${totalReceivable - totalPayable >= 0 ? 'text-green-700' : 'text-red-700'}`}>
          {fmtMoney(totalReceivable - totalPayable)}
        </div>
        <div className="mt-1 text-sm text-zinc-500">Net position</div>
      </div>
    </div>
  )
}
