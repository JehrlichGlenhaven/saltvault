'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { bool, isUniqueViolation, str, strOrNull, type FormState } from '@/lib/forms'

function parseSeason(fd: FormData) {
  return {
    name: str(fd, 'name'),
    start_date: strOrNull(fd, 'start_date'),
    end_date: strOrNull(fd, 'end_date'),
    is_active: bool(fd, 'is_active'),
  }
}

export async function createSeason(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { error } = await supabase.from('seasons').insert(parseSeason(fd))
  if (error) {
    return { error: isUniqueViolation(error) ? 'A season with that name already exists.' : error.message }
  }
  revalidatePath('/seasons')
  redirect('/seasons')
}

export async function updateSeason(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { error } = await supabase.from('seasons').update(parseSeason(fd)).eq('id', id)
  if (error) {
    return { error: isUniqueViolation(error) ? 'A season with that name already exists.' : error.message }
  }
  revalidatePath('/seasons')
  redirect('/seasons')
}

export async function deleteSeason(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('seasons').delete().eq('id', id)
  revalidatePath('/seasons')
  redirect('/seasons')
}
