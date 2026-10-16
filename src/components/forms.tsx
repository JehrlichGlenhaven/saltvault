'use client'

import { useFormStatus } from 'react-dom'
import type { ReactNode } from 'react'

export const inputCls =
  'rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 bg-white'

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      {children}
      {hint ? <span className="text-xs font-normal text-zinc-400">{hint}</span> : null}
    </label>
  )
}

export function FormError({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error}
    </div>
  )
}

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
    >
      {pending ? 'Saving…' : children}
    </button>
  )
}
