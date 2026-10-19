/** Business timezone for all displayed dates/times (data is stored in UTC).
 *  Override with the APP_TIMEZONE env var if the office moves. */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? 'America/New_York'

export function fmtMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function fmtTons(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${Number(value).toFixed(1)} t`
}

/** Date-only fields ('yyyy-mm-dd') pass through untouched; timestamptz
 *  values are shown as a date in the business timezone. */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  if (value.includes('T')) {
    return new Date(value).toLocaleDateString('en-US', {
      timeZone: APP_TIMEZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  return value.slice(0, 10)
}

export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    timeZone: APP_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
