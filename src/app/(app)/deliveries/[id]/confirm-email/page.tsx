import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page'
import { isEmailConfigured } from '@/lib/email'
import { buildConfirmationEmail, type ConfirmableDelivery } from '@/lib/email-template'
import { fmtMoney } from '@/lib/format'
import { deliveryRevenue, isBagged } from '@/lib/money'
import { createClient } from '@/lib/supabase/server'
import { sendConfirmationEmail } from './actions'
import { ConfirmEmailForm } from './form'

async function Compose({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: delivery } = await supabase
    .from('deliveries')
    .select('*, subcontractors(name, contact_name, email), sites(name, address), products(name)')
    .eq('id', id)
    .single()
  if (!delivery) notFound()

  const d = delivery as unknown as ConfirmableDelivery
  const { subject, body } = buildConfirmationEmail(d)
  const subEmail = d.subcontractors?.email ?? ''
  const emailReady = isEmailConfigured()

  return (
    <main className="flex flex-col gap-6">
      <PageHeader title="Confirmation email — review before sending" />

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-zinc-600">
          <span className="font-medium text-zinc-900">{d.subcontractors?.name ?? '—'}</span>
          {' · '}
          {d.products?.name ?? '—'} → {d.sites?.name ?? '—'}
          {' · '}
          {isBagged(d)
            ? `${d.sell_qty} ${d.sell_unit}(s)`
            : `${d.est_tons.toFixed(1)} t est.`}
          {' · est. '}
          {fmtMoney(deliveryRevenue(d))}
        </p>
      </section>

      {!subEmail ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This subcontractor has no email on file — enter one manually below, or add it on{' '}
          <Link href={`/settings/subcontractors/${d.subcontractor_id}`} className="font-medium underline">
            the sub&apos;s record
          </Link>{' '}
          for next time.
        </div>
      ) : null}

      {!emailReady ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Email isn&apos;t configured yet — set <code className="font-mono text-xs">RESEND_API_KEY</code> and{' '}
          <code className="font-mono text-xs">EMAIL_FROM</code> in the environment before sending. You can
          still review the template below.
        </div>
      ) : null}

      <ConfirmEmailForm
        action={sendConfirmationEmail.bind(null, d.id)}
        defaultTo={subEmail}
        defaultSubject={subject}
        defaultBody={body}
      />
    </main>
  )
}

export default function ConfirmEmailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Compose params={params} />
    </Suspense>
  )
}
