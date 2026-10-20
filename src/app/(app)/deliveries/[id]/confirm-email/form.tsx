'use client'

import { useActionState, useState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { RichTextEditor } from '@/components/rich-text-editor'
import { initialFormState, type FormState } from '@/lib/forms'

export function ConfirmEmailForm({
  action,
  defaultTo,
  defaultSubject,
  defaultBody,
  defaultBodyHtml,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  defaultTo: string
  defaultSubject: string
  defaultBody: string
  defaultBodyHtml: string
}) {
  const [state, formAction] = useActionState(action, initialFormState)
  const [html, setHtml] = useState(defaultBodyHtml)
  const [text, setText] = useState(defaultBody)

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="body_html" value={html} />
      <input type="hidden" name="body" value={text} />

      <Field label="To">
        <input name="to" type="email" required defaultValue={defaultTo} className={inputCls} />
      </Field>
      <Field label="Subject">
        <input name="subject" required defaultValue={defaultSubject} className={inputCls} />
      </Field>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700">Body</span>
        <div className="overflow-hidden rounded-md border border-zinc-300 bg-white">
          <RichTextEditor
            initialHtml={defaultBodyHtml}
            onChange={(h, t) => {
              setHtml(h)
              setText(t)
            }}
          />
        </div>
        <span className="text-xs text-zinc-400">
          Review and edit freely — this is exactly what the sub receives (default font: Times New
          Roman, 12 pt).
        </span>
      </div>

      <FormError error={state.error} />
      <div className="flex gap-3">
        <SubmitButton>Send confirmation email</SubmitButton>
      </div>
    </form>
  )
}
