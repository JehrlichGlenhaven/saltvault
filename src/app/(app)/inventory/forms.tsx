'use client'

import { useActionState, useState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import type { InventoryLocation, Product } from '@/lib/types'

type Props = {
  locations: InventoryLocation[]
  products: Product[]
}

function LocationSelect({ locations }: { locations: InventoryLocation[] }) {
  return (
    <select name="location_id" required defaultValue="" className={inputCls}>
      <option value="" disabled>
        Select…
      </option>
      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </select>
  )
}

function ProductSelect({ products }: { products: Product[] }) {
  return (
    <select name="product_id" required defaultValue="" className={inputCls}>
      <option value="" disabled>
        Select…
      </option>
      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}

export function ReceiveStockForm({
  action,
  locations,
  products,
}: Props & { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, initialFormState)
  const [unit, setUnit] = useState<'bag' | 'pallet'>('pallet')

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field label="Location">
        <LocationSelect locations={locations} />
      </Field>
      <Field label="Product">
        <ProductSelect products={products} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity">
          <input name="qty" type="number" step="0.5" min="0.5" required className={inputCls} />
        </Field>
        <Field label="Unit">
          <select
            name="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value as 'bag' | 'pallet')}
            className={inputCls}
          >
            <option value="pallet">pallets</option>
            <option value="bag">bags</option>
          </select>
        </Field>
      </div>
      {unit === 'pallet' ? (
        <Field label="Bags per pallet">
          <input name="bags_per_pallet" type="number" step="1" min="1" defaultValue={50} required className={inputCls} />
        </Field>
      ) : null}
      <Field label={`Cost per ${unit} ($)`}>
        <input name="cost_per_unit" type="number" step="0.01" min="0" required className={inputCls} />
      </Field>
      <Field label="Supplier invoice # / reference">
        <input name="reference" className={inputCls} />
      </Field>
      <Field label="Note">
        <input name="note" className={inputCls} />
      </Field>
      <FormError error={state.error} />
      <div>
        <SubmitButton>Receive stock</SubmitButton>
      </div>
    </form>
  )
}

export function AdjustStockForm({
  action,
  locations,
  products,
}: Props & { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, initialFormState)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field label="Location">
        <LocationSelect locations={locations} />
      </Field>
      <Field label="Product">
        <ProductSelect products={products} />
      </Field>
      <Field label="Adjustment (bags)" hint="Negative removes stock, positive adds">
        <input name="qty" type="number" step="1" required placeholder="e.g. -3" className={inputCls} />
      </Field>
      <Field label="Reason" hint="Required — e.g. damaged bags, count correction">
        <input name="note" required className={inputCls} />
      </Field>
      <FormError error={state.error} />
      <div>
        <SubmitButton>Apply adjustment</SubmitButton>
      </div>
    </form>
  )
}

export function LocationForm({
  action,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
}) {
  const [state, formAction] = useActionState(action, initialFormState)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field label="Location name" hint="e.g. Main Yard, Shop">
        <input name="name" required className={inputCls} />
      </Field>
      <Field label="Address">
        <input name="address" className={inputCls} />
      </Field>
      <Field label="Notes">
        <input name="notes" className={inputCls} />
      </Field>
      <FormError error={state.error} />
      <div>
        <SubmitButton>Add location</SubmitButton>
      </div>
    </form>
  )
}
