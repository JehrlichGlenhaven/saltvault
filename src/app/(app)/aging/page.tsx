import { Suspense } from 'react'
import { PageHeader } from '@/components/page'
import { AgingSections } from '@/components/aging-sections'

export default function AgingPage() {
  return (
    <main className="flex flex-col gap-8">
      <PageHeader title="Aging" />
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <AgingSections />
      </Suspense>
    </main>
  )
}
