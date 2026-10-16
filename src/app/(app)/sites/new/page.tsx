import { Suspense } from 'react'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import type { Subcontractor } from '@/lib/types'
import { createSite } from '../actions'
import { SiteForm } from '../form'

async function NewSite() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subcontractors')
    .select('*')
    .eq('active', true)
    .order('name')

  return (
    <main>
      <PageHeader title="Add site" />
      <SiteForm action={createSite} subcontractors={(data ?? []) as Subcontractor[]} />
    </main>
  )
}

export default function NewSitePage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <NewSite />
    </Suspense>
  )
}
