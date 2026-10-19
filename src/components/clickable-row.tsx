'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

/** A table row that navigates on click anywhere. */
export function ClickableRow({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter()

  return (
    <tr
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(href)
      }}
      tabIndex={0}
      className="cursor-pointer hover:bg-zinc-50 focus:bg-zinc-100 focus:outline-none"
    >
      {children}
    </tr>
  )
}
