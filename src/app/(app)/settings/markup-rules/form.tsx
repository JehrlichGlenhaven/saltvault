'use client'

import { useActionState, useState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import type { MarkupRule, Product, Subcontractor } from '@/lib/types'

type Scope = 'global' | 'product' | 'subcontractor'

export function MarkupRuleForm({
  action,
  initial,
  products,
  subcontractors,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  initial?: MarkupRule
  products: Product[]
  subcontractors: Subcontractor[]
}) {
  const [state, formAction] = useActionState(action, initialFormState)
  const [scope, setScope] = useState<Scope>(initial?.scope ?? 'global')

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <Field label="Scope" hint="Most specific rule wins: sub &gt; product &gt; global">
        <select
          name="scope"
          required
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
          className={inputCls}
        >
          <option value="global">Global (default for everyone)</option>
          <option value="product">Per product</option>
          <option value="subcontractor">Per subcontractor</option>
        </select>
      </Field>

      {scope === 'product' ? (
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
      ) : null}

      {scope === 'subcontractor' ? (
        <Field label="Subcontractor">
          <select
            name="subcontractor_id"
            required
            defaultValue={initial?.subcontractor_id ?? ''}
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
      ) : null}

      <Field label="Markup %" hint="e.g. 15 means sell price = cost × 1.15">
        <input
          name="markup_pct"
          type="number"
          step="0.001"
          min="0"
          required
          defaultValue={initial?.markup_pct ?? ''}
          className={inputCls}
        />
      </Field>
      <Field label="Effective from">
        <input name="effective_from" type="date" required defaultValue={initial?.effective_from ?? ''} className={inputCls} />
      </Field>
      <Field label="Effective to" hint="Leave blank while this rule is current">
        <input name="effective_to" type="date" defaultValue={initial?.effective_to ?? ''} className={inputCls} />
      </Field>
      <FormError error={state.error} />
      <div>
        <SubmitButton>Save markup rule</SubmitButton>
      </div>
    </form>
  )
}
