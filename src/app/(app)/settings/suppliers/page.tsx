import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmptyRow, PageHeader, tableCls, tableWrapCls, tdCls, thCls, theadCls } from '@/components/page'
import type { Supplier } from '@/lib/types'

async function SupplierRows() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('suppliers').select('*').order('name')

  if (error) {
    return (
      <tr>
        <td colSpan={4} className="px-4 py-6 text-center text-sm text-red-600">
          {error.message}
        </td>
      </tr>
    )
  }

  const suppliers = (data ?? []) as Supplier[]
  if (suppliers.length === 0) {
    return <EmptyRow colSpan={4}>No suppliers yet.</EmptyRow>
  }

  return suppliers.map((supplier) => (
    <tr key={supplier.id} className="hover:bg-zinc-50">
      <td className={tdCls}>
        <Link href={`/settings/suppliers/${supplier.id}`} className="font-medium text-zinc-900 hover:underline">
          {supplier.name}
        </Link>
      </td>
      <td className={tdCls}>{supplier.contact_name ?? '—'}</td>
      <td className={tdCls}>{supplier.phone ?? '—'}</td>
      <td className={tdCls}>{supplier.email ?? '—'}</td>
    </tr>
  ))
}

export default function SuppliersPage() {
  return (
    <main>
      <PageHeader title="Suppliers" actionHref="/settings/suppliers/new" actionLabel="Add supplier" />
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Name</th>
              <th className={thCls}>Contact</th>
              <th className={thCls}>Phone</th>
              <th className={thCls}>Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            <Suspense fallback={<EmptyRow colSpan={4}>Loading…</EmptyRow>}>
              <SupplierRows />
            </Suspense>
          </tbody>
        </table>
      </div>
    </main>
  )
}
