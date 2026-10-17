'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUniqueViolation, str, strOrNull, type FormState } from '@/lib/forms'

function parseSupplier(fd: FormData) {
  return {
    name: str(fd, 'name'),
    contact_name: strOrNull(fd, 'contact_name'),
    phone: strOrNull(fd, 'phone'),
    email: strOrNull(fd, 'email'),
    notes: strOrNull(fd, 'notes'),
  }
}

export async function createSupplier(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { error } = await supabase.from('suppliers').insert(parseSupplier(fd))
  if (error) {
    return { error: isUniqueViolation(error) ? 'A supplier with that name already exists.' : error.message }
  }
  revalidatePath('/settings/suppliers')
  redirect('/settings/suppliers')
}

export async function updateSupplier(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { error } = await supabase.from('suppliers').update(parseSupplier(fd)).eq('id', id)
  if (error) {
    return { error: isUniqueViolation(error) ? 'A supplier with that name already exists.' : error.message }
  }
  revalidatePath('/settings/suppliers')
  redirect('/settings/suppliers')
}

export async function deleteSupplier(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('suppliers').delete().eq('id', id)
  revalidatePath('/settings/suppliers')
  redirect('/settings/suppliers')
}
