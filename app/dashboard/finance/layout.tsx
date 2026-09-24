import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { auth } from '@/lib/auth'
import { FinanceNav } from '@/components/modules/finance/finance-nav'

/**
 * The Finance module shell: its own tab bar, in the app's existing style.
 * Super Admin only — proxy.ts blocks the routes, and this guards the data.
 */
export default async function FinanceLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'SUPER_ADMIN') redirect('/dashboard')

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#26251F]">Finance</h1>
        <p className="mt-0.5 text-sm text-[#8A8778]">
          Accounts, money in and out, transfers and statements.
        </p>
      </div>

      <FinanceNav />

      {children}
    </div>
  )
}
