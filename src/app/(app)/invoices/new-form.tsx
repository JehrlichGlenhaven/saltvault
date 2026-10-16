'use client'

import { useActionState, useMemo, useState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import { fmtDate, fmtMoney } from '@/lib/format'
import type { Delivery, Subcontractor } from '@/lib/types'

export type InvoiceCandidate = Delivery & {
  sites: { name: string } | null
  products: { name: string } | null
}

export function NewInvoiceForm({
  action,
  subcontractors,
  candidates,
  suggestedNumber,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  subcontractors: Subcontractor[]
  candidates: InvoiceCandidate[]
  suggestedNumber: string
}) {
  const [state, formAction] = useActionState(action, initialFormState)
  const [subId, setSubId] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const today = new Date().toISOString().slice(0, 10)

  const visible = useMemo(
    () => candidates.filter((d) => d.subcontractor_id === subId),
    [candidates, subId]
  )

  const total = visible
    .filter((d) => selected.has(d.id))
    .reduce((sum, d) => sum + Number(d.actual_tons) * Number(d.sell_per_ton), 0)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Subcontractor">
          <select
            name="subcontractor_id"
            required
            value={subId}
            onChange={(e) => {
              setSubId(e.target.value)
              setSelected(new Set())
            }}
            className={inputCls}
          >
            <option value="" disabled>
              Select a subcontractor…
            </option>
            {subcontractors.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Invoice number">
          <input name="invoice_number" required defaultValue={suggestedNumber} className={inputCls} />
        </Field>
        <Field label="Issue date">
          <input name="issue_date" type="date" required defaultValue={today} className={inputCls} />
        </Field>
        <Field label="Due date">
          <input name="due_date" type="date" className={inputCls} />
        </Field>
      </div>
      <Field label="Notes">
        <input name="notes" className={inputCls} />
      </Field>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Reconciled deliveries ready to invoice
        </div>
        {!subId ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-400">Pick a subcontractor first.</p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-400">
            No reconciled, unbilled deliveries for this sub.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-zinc-200">
            <tbody className="divide-y divide-zinc-100">
              {visible.map((d) => {
                const amount = Number(d.actual_tons) * Number(d.sell_per_ton)
                return (
                  <tr key={d.id} className="hover:bg-zinc-50">
                    <td className="w-10 px-4 py-2">
                      <input
                        type="checkbox"
                        name="delivery_ids"
                        value={d.id}
                        checked={selected.has(d.id)}
                        onChange={() => toggle(d.id)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-700">{fmtDate(d.order_placed_at)}</td>
                    <td className="px-4 py-2 text-sm text-zinc-700">{d.sites?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-sm text-zinc-700">{d.products?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-sm text-zinc-700">{Number(d.actual_tons).toFixed(2)} t</td>
                    <td className="px-4 py-2 text-sm text-zinc-700">${Number(d.sell_per_ton).toFixed(2)}/t</td>
                    <td className="px-4 py-2 text-sm font-medium text-zinc-900">{fmtMoney(amount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <span className="text-sm text-zinc-500">
          {selected.size} deliver{selected.size === 1 ? 'y' : 'ies'} selected
        </span>
        <span className="text-lg font-semibold text-zinc-900">{fmtMoney(total)}</span>
      </div>

      <FormError error={state.error} />
      <div>
        <SubmitButton>Create invoice</SubmitButton>
      </div>
    </form>
  )
}
