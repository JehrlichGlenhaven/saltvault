import type { DocumentStatus } from '@/lib/types'

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-amber-100 text-amber-800',
    partial: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    void: 'bg-zinc-100 text-zinc-500',
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.open}`}>
      {status}
    </span>
  )
}

export type { DocumentStatus }
