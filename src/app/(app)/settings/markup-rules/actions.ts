'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { numOrNull, str, strOrNull, type FormState } from '@/lib/forms'
import { hasOverlappingWindow } from '@/lib/overlap'
import { getMyRole } from '@/lib/role'

type Scope = 'global' | 'product' | 'subcontractor'

function parseRule(fd: FormData) {
  const scope = str(fd, 'scope') as Scope
  return {
    scope,
    product_id: scope === 'product' ? str(fd, 'product_id') : null,
    subcontractor_id: scope === 'subcontractor' ? str(fd, 'subcontractor_id') : null,
    markup_pct: numOrNull(fd, 'markup_pct'),
    effective_from: str(fd, 'effective_from'),
    effective_to: strOrNull(fd, 'effective_to'),
  }
}

async function validate(
  parsed: ReturnType<typeof parseRule>,
  excludeId?: string
): Promise<string | null> {
  if ((await getMyRole()) !== 'admin') return 'Only admins can manage markup rules.'
  if (!['global', 'product', 'subcontractor'].includes(parsed.scope)) return 'Pick a scope.'
  if (parsed.scope === 'product' && !parsed.product_id) return 'Pick a product.'
  if (parsed.scope === 'subcontractor' && !parsed.subcontractor_id) return 'Pick a subcontractor.'
  if (parsed.markup_pct === null || parsed.markup_pct < 0) return 'Enter a valid markup %.'
  if (!parsed.effective_from) return 'Enter an effective-from date.'
  if (parsed.effective_to && parsed.effective_to <= parsed.effective_from) {
    return 'Effective-to must be after effective-from.'
  }

  const supabase = await createClient()
  const overlaps = await hasOverlappingWindow(
    supabase,
    'markup_rules',
    {
      scope: parsed.scope,
      product_id: parsed.product_id,
      subcontractor_id: parsed.subcontractor_id,
    },
    parsed.effective_from,
    parsed.effective_to,
    excludeId
  )
  if (overlaps) {
    return 'This overlaps an existing markup rule with the same scope. Close the old window first.'
  }
  return null
}

export async function createMarkupRule(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parseRule(fd)
  const validationError = await validate(parsed)
  if (validationError) return { error: validationError }

  const supabase = await createClient()
  const { error } = await supabase.from('markup_rules').insert({
    scope: parsed.scope,
    product_id: parsed.product_id,
    subcontractor_id: parsed.subcontractor_id,
    markup_pct: parsed.markup_pct,
    effective_from: parsed.effective_from,
    effective_to: parsed.effective_to,
  })
  if (error) return { error: error.message }
  revalidatePath('/settings/markup-rules')
  redirect('/settings/markup-rules')
}

export async function updateMarkupRule(
  id: string,
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const parsed = parseRule(fd)
  const validationError = await validate(parsed, id)
  if (validationError) return { error: validationError }

  const supabase = await createClient()
  const { error } = await supabase
    .from('markup_rules')
    .update({
      scope: parsed.scope,
      product_id: parsed.product_id,
      subcontractor_id: parsed.subcontractor_id,
      markup_pct: parsed.markup_pct,
      effective_from: parsed.effective_from,
      effective_to: parsed.effective_to,
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings/markup-rules')
  redirect('/settings/markup-rules')
}

export async function deleteMarkupRule(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('markup_rules').delete().eq('id', id)
  revalidatePath('/settings/markup-rules')
  redirect('/settings/markup-rules')
}
