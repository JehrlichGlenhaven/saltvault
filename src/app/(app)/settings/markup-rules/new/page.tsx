import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page'
import { createClient } from '@/lib/supabase/server'
import { getMyRole } from '@/lib/role'
import type { Product, Subcontractor } from '@/lib/types'
import { createMarkupRule } from '../actions'
import { MarkupRuleForm } from '../form'

async function NewRule() {
  if ((await getMyRole()) !== 'admin') redirect('/settings/markup-rules')

  const supabase = await createClient()
  const [{ data: products }, { data: subs }] = await Promise.all([
    supabase.from('products').select('*').eq('active', true).order('name'),
    supabase.from('subcontractors').select('*').eq('active', true).order('name'),
  ])

  return (
    <main>
      <PageHeader title="Add markup rule" />
      <MarkupRuleForm
        action={createMarkupRule}
        products={(products ?? []) as Product[]}
        subcontractors={(subs ?? []) as Subcontractor[]}
      />
    </main>
  )
}

export default function NewMarkupRulePage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <NewRule />
    </Suspense>
  )
}
