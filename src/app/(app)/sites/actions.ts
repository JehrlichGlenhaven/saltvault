'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUniqueViolation, str, strOrNull, type FormState } from '@/lib/forms'

function parseSite(fd: FormData) {
  return {
    name: str(fd, 'name'),
    address: strOrNull(fd, 'address'),
    subcontractor_id: str(fd, 'subcontractor_id'),
    notes: strOrNull(fd, 'notes'),
  }
}

export async function createSite(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { error } = await supabase.from('sites').insert(parseSite(fd))
  if (error) {
    return { error: isUniqueViolation(error) ? 'That subcontractor already has a site with that name.' : error.message }
  }
  revalidatePath('/sites')
  redirect('/sites')
}

export async function updateSite(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { error } = await supabase.from('sites').update(parseSite(fd)).eq('id', id)
  if (error) {
    return { error: isUniqueViolation(error) ? 'That subcontractor already has a site with that name.' : error.message }
  }
  revalidatePath('/sites')
  redirect('/sites')
}

export async function deleteSite(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('sites').delete().eq('id', id)
  revalidatePath('/sites')
  redirect('/sites')
}
