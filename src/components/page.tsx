import Link from 'next/link'
import type { ReactNode } from 'react'

export function PageHeader({
  title,
  actionHref,
  actionLabel,
}: {
  title: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-base font-medium text-zinc-900">{title}</h2>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

export const tableWrapCls = 'overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm'
export const tableCls = 'min-w-full divide-y divide-zinc-200'
export const theadCls = 'bg-zinc-50'
export const thCls = 'px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500'
export const tdCls = 'px-4 py-2 text-sm text-zinc-700'

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-sm text-zinc-400">
        {children}
      </td>
    </tr>
  )
}
