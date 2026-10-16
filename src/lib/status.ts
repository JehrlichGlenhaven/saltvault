import type { DocumentStatus } from '@/lib/types'

/** Status from totals; void is never derived, only set manually. */
export function paymentStatus(total: number, paid: number): DocumentStatus {
  const t = Math.round(total * 100)
  const p = Math.round(paid * 100)
  if (t > 0 && p >= t) return 'paid'
  if (p > 0) return 'partial'
  return 'open'
}

export function daysOutstanding(issueDate: string): number {
  const issued = new Date(`${issueDate}T00:00:00`)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.floor((startOfToday.getTime() - issued.getTime()) / 86_400_000))
}
