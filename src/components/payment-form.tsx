'use client'

import { useActionState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import { fmtMoney } from '@/lib/format'

export function PaymentForm({
  action,
  balance,
  submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  balance: number
  submitLabel: string
}) {
  const [state, formAction] = useActionState(action, initialFormState)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount ($)" hint={`Balance: ${fmtMoney(balance)}`}>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            max={balance.toFixed(2)}
            required
            defaultValue={balance.toFixed(2)}
            className={inputCls}
          />
        </Field>
        <Field label="Payment date">
          <input name="payment_date" type="date" required defaultValue={today} className={inputCls} />
        </Field>
        <Field label="Method">
          <select name="method" defaultValue="check" className={inputCls}>
            <option value="check">Check</option>
            <option value="ach">ACH</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Reference / check #">
          <input name="reference" className={inputCls} />
        </Field>
      </div>
      <Field label="Notes">
        <input name="notes" className={inputCls} />
      </Field>
      <FormError error={state.error} />
      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}
