import { Suspense } from 'react'
import { SettingsNav } from './nav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
      <aside className="shrink-0 sm:w-48">
        <Suspense fallback={null}>
          <SettingsNav />
        </Suspense>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
