export type FormState = { error: string | null }

export const initialFormState: FormState = { error: null }

export function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

export function strOrNull(fd: FormData, key: string): string | null {
  const value = str(fd, key)
  return value === '' ? null : value
}

export function numOrNull(fd: FormData, key: string): number | null {
  const value = str(fd, key)
  if (value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === 'on'
}

/** True when the PostgREST error looks like a uniqueness violation. */
export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505'
}
