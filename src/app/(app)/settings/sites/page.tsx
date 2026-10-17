import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmptyRow, PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import type { Site } from '@/lib/types'

type SiteRow = Site & { subcontractors: { name: string } | null }

async function SiteRows() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sites')
    .select('*, subcontractors(name)')
    .order('name')

  if (error) {
    return (
      <tr>
        <td colSpan={3} className="px-4 py-6 text-center text-sm text-red-600">
          {error.message}
        </td>
      </tr>
    )
  }

  const sites = (data ?? []) as unknown as SiteRow[]
  if (sites.length === 0) {
    return <EmptyRow colSpan={3}>No sites yet.</EmptyRow>
  }

  return sites.map((site) => (
    <tr key={site.id} className="hover:bg-zinc-50">
      <td className={tdCls}>
        <Link href={`/settings/sites/${site.id}`} className="font-medium text-zinc-900 hover:underline">
          {site.name}
        </Link>
      </td>
      <td className={tdCls}>{site.subcontractors?.name ?? '—'}</td>
      <td className={tdCls}>{site.address ?? '—'}</td>
    </tr>
  ))
}

export default function SitesPage() {
  return (
    <main>
      <PageHeader title="Sites" actionHref="/settings/sites/new" actionLabel="Add site" />
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Name</th>
              <th className={thCls}>Subcontractor</th>
              <th className={thCls}>Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            <Suspense fallback={<EmptyRow colSpan={3}>Loading…</EmptyRow>}>
              <SiteRows />
            </Suspense>
          </tbody>
        </table>
      </div>
    </main>
  )
}
