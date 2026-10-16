import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmptyRow, PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import type { Subcontractor } from '@/lib/types'

async function SubcontractorRows() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('subcontractors').select('*').order('name')

  if (error) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-6 text-center text-sm text-red-600">
          {error.message}
        </td>
      </tr>
    )
  }

  const subs = (data ?? []) as Subcontractor[]
  if (subs.length === 0) {
    return <EmptyRow colSpan={5}>No subcontractors yet.</EmptyRow>
  }

  return subs.map((sub) => (
    <tr key={sub.id} className="hover:bg-zinc-50">
      <td className={tdCls}>
        <Link href={`/subcontractors/${sub.id}`} className="font-medium text-zinc-900 hover:underline">
          {sub.name}
        </Link>
      </td>
      <td className={tdCls}>{sub.company ?? '—'}</td>
      <td className={tdCls}>{sub.contact_name ?? '—'}</td>
      <td className={tdCls}>{sub.phone ?? '—'}</td>
      <td className={tdCls}>{sub.active ? 'Active' : 'Inactive'}</td>
    </tr>
  ))
}

export default function SubcontractorsPage() {
  return (
    <main>
      <PageHeader title="Subcontractors" actionHref="/subcontractors/new" actionLabel="Add subcontractor" />
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Name</th>
              <th className={thCls}>Company</th>
              <th className={thCls}>Contact</th>
              <th className={thCls}>Phone</th>
              <th className={thCls}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            <Suspense fallback={<EmptyRow colSpan={5}>Loading…</EmptyRow>}>
              <SubcontractorRows />
            </Suspense>
          </tbody>
        </table>
      </div>
    </main>
  )
}
