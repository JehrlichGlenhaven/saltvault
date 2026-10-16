import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { DeleteButton } from '@/components/delete-button'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import { getMyRole } from '@/lib/role'
import type { MarkupRule, Product, Subcontractor } from '@/lib/types'
import { deleteMarkupRule, updateMarkupRule } from '../actions'
import { MarkupRuleForm } from '../form'

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  if ((await getMyRole()) !== 'admin') redirect('/markup-rules')

  const { id } = await params
  const supabase = await createClient()
  const [{ data: rule }, { data: products }, { data: subs }] = await Promise.all([
    supabase.from('markup_rules').select('*').eq('id', id).single(),
    supabase.from('products').select('*').eq('active', true).order('name'),
    supabase.from('subcontractors').select('*').eq('active', true).order('name'),
  ])
  if (!rule) notFound()

  return (
    <main>
      <div className="flex items-start justify-between">
        <PageHeader title="Edit markup rule" />
        <DeleteButton action={deleteMarkupRule.bind(null, id)} />
      </div>
      <MarkupRuleForm
        action={updateMarkupRule.bind(null, id)}
        initial={rule as MarkupRule}
        products={(products ?? []) as Product[]}
        subcontractors={(subs ?? []) as Subcontractor[]}
      />
    </main>
  )
}

export default function EditMarkupRulePage({
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
