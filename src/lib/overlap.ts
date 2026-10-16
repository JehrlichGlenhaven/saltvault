import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns true when `table` already has a row whose [effective_from, effective_to]
 * window overlaps [start, end] (null end = open-ended), matching the given
 * equality filters (null filter value ⇒ IS NULL).
 */
export async function hasOverlappingWindow(
  supabase: SupabaseClient,
  table: string,
  filters: Record<string, string | null>,
  start: string,
  end: string | null,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from(table)
    .select('id')
    .lte('effective_from', end ?? '9999-12-31')
    .or(`effective_to.is.null,effective_to.gte.${start}`)

  for (const [column, value] of Object.entries(filters)) {
    query = value === null ? query.is(column, null) : query.eq(column, value)
  }
  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query.limit(1)
  if (error) return false // fail open; the DB check constraint still guards integrity
  return (data?.length ?? 0) > 0
}
