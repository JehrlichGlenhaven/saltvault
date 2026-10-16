import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { DeleteButton } from '@/components/delete-button'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import type { Site, Subcontractor } from '@/lib/types'
import { deleteSite, updateSite } from '../actions'
import { SiteForm } from '../form'

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: site }, { data: subs }] = await Promise.all([
    supabase.from('sites').select('*').eq('id', id).single(),
    supabase.from('subcontractors').select('*').eq('active', true).order('name'),
  ])
  if (!site) notFound()

  const typedSite = site as Site

  return (
    <main>
      <div className="flex items-start justify-between">
        <PageHeader title={`Edit site — ${typedSite.name}`} />
        <DeleteButton action={deleteSite.bind(null, id)} />
      </div>
      <SiteForm
        action={updateSite.bind(null, id)}
        initial={typedSite}
        subcontractors={(subs ?? []) as Subcontractor[]}
      />
    </main>
  )
}

export default function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Editor params={params} />
    </Suspense>
  )
}
