'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const settingsLinks = [
  { href: '/settings/seasons', label: 'Seasons' },
  { href: '/settings/suppliers', label: 'Suppliers' },
  { href: '/settings/products', label: 'Products' },
  { href: '/settings/subcontractors', label: 'Subcontractors' },
  { href: '/settings/sites', label: 'Sites' },
  { href: '/settings/supplier-prices', label: 'Supplier Prices' },
  { href: '/settings/markup-rules', label: 'Markup Rules' },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {settingsLinks.map((link) => {
        const active = pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              active
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
