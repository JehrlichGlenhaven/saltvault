'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/seasons', label: 'Seasons' },
  { href: '/suppliers', label: 'Suppliers' },
  { href: '/products', label: 'Products' },
  { href: '/subcontractors', label: 'Subcontractors' },
  { href: '/sites', label: 'Sites' },
  { href: '/supplier-prices', label: 'Supplier Prices' },
  { href: '/markup-rules', label: 'Markup Rules' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1">
      {links.map((link) => {
        const active =
          link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
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
