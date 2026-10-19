'use client'

import { useActionState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import { isBagged } from '@/lib/money'
import type { Delivery } from '@/lib/types'

export function ReconcileForm({
  action,
  delivery,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  delivery: Delivery
}) {
  const [state, formAction] = useActionState(action, initialFormState)

  if (isBagged(delivery)) {
    return (
      <form action={formAction} className="flex max-w-md flex-col gap-4">
        <Field
          label={`Actual ${delivery.sell_unit}s delivered to sub`}
          hint={`Ordered ${delivery.sell_qty} ${delivery.sell_unit}(s)`}
        >
          <input
            name="actual_sell_qty"
            type="number"
            step="0.5"
            min="0.5"
            required
            defaultValue={String(delivery.sell_qty ?? '')}
            className={inputCls}
          />
        </Field>
        <Field
          label={`Actual ${delivery.buy_unit}s on supplier invoice`}
          hint={`Ordered ${delivery.buy_qty} ${delivery.buy_unit}(s)`}
        >
          <input
            name="actual_buy_qty"
            type="number"
            step="0.5"
            min="0.5"
            required
            defaultValue={String(delivery.buy_qty ?? '')}
            className={inputCls}
          />
        </Field>
        <Field
          label={`Actual buy cost per ${delivery.buy_unit} ($)`}
          hint="Prefilled with the quoted cost — adjust if the invoice differs"
        >
          <input
            name="actual_buy_unit_cost"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={Number(delivery.buy_unit_cost ?? 0).toFixed(2)}
            className={inputCls}
          />
        </Field>
        <Field
          label={`Markup per ${delivery.sell_unit} ($)`}
          hint="Sell price per unit becomes actual cost + this markup"
        >
          <input
            name="sell_markup_per_unit"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={Number(delivery.sell_markup_per_unit ?? 0).toFixed(2)}
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

  const estTons = delivery.actual_tons ?? delivery.est_tons

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
          defaultValue={Number(delivery.cost_per_ton).toFixed(2)}
          className={inputCls}
        />
      </Field>
      <Field
        label="Markup per ton ($)"
        hint="Sell price to the sub becomes actual cost + this markup"
      >
        <input
          name="markup_per_ton"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={Number(delivery.markup_per_ton).toFixed(2)}
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
