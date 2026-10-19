import { Suspense } from 'react'
import { logout } from '@/app/login/actions'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'

async function Header() {
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

  return (
    <header className="border-b border-zinc-200 bg-white px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-zinc-900">Glenhaven Salt Ops</h1>
        <div className="flex items-center gap-4 text-sm text-zinc-600">
          {user?.email ? (
            <span>
              {user.email}
              {role ? <span className="ml-1 text-zinc-400">({role})</span> : null}
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
      </div>
      <div className="mt-3 flex justify-center">
        <Nav />
      </div>
    </header>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      <Suspense
        fallback={
          <header className="border-b border-zinc-200 bg-white px-6 py-3">
            <h1 className="text-lg font-semibold text-zinc-900">Glenhaven Salt Ops</h1>
          </header>
        }
      >
        <Header />
      </Suspense>
      <div className="w-full flex-1 px-6 py-8 sm:px-10">{children}</div>
    </div>
  )
}
