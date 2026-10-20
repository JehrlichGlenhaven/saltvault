'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isEmailConfigured, plainTextToHtml, sendEmail } from '@/lib/email'
import { str, type FormState } from '@/lib/forms'
import { logDeliveryEvent } from '@/lib/log'
import { createClient } from '@/lib/supabase/server'

export async function sendConfirmationEmail(
  deliveryId: string,
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const to = str(fd, 'to')
  const subject = str(fd, 'subject')
  const body = str(fd, 'body')

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: 'Enter a valid recipient email.' }
  if (!subject) return { error: 'Enter a subject.' }
  if (!body) return { error: 'The email body is empty.' }
  if (!isEmailConfigured()) {
    return { error: 'Email is not configured yet — RESEND_API_KEY and EMAIL_FROM must be set.' }
  }

  const supabase = await createClient()

  const { data: delivery } = await supabase
    .from('deliveries')
    .select('id')
    .eq('id', deliveryId)
    .single()
  if (!delivery) return { error: 'Delivery not found.' }

  const result = await sendEmail({ to, subject, text: body, html: plainTextToHtml(body) })
  if (result.error) return { error: result.error }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error: logError } = await supabase.from('email_logs').insert({
    delivery_id: deliveryId,
    to_email: to,
    subject,
    body,
    provider_message_id: result.id,
    sent_by: user?.id ?? null,
  })
  if (logError) return { error: `Email sent but logging it failed: ${logError.message}` }

  // stamp "sub confirmed" (if not already set by another path)
  const now = new Date().toISOString()
  await supabase
    .from('deliveries')
    .update({ sub_confirmed_at: now, updated_at: now })
    .eq('id', deliveryId)
    .is('sub_confirmed_at', null)

  await logDeliveryEvent(supabase, deliveryId, 'email_sent', {
    toStage: 'sub_confirmed_at',
    note: `Confirmation emailed to ${to}`,
  })

  revalidatePath('/deliveries')
  revalidatePath(`/deliveries/${deliveryId}`)
  redirect(`/deliveries/${deliveryId}`)
}
