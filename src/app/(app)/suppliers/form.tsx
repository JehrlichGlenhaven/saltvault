'use client'

import { useActionState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import type { Supplier } from '@/lib/types'

export function SupplierForm({
  action,
  initial,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  initial?: Supplier
}) {
  const [state, formAction] = useActionState(action, initialFormState)

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <Field label="Name">
        <input name="name" required defaultValue={initial?.name} className={inputCls} />
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
      <FormError error={state.error} />
      <div>
        <SubmitButton>Save supplier</SubmitButton>
      </div>
    </form>
  )
}
