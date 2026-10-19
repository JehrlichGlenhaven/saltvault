'use client'

import { useActionState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'

export function ReconcileForm({
  action,
  estTons,
  costPerTon,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  estTons: number
  costPerTon: number
}) {
  const [state, formAction] = useActionState(action, initialFormState)

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <Field
        label="Actual tons delivered"
        hint={`Estimated ${estTons.toFixed(1)} t — enter the real tonnage from the supplier invoice`}
      >
        <input
          name="actual_tons"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={estTons.toFixed(2)}
          className={inputCls}
        />
      </Field>
      <Field
        label="Actual cost per ton ($)"
        hint="Prefilled with the quoted cost — adjust if the supplier invoice differs"
      >
        <input
          name="actual_cost_per_ton"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={Number(costPerTon).toFixed(2)}
          className={inputCls}
        />
      </Field>
      <Field label="Supplier ticket / BOL #" hint="Optional — fills it in if it wasn't on the order">
        <input name="supplier_ticket" className={inputCls} />
      </Field>
      <Field label="Note">
        <input name="note" placeholder="Optional" className={inputCls} />
      </Field>
      <FormError error={state.error} />
      <div>
        <SubmitButton>Reconcile delivery</SubmitButton>
      </div>
    </form>
  )
}
