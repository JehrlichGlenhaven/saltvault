'use client'

import { useActionState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import type { Product, Supplier, SupplierPrice } from '@/lib/types'

export function SupplierPriceForm({
  action,
  initial,
  suppliers,
  products,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  initial?: SupplierPrice
  suppliers: Supplier[]
  products: Product[]
}) {
  const [state, formAction] = useActionState(action, initialFormState)

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <Field label="Supplier">
        <select name="supplier_id" required defaultValue={initial?.supplier_id ?? ''} className={inputCls}>
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
      <Field label="Product">
        <select name="product_id" required defaultValue={initial?.product_id ?? ''} className={inputCls}>
          <option value="" disabled>
            Select a product…
          </option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Price per ton ($)" hint="Delivery fees are baked into this per-ton price">
        <input
          name="price_per_ton"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={initial?.price_per_ton ?? ''}
          className={inputCls}
        />
      </Field>
      <Field label="Effective from">
        <input name="effective_from" type="date" required defaultValue={initial?.effective_from ?? ''} className={inputCls} />
      </Field>
      <Field label="Effective to" hint="Leave blank while this price is current">
        <input name="effective_to" type="date" defaultValue={initial?.effective_to ?? ''} className={inputCls} />
      </Field>
      <FormError error={state.error} />
      <div>
        <SubmitButton>Save price</SubmitButton>
      </div>
    </form>
  )
}
