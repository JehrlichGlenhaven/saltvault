'use client'

import { useActionState, useMemo, useState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import { fmtDate, fmtMoney } from '@/lib/format'
import type { Delivery, Supplier } from '@/lib/types'

export type BillCandidate = Delivery & {
  subcontractors: { name: string } | null
  sites: { name: string } | null
  products: { name: string } | null
}

export function NewBillForm({
  action,
  suppliers,
  candidates,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  suppliers: Supplier[]
  candidates: BillCandidate[]
}) {
  const [state, formAction] = useActionState(action, initialFormState)
  const [supplierId, setSupplierId] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tons, setTons] = useState<Record<string, string>>({})
  const [costs, setCosts] = useState<Record<string, string>>({})
  const today = new Date().toISOString().slice(0, 10)

  const visible = useMemo(
    () => candidates.filter((d) => d.supplier_id === supplierId),
    [candidates, supplierId]
  )

  const tonsFor = (d: BillCandidate): number => {
    if (d.actual_tons !== null) return Number(d.actual_tons)
    const value = tons[d.id]
    return value !== undefined && value !== '' ? Number(value) : Number(d.est_tons)
  }

  const costFor = (d: BillCandidate): number => {
    const value = costs[d.id]
    return value !== undefined && value !== '' ? Number(value) : Number(d.cost_per_ton)
  }

  const total = visible
    .filter((d) => selected.has(d.id))
    .reduce((sum, d) => sum + tonsFor(d) * costFor(d) + Number(d.misc_fee), 0)

  const toggle = (d: BillCandidate) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(d.id)) {
        next.delete(d.id)
      } else {
        next.add(d.id)
        if (d.actual_tons === null && tons[d.id] === undefined) {
          setTons((prevTons) => ({ ...prevTons, [d.id]: Number(d.est_tons).toFixed(2) }))
        }
        if (costs[d.id] === undefined) {
          setCosts((prevCosts) => ({ ...prevCosts, [d.id]: Number(d.cost_per_ton).toFixed(2) }))
        }
      }
      return next
    })
  }

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Supplier">
          <select
            name="supplier_id"
            required
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value)
              setSelected(new Set())
            }}
            className={inputCls}
          >
            <option value="" disabled>
              Select a supplier…
            </option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Supplier bill / invoice #">
          <input name="bill_number" required className={inputCls} />
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
          Deliveries not yet billed by this supplier
        </div>
        {!supplierId ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-400">Pick a supplier first.</p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-400">
            No unbilled deliveries for this supplier.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-zinc-200">
            <thead>
              <tr className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <th className="px-4 py-2" />
                <th className="px-4 py-2">Ordered</th>
                <th className="px-4 py-2">Sub / Site</th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Actual tons</th>
                <th className="px-4 py-2">Cost $/t</th>
                <th className="px-4 py-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visible.map((d) => {
                const amount = tonsFor(d) * Number(d.cost_per_ton) + Number(d.misc_fee)
                const isChecked = selected.has(d.id)
                return (
                  <tr key={d.id} className="hover:bg-zinc-50">
                    <td className="w-10 px-4 py-2">
                      <input
                        type="checkbox"
                        name="delivery_ids"
                        value={d.id}
                        checked={isChecked}
                        onChange={() => toggle(d)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-700">{fmtDate(d.order_placed_at)}</td>
                    <td className="px-4 py-2 text-sm text-zinc-700">
                      {d.subcontractors?.name ?? '—'} · {d.sites?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-700">{d.products?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-sm text-zinc-700">
                      {d.actual_tons !== null ? (
                        <span>{Number(d.actual_tons).toFixed(2)} t</span>
                      ) : isChecked ? (
                        <input
                          name={`tons_${d.id}`}
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={tons[d.id] ?? ''}
                          onChange={(e) => setTons((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
                        />
                      ) : (
                        <span className="text-zinc-400">est {Number(d.est_tons).toFixed(1)} t</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-700">
                      {d.actual_tons !== null ? (
                        <span>${Number(d.cost_per_ton).toFixed(2)}/t</span>
                      ) : isChecked ? (
                        <input
                          name={`cost_${d.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={costs[d.id] ?? ''}
                          onChange={(e) => setCosts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
                        />
                      ) : (
                        <span className="text-zinc-400">${Number(d.cost_per_ton).toFixed(2)}/t</span>
                      )}
                    </td>
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
          {selected.size} deliver{selected.size === 1 ? 'y' : 'ies'} selected — unreconciled ones
          will be reconciled with the tons above
        </span>
        <span className="text-lg font-semibold text-zinc-900">{fmtMoney(total)}</span>
      </div>

      <FormError error={state.error} />
      <div>
        <SubmitButton>Create supplier bill</SubmitButton>
      </div>
    </form>
  )
}
