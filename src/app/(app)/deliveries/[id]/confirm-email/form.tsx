'use client'

import { useActionState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'

export function ConfirmEmailForm({
  action,
  defaultTo,
  defaultSubject,
  defaultBody,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  defaultTo: string
  defaultSubject: string
  defaultBody: string
}) {
  const [state, formAction] = useActionState(action, initialFormState)

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <Field label="To">
        <input name="to" type="email" required defaultValue={defaultTo} className={inputCls} />
      </Field>
      <Field label="Subject">
        <input name="subject" required defaultValue={defaultSubject} className={inputCls} />
      </Field>
      <Field label="Body" hint="Review and edit freely — the sub receives this text in Times New Roman, 12 pt.">
        <textarea name="body" required rows={14} defaultValue={defaultBody} className={`${inputCls} font-mono text-xs`} />
      </Field>
      <FormError error={state.error} />
      <div className="flex gap-3">
        <SubmitButton>Send confirmation email</SubmitButton>
      </div>
    </form>
  )
}
