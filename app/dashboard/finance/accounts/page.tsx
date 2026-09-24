import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getAccountsOverview } from '@/lib/actions/finance'
import { AccountCards } from '@/components/modules/finance/account-cards'
import { formatDate, inr } from '@/lib/format'

export default async function FinanceAccountsPage() {
  const { accounts, total } = await getAccountsOverview()

  return (
    <div className="space-y-5">
      <AccountCards accounts={accounts} total={total} />

      <div className="overflow-x-auto rounded-xl border border-[#E8E5DC] bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8A8778]">
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 text-right font-medium">Opening</th>
              <th className="px-4 py-3 text-right font-medium">Money in</th>
              <th className="px-4 py-3 text-right font-medium">Money out</th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
              <th className="w-28 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1EFE8]">
            {accounts.map((account) => (
              <tr key={account.id} className="transition hover:bg-[#FAF9F6]">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/finance/accounts/${account.id}`}
                    className="font-medium text-[#26251F] transition hover:text-[#C1502E]"
                  >
                    {account.name}
                  </Link>
                  <p className="text-xs text-[#8A8778]">
                    Opened {formatDate(account.openingDate)} · {account.transactionCount} entries
                  </p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[#6B6858]">
                  {inr(account.openingBalance)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[#3F7A50]">
                  {inr(account.moneyIn)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[#C1443B]">
                  {inr(account.moneyOut)}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-[#26251F]">
                  {inr(account.balance)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/finance/accounts/${account.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#8A8778] transition hover:text-[#C1502E]"
                  >
                    Open
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#E8E5DC] bg-[#FAF9F6]">
              <td className="px-4 py-3 text-sm font-medium text-[#26251F]" colSpan={4}>
                Total balance
              </td>
              <td className="px-4 py-3 text-right text-base font-semibold tabular-nums text-[#26251F]">
                {inr(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-[#8A8778]">
        Balances are worked out from the ledger every time this page loads — they can&apos;t be typed
        in or edited directly.
      </p>
    </div>
  )
}
