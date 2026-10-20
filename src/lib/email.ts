import { Resend } from 'resend'

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** House style for outgoing email text. */
const BODY_FONT = "font-family:'Times New Roman',serif;font-size:12pt;"

/** Wrap a plain-text body in a minimal HTML envelope (paragraphs from blank
 *  lines, <br> from single newlines) with the house font. Email clients only
 *  honor inline styles, so everything is inline. */
export function plainTextToHtml(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => `<p style="margin:0 0 12px 0;${BODY_FONT}">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
  return `<div style="${BODY_FONT}">${paragraphs}</div>`
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<{ id: string | null; error: string | null }> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    })
    if (error) return { id: null, error: error.message }
    return { id: data?.id ?? null, error: null }
  } catch (err) {
    return { id: null, error: err instanceof Error ? err.message : 'Failed to send email.' }
  }
}
