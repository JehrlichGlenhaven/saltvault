import { APP_TIMEZONE } from '@/lib/format'
import type { DocumentStatus } from '@/lib/types'

/** Status from totals; void is never derived, only set manually. */
export function paymentStatus(total: number, paid: number): DocumentStatus {
  const t = Math.round(total * 100)
  const p = Math.round(paid * 100)
  if (t > 0 && p >= t) return 'paid'
  if (p > 0) return 'partial'
  return 'open'
}

/** Today's date ('yyyy-mm-dd') in the business timezone. */
export function todayInBusinessTz(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE })
}

export function daysOutstanding(issueDate: string): number {
  const issued = new Date(`${issueDate}T00:00:00Z`).getTime()
  const today = new Date(`${todayInBusinessTz()}T00:00:00Z`).getTime()
  return Math.max(0, Math.floor((today - issued) / 86_400_000))
}
