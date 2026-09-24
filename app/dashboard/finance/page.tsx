import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getFinanceOverview } from '@/lib/actions/finance'
import { AccountCards } from '@/components/modules/finance/account-cards'
import { TransactionTable } from '@/components/modules/finance/transaction-table'
import { inr } from '@/lib/format'

const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })

export default async function FinanceOverviewPage() {
  const { accounts, total, month, recent, topExpenses } = await getFinanceOverview()
  const thisMonth = MONTH.format(new Date())

  return (
    <div className="space-y-5">
      <AccountCards accounts={accounts} total={total} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label={`Money in · ${thisMonth}`} value={inr(month.income)} tone="text-[#3F7A50]" />
        <Tile label={`Money out · ${thisMonth}`} value={inr(month.expense)} tone="text-[#C1443B]" />
        <Tile
          label={month.net >= 0 ? 'Net profit this month' : 'Net loss this month'}
          value={inr(Math.abs(month.net))}
          tone={month.net >= 0 ? 'text-[#26251F]' : 'text-[#C1443B]'}
        />
      </div>

      {(month.ownerIn > 0 || month.ownerOut > 0) && (
        <p className="rounded-lg bg-[#FAF9F6] px-3.5 py-2.5 text-xs text-[#6B6858]">
          Also this month: owner capital in {inr(month.ownerIn)}, owner drawings {inr(month.ownerOut)}.
          Neither counts towards profit.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-[#26251F]">Recent transactions</h2>
            <Link
              href="/dashboard/finance/statements"
              className="flex items-center gap-1 text-xs font-medium text-[#C1502E] hover:underline"
            >
              Full statement
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <TransactionTable rows={recent} emptyMessage="No transactions recorded yet" />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-[#26251F]">Top expenses · {thisMonth}</h2>
          <div className="rounded-xl border border-[#E8E5DC] bg-white">
            {topExpenses.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-[#8A8778]">
                Nothing spent yet this month.
              </p>
            ) : (
              <ul className="divide-y divide-[#F1EFE8]">
                {topExpenses.map((row) => (
                  <li key={row.name} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-[#26251F]">{row.name}</span>
                    <span className="text-sm tabular-nums text-[#6B6858]">{inr(row.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function Tile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-[#E8E5DC] bg-white p-4">
      <p className={`text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs text-[#8A8778]">{label}</p>
    </div>
  )
}
