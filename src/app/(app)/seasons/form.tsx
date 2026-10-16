'use client'

import { useActionState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import type { Season } from '@/lib/types'

export function SeasonForm({
  action,
  initial,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  initial?: Season
}) {
  const [state, formAction] = useActionState(action, initialFormState)

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <Field label="Name" hint="e.g. 2026–2027">
        <input name="name" required defaultValue={initial?.name} className={inputCls} />
      </Field>
      <Field label="Start date">
        <input name="start_date" type="date" defaultValue={initial?.start_date ?? ''} className={inputCls} />
      </Field>
      <Field label="End date">
        <input name="end_date" type="date" defaultValue={initial?.end_date ?? ''} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <input name="is_active" type="checkbox" defaultChecked={initial?.is_active ?? false} className="h-4 w-4" />
        Active season
      </label>
      <FormError error={state.error} />
      <div>
        <SubmitButton>Save season</SubmitButton>
      </div>
    </form>
  )
}
