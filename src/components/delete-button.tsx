'use client'

import { useState } from 'react'

export function DeleteButton({
  action,
  label = 'Delete',
}: {
  action: () => Promise<unknown>
  label?: string
}) {
  const [pending, setPending] = useState(false)

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (!window.confirm('Delete this record? This cannot be undone.')) return
        setPending(true)
        try {
          await action()
        } finally {
          setPending(false)
        }
      }}
      className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? 'Deleting…' : label}
    </button>
  )
}
