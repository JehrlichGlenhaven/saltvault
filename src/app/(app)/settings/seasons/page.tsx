import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmptyRow, PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import type { Season } from '@/lib/types'

async function SeasonRows() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('start_date', { ascending: false, nullsFirst: false })

  if (error) {
    return (
      <tr>
        <td colSpan={4} className="px-4 py-6 text-center text-sm text-red-600">
          {error.message}
        </td>
      </tr>
    )
  }

  const seasons = (data ?? []) as Season[]
  if (seasons.length === 0) {
    return <EmptyRow colSpan={4}>No seasons yet.</EmptyRow>
  }

  return seasons.map((season) => (
    <tr key={season.id} className="hover:bg-zinc-50">
      <td className={tdCls}>
        <Link href={`/settings/seasons/${season.id}`} className="font-medium text-zinc-900 hover:underline">
          {season.name}
        </Link>
      </td>
      <td className={tdCls}>{season.start_date ?? '—'}</td>
      <td className={tdCls}>{season.end_date ?? '—'}</td>
      <td className={tdCls}>{season.is_active ? 'Active' : ''}</td>
    </tr>
  ))
}

export default function SeasonsPage() {
  return (
    <main>
      <PageHeader title="Seasons" actionHref="/settings/seasons/new" actionLabel="Add season" />
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Name</th>
              <th className={thCls}>Start</th>
              <th className={thCls}>End</th>
              <th className={thCls}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            <Suspense fallback={<EmptyRow colSpan={4}>Loading…</EmptyRow>}>
              <SeasonRows />
            </Suspense>
          </tbody>
        </table>
      </div>
    </main>
  )
}
