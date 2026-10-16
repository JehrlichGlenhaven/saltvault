import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { DeleteButton } from '@/components/delete-button'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import type { Season } from '@/lib/types'
import { deleteSeason, updateSeason } from '../actions'
import { SeasonForm } from '../form'

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('seasons').select('*').eq('id', id).single()
  if (!data) notFound()

  const season = data as Season

  return (
    <main>
      <div className="flex items-start justify-between">
        <PageHeader title={`Edit season — ${season.name}`} />
        <DeleteButton action={deleteSeason.bind(null, id)} />
      </div>
      <SeasonForm action={updateSeason.bind(null, id)} initial={season} />
    </main>
  )
}

export default function EditSeasonPage({
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
