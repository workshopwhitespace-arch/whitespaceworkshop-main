import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getAccountsOverview, listTransactions } from '@/lib/actions/finance'
import { TransactionTable } from '@/components/modules/finance/transaction-table'
import { OpeningBalanceForm } from '@/components/modules/finance/opening-balance-form'
import { formatDate, inr } from '@/lib/format'

export default async function FinanceAccountPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { accounts } = await getAccountsOverview()
  const account = accounts.find((a) => a.id === id)
  if (!account) notFound()

  const transactions = await listTransactions({ accountId: id, take: 50 })

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/finance/accounts"
        className="inline-flex items-center gap-1.5 text-sm text-[#8A8778] transition hover:text-[#C1502E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Accounts
      </Link>

      <div className="rounded-xl border border-[#E8E5DC] bg-white p-5">
        <h2 className="text-sm font-medium text-[#8A8778]">{account.name}</h2>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-[#26251F]">
          {inr(account.balance)}
        </p>
        <p className="mt-0.5 text-xs text-[#8A8778]">Current balance</p>

        <dl className="mt-5 grid gap-4 border-t border-[#F1EFE8] pt-4 sm:grid-cols-4">
          <Stat label="Opening balance" value={inr(account.openingBalance)} hint={formatDate(account.openingDate)} />
          <Stat label="Total money in" value={inr(account.moneyIn)} tone="text-[#3F7A50]" />
          <Stat label="Total money out" value={inr(account.moneyOut)} tone="text-[#C1443B]" />
          <Stat label="Transactions" value={String(account.transactionCount)} />
        </dl>

        <div className="mt-4 border-t border-[#F1EFE8] pt-4">
          <OpeningBalanceForm
            accountId={account.id}
            openingBalance={account.openingBalance}
            openingDate={account.openingDate}
          />
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#26251F]">Recent transactions</h2>
          <Link
            href={`/dashboard/finance/statements?account=${account.id}`}
            className="text-xs font-medium text-[#C1502E] hover:underline"
          >
            Full statement
          </Link>
        </div>
        <TransactionTable rows={transactions} emptyMessage="Nothing has gone through this account yet" />
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  tone = 'text-[#26251F]',
}: {
  label: string
  value: string
  hint?: string
  tone?: string
}) {
  return (
    <div>
      <dt className="text-xs text-[#8A8778]">{label}</dt>
      <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${tone}`}>{value}</dd>
      {hint && <p className="text-xs text-[#C9C6B8]">{hint}</p>}
    </div>
  )
}
