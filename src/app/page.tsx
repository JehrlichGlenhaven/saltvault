import { Suspense } from 'react'
import { logout } from './login/actions'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

async function getDashboardData() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role ?? null
  }

  const count = async (table: string) => {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    return error ? null : (count ?? 0)
  }

  const [seasons, products, subcontractors, deliveries] = await Promise.all([
    count('seasons'),
    count('products'),
    count('subcontractors'),
    count('deliveries'),
  ])

  return { email: user?.email ?? null, role, seasons, products, subcontractors, deliveries }
}

async function Dashboard() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-100 px-4">
        <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-zinc-900">Glenhaven Salt Ops</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Supabase isn&apos;t connected yet. Create a Supabase project, apply the migration
            in <code className="rounded bg-zinc-100 px-1 font-mono text-xs">supabase/migrations/0001_init.sql</code>,
            then copy <code className="rounded bg-zinc-100 px-1 font-mono text-xs">.env.example</code> to{' '}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs">.env.local</code> and fill in your
            project URL and keys. See the README for the full steps.
          </p>
        </div>
      </main>
    )
  }

  let data: Awaited<ReturnType<typeof getDashboardData>> | null = null
  let dbError: string | null = null
  try {
    data = await getDashboardData()
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'Could not reach the database.'
  }

  const stats = data
    ? [
        { label: 'Seasons', value: data.seasons },
        { label: 'Products', value: data.products },
        { label: 'Subcontractors', value: data.subcontractors },
        { label: 'Deliveries', value: data.deliveries },
      ]
    : []

  return (
    <main className="flex flex-1 flex-col bg-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-zinc-900">Glenhaven Salt Ops</h1>
        <div className="flex items-center gap-4 text-sm text-zinc-600">
          {data?.email ? (
            <span>
              {data.email}
              {data.role ? <span className="ml-1 text-zinc-400">({data.role})</span> : null}
            </span>
          ) : null}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <h2 className="text-base font-medium text-zinc-900">Phase 1 dashboard</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Foundation is live: auth, database, and role-based access. Catalog, delivery
          tracking, invoicing, and reports arrive in the next phases.
        </p>

        {dbError ? (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Database not reachable yet — have the migrations been applied? ({dbError})
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="text-2xl font-semibold text-zinc-900">
                  {stat.value === null ? '—' : stat.value}
                </div>
                <div className="mt-1 text-sm text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center bg-zinc-100">
          <p className="text-sm text-zinc-500">Loading…</p>
        </main>
      }
    >
      <Dashboard />
    </Suspense>
  )
}
