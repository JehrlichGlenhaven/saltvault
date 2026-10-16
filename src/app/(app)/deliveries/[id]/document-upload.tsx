'use client'

import { useActionState, useRef } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'

export function DocumentUpload({
  action,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
}) {
  const [state, formAction] = useActionState(action, initialFormState)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <form
      action={async (fd) => {
        await formAction(fd)
        if (fileRef.current) fileRef.current.value = ''
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Document type">
          <select name="doc_type" defaultValue="sub_invoice" className={inputCls}>
            <option value="sub_invoice">Sub invoice (ours to the sub)</option>
            <option value="supplier_invoice">Supplier invoice (theirs to us)</option>
            <option value="ticket">Delivery ticket / BOL</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="File" hint="PDF or image, up to 10 MB">
          <input
            ref={fileRef}
            name="file"
            type="file"
            required
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
          />
        </Field>
      </div>
      <FormError error={state.error} />
      <div>
        <SubmitButton>Upload document</SubmitButton>
      </div>
    </form>
  )
}
