'use client'

import { useActionState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import type { Subcontractor } from '@/lib/types'

export function SubcontractorForm({
  action,
  initial,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  initial?: Subcontractor
}) {
  const [state, formAction] = useActionState(action, initialFormState)

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <Field label="Name">
        <input name="name" required defaultValue={initial?.name} className={inputCls} />
      </Field>
      <Field label="Company">
        <input name="company" defaultValue={initial?.company ?? ''} className={inputCls} />
      </Field>
      <Field label="Contact name">
        <input name="contact_name" defaultValue={initial?.contact_name ?? ''} className={inputCls} />
      </Field>
      <Field label="Phone">
        <input name="phone" defaultValue={initial?.phone ?? ''} className={inputCls} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" defaultValue={initial?.email ?? ''} className={inputCls} />
      </Field>
      <Field label="Notes">
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ''} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <input name="active" type="checkbox" defaultChecked={initial?.active ?? true} className="h-4 w-4" />
        Active
      </label>
      <FormError error={state.error} />
      <div>
        <SubmitButton>Save subcontractor</SubmitButton>
      </div>
    </form>
  )
}
