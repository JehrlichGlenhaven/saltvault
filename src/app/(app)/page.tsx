import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

async function getCounts() {
  const supabase = await createClient()
  const count = async (table: string) => {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    return error ? null : (count ?? 0)
  }

  const [seasons, products, subcontractors, sites, deliveries] = await Promise.all([
    count('seasons'),
    count('products'),
    count('subcontractors'),
    count('sites'),
    count('deliveries'),
  ])

  return { seasons, products, subcontractors, sites, deliveries }
}

async function Stats() {
  let data: Awaited<ReturnType<typeof getCounts>> | null = null
  let dbError: string | null = null
  try {
    data = await getCounts()
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'Could not reach the database.'
  }

  if (dbError) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Database not reachable — have the migrations been applied? ({dbError})
      </div>
    )
  }

  const stats = [
    { label: 'Seasons', value: data?.seasons },
    { label: 'Products', value: data?.products },
    { label: 'Subcontractors', value: data?.subcontractors },
    { label: 'Sites', value: data?.sites },
    { label: 'Deliveries', value: data?.deliveries },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <div className="text-2xl font-semibold text-zinc-900">
            {stat.value === null || stat.value === undefined ? '—' : stat.value}
          </div>
          <div className="mt-1 text-sm text-zinc-500">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  return (
    <main>
      <h2 className="text-base font-medium text-zinc-900">Dashboard</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Catalog is managed from the tabs above. Delivery tracking, invoicing, and
        margin reports arrive in the next phases.
      </p>
      <div className="mt-6">
        <Suspense
          fallback={<p className="text-sm text-zinc-500">Loading stats…</p>}
        >
          <Stats />
        </Suspense>
      </div>
    </main>
  )
}
