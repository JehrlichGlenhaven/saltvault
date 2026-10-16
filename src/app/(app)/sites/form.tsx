'use client'

import { useActionState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import type { Site, Subcontractor } from '@/lib/types'

export function SiteForm({
  action,
  initial,
  subcontractors,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  initial?: Site
  subcontractors: Subcontractor[]
}) {
  const [state, formAction] = useActionState(action, initialFormState)

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <Field label="Site name" hint="e.g. Riverside Plaza">
        <input name="name" required defaultValue={initial?.name} className={inputCls} />
      </Field>
      <Field label="Subcontractor" hint="The sub who services this site">
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
              {sub.company ? ` (${sub.company})` : ''}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Address">
        <input name="address" defaultValue={initial?.address ?? ''} className={inputCls} />
      </Field>
      <Field label="Notes">
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ''} className={inputCls} />
      </Field>
      <FormError error={state.error} />
      <div>
        <SubmitButton>Save site</SubmitButton>
      </div>
    </form>
  )
}
