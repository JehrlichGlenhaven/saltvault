'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { bool, isUniqueViolation, str, strOrNull, type FormState } from '@/lib/forms'

function parseProduct(fd: FormData) {
  return {
    name: str(fd, 'name'),
    unit: str(fd, 'unit') || 'ton',
    description: strOrNull(fd, 'description'),
    active: bool(fd, 'active'),
  }
}

export async function createProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { error } = await supabase.from('products').insert(parseProduct(fd))
  if (error) {
    return { error: isUniqueViolation(error) ? 'A product with that name already exists.' : error.message }
  }
  revalidatePath('/settings/products')
  redirect('/settings/products')
}

export async function updateProduct(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { error } = await supabase.from('products').update(parseProduct(fd)).eq('id', id)
  if (error) {
    return { error: isUniqueViolation(error) ? 'A product with that name already exists.' : error.message }
  }
  revalidatePath('/settings/products')
  redirect('/settings/products')
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('products').delete().eq('id', id)
  revalidatePath('/settings/products')
  redirect('/settings/products')
}
