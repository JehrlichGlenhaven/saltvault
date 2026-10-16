'use client'

import { useActionState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import type { Product } from '@/lib/types'

export function ProductForm({
  action,
  initial,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  initial?: Product
}) {
  const [state, formAction] = useActionState(action, initialFormState)

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <Field label="Name" hint="e.g. Bulk Rock Salt">
        <input name="name" required defaultValue={initial?.name} className={inputCls} />
      </Field>
      <Field label="Unit of measure" hint="e.g. ton, bag, gallon">
        <input name="unit" required defaultValue={initial?.unit ?? 'ton'} className={inputCls} />
      </Field>
      <Field label="Description">
        <textarea name="description" rows={3} defaultValue={initial?.description ?? ''} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <input name="active" type="checkbox" defaultChecked={initial?.active ?? true} className="h-4 w-4" />
        Active
      </label>
      <FormError error={state.error} />
      <div>
        <SubmitButton>Save product</SubmitButton>
      </div>
    </form>
  )
}
