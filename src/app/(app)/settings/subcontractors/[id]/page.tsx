import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { DeleteButton } from '@/components/delete-button'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import type { Subcontractor } from '@/lib/types'
import { deleteSubcontractor, updateSubcontractor } from '../actions'
import { SubcontractorForm } from '../form'

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('subcontractors').select('*').eq('id', id).single()
  if (!data) notFound()

  const sub = data as Subcontractor

  return (
    <main>
      <div className="flex items-start justify-between">
        <PageHeader title={`Edit subcontractor — ${sub.name}`} />
        <DeleteButton action={deleteSubcontractor.bind(null, id)} />
      </div>
      <SubcontractorForm action={updateSubcontractor.bind(null, id)} initial={sub} />
    </main>
  )
}

export default function EditSubcontractorPage({
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
