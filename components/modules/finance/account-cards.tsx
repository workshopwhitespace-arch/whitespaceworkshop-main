import Link from 'next/link'
import { Banknote, Landmark, PiggyBank, Wallet } from 'lucide-react'
import { inr } from '@/lib/format'
import type { AccountBalance } from '@/lib/finance/balances'

const ICONS: Record<string, typeof Wallet> = {
  CASH: Banknote,
  SAVING: PiggyBank,
  CURRENT: Landmark,
}

/**
 * The three account balances and their total. Every figure comes from the
 * ledger, so the total is always the three added up.
 */
export function AccountCards({
  accounts,
  total,
  linked = true,
}: {
  accounts: AccountBalance[]
  total: number
  /** Overview shows the same cards without links. */
  linked?: boolean
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {accounts.map((account) => {
        const Icon = ICONS[account.type] ?? Wallet
        const card = (
          <div className="h-full rounded-xl border border-[#E8E5DC] bg-white p-4 transition group-hover:border-[#C1502E]/40">
            <div className="mb-3 flex items-center justify-between">
              <Icon className="h-4 w-4 text-[#8A8778]" />
              <span className="text-xs text-[#C9C6B8] tabular-nums">
                {account.transactionCount} entries
              </span>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-[#26251F]">
              {inr(account.balance)}
            </p>
            <p className="mt-0.5 text-xs text-[#8A8778]">{account.name}</p>
          </div>
        )

        return linked ? (
          <Link key={account.id} href={`/dashboard/finance/accounts/${account.id}`} className="group">
            {card}
          </Link>
        ) : (
          <div key={account.id}>{card}</div>
        )
      })}

      <div className="rounded-xl border border-[#26251F] bg-[#26251F] p-4 text-white">
        <div className="mb-3 flex items-center justify-between">
          <Wallet className="h-4 w-4 text-white/70" />
        </div>
        <p className="text-2xl font-semibold tabular-nums">{inr(total)}</p>
        <p className="mt-0.5 text-xs text-white/70">Total balance</p>
      </div>
    </div>
  )
}
