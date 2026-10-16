'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { str, type FormState } from '@/lib/forms'
import type { DocType } from '@/lib/types'

const BUCKET = 'delivery-documents'
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
const DOC_TYPES: DocType[] = ['sub_invoice', 'supplier_invoice', 'ticket', 'other']

export async function uploadDeliveryDocument(
  deliveryId: string,
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const file = fd.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a file to upload.' }
  if (file.size > MAX_SIZE) return { error: 'File is over 10 MB.' }
  if (!ALLOWED_TYPES.has(file.type)) return { error: 'PDF or image files only (png, jpg, webp).' }

  const docTypeRaw = str(fd, 'doc_type')
  const docType = (DOC_TYPES as string[]).includes(docTypeRaw) ? docTypeRaw : 'other'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const storagePath = `${deliveryId}/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, await file.arrayBuffer(), { contentType: file.type })
  if (uploadError) return { error: uploadError.message }

  const { error: dbError } = await supabase.from('delivery_documents').insert({
    delivery_id: deliveryId,
    doc_type: docType,
    file_name: file.name,
    storage_path: storagePath,
    size_bytes: file.size,
    content_type: file.type,
    uploaded_by: user?.id ?? null,
  })
  if (dbError) {
    await supabase.storage.from(BUCKET).remove([storagePath])
    return { error: dbError.message }
  }

  revalidatePath(`/deliveries/${deliveryId}`)
  redirect(`/deliveries/${deliveryId}`)
}

export async function deleteDeliveryDocument(documentId: string, deliveryId: string): Promise<void> {
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('delivery_documents')
    .select('storage_path')
    .eq('id', documentId)
    .single()
  if (!doc) return

  await supabase.storage.from(BUCKET).remove([doc.storage_path])
  await supabase.from('delivery_documents').delete().eq('id', documentId)

  revalidatePath(`/deliveries/${deliveryId}`)
}
