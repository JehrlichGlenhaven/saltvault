import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMyRole } from '@/lib/role'
import { EmptyRow, PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import type { MarkupRule } from '@/lib/types'

type RuleRow = MarkupRule & {
  products: { name: string } | null
  subcontractors: { name: string } | null
}

function scopeLabel(rule: RuleRow): string {
  if (rule.scope === 'global') return 'Global'
  if (rule.scope === 'product') return `Product: ${rule.products?.name ?? '—'}`
  return `Sub: ${rule.subcontractors?.name ?? '—'}`
}

async function RuleRows({ isAdmin }: { isAdmin: boolean }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('markup_rules')
    .select('*, products(name), subcontractors(name)')
    .order('effective_from', { ascending: false })

  if (error) {
    return (
      <tr>
        <td colSpan={3} className="px-4 py-6 text-center text-sm text-red-600">
          {error.message}
        </td>
      </tr>
    )
  }

  const rules = (data ?? []) as unknown as RuleRow[]
  if (rules.length === 0) {
    return <EmptyRow colSpan={3}>No markup rules yet.</EmptyRow>
  }

  return rules.map((rule) => (
    <tr key={rule.id} className="hover:bg-zinc-50">
      <td className={tdCls}>
        {isAdmin ? (
          <Link href={`/settings/markup-rules/${rule.id}`} className="font-medium text-zinc-900 hover:underline">
            {scopeLabel(rule)}
          </Link>
        ) : (
          <span className="font-medium text-zinc-900">{scopeLabel(rule)}</span>
        )}
      </td>
      <td className={tdCls}>{Number(rule.markup_pct).toFixed(1)}%</td>
      <td className={tdCls}>
        {rule.effective_from} → {rule.effective_to ?? 'current'}
      </td>
    </tr>
  ))
}

async function Content() {
  const isAdmin = (await getMyRole()) === 'admin'

  return (
    <main>
      <PageHeader
        title="Markup Rules"
        actionHref={isAdmin ? '/settings/markup-rules/new' : undefined}
        actionLabel="Add markup rule"
      />
      {!isAdmin ? (
        <p className="mb-4 text-sm text-zinc-500">Only admins can add or edit markup rules.</p>
      ) : null}
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Scope</th>
              <th className={thCls}>Markup</th>
              <th className={thCls}>Window</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            <RuleRows isAdmin={isAdmin} />
          </tbody>
        </table>
      </div>
    </main>
  )
}

export default function MarkupRulesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Content />
    </Suspense>
  )
}
