'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { bool, isUniqueViolation, str, strOrNull, type FormState } from '@/lib/forms'

function parseSubcontractor(fd: FormData) {
  return {
    name: str(fd, 'name'),
    company: strOrNull(fd, 'company'),
    contact_name: strOrNull(fd, 'contact_name'),
    phone: strOrNull(fd, 'phone'),
    email: strOrNull(fd, 'email'),
    notes: strOrNull(fd, 'notes'),
    active: bool(fd, 'active'),
  }
}

export async function createSubcontractor(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { error } = await supabase.from('subcontractors').insert(parseSubcontractor(fd))
  if (error) {
    return { error: isUniqueViolation(error) ? 'A subcontractor with that name already exists.' : error.message }
  }
  revalidatePath('/settings/subcontractors')
  redirect('/settings/subcontractors')
}

export async function updateSubcontractor(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { error } = await supabase.from('subcontractors').update(parseSubcontractor(fd)).eq('id', id)
  if (error) {
    return { error: isUniqueViolation(error) ? 'A subcontractor with that name already exists.' : error.message }
  }
  revalidatePath('/settings/subcontractors')
  redirect('/settings/subcontractors')
}

export async function deleteSubcontractor(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('subcontractors').delete().eq('id', id)
  revalidatePath('/settings/subcontractors')
  redirect('/settings/subcontractors')
}
