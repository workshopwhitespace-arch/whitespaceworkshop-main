'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** Tabs inside Finance, styled like the Quotations status tabs. */
const TABS = [
  { href: '/dashboard/finance', label: 'Overview' },
  { href: '/dashboard/finance/accounts', label: 'Accounts' },
  { href: '/dashboard/finance/money-in', label: 'Money In' },
  { href: '/dashboard/finance/money-out', label: 'Money Out' },
  { href: '/dashboard/finance/transfers', label: 'Transfer' },
  { href: '/dashboard/finance/statements', label: 'Statements' },
]

export function FinanceNav() {
  const pathname = usePathname()

  return (
    <nav className="mb-5 flex flex-wrap gap-1 rounded-lg border border-[#E8E5DC] bg-white p-1">
      {TABS.map((tab) => {
        const isActive =
          tab.href === '/dashboard/finance'
            ? pathname === tab.href
            : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              isActive
                ? 'bg-[#26251F] font-medium text-white'
                : 'text-[#6B6858] hover:bg-[#FAF9F6]'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
