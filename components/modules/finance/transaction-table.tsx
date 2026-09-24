'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Ban, Wallet } from 'lucide-react'
import { voidTransaction } from '@/lib/actions/finance'
import type { FinanceListRow } from '@/lib/actions/finance'
import { formatDate, inr } from '@/lib/format'

const TYPE_META: Record<string, { label: string; icon: typeof Wallet; tone: string }> = {
  MONEY_IN: { label: 'Money in', icon: ArrowDownLeft, tone: 'text-[#3F7A50]' },
  OWNER_INVESTMENT: { label: 'Owner capital', icon: ArrowDownLeft, tone: 'text-[#3B6CA8]' },
  MONEY_OUT: { label: 'Money out', icon: ArrowUpRight, tone: 'text-[#C1443B]' },
  OWNER_WITHDRAWAL: { label: 'Owner drawing', icon: ArrowUpRight, tone: 'text-[#3B6CA8]' },
  TRANSFER: { label: 'Transfer', icon: ArrowRightLeft, tone: 'text-[#6B6858]' },
}

const CREDIT_TYPES = ['MONEY_IN', 'OWNER_INVESTMENT']

/** Money In / Money Out / Transfer lists, and an account's recent entries. */
export function TransactionTable({
  rows,
  emptyMessage,
}: {
  rows: FinanceListRow[]
  emptyMessage: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function cancel(row: FinanceListRow) {
    const reason = window.prompt(
      `Cancel “${row.description}” (${inr(row.amount)})?\n\nThe entry stays in the records, marked cancelled, and stops counting towards any balance.\n\nWhy is it being cancelled?`
    )
    if (reason === null) return
    if (reason.trim().length < 3) {
      setError('Give a short reason so the audit trail makes sense later.')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const result = await voidTransaction({ id: row.id, reason: reason.trim() })
        if (!result.success) return setError(result.error)
        router.refresh()
      } catch {
        setError('Could not cancel that entry. Refresh the page and try again.')
      }
    })
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#E8E5DC] bg-white py-16 text-center">
        <Wallet className="h-6 w-6 text-[#C9C6B8]" />
        <p className="text-sm font-medium text-[#26251F]">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E8E5DC] bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8A8778]">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1EFE8]">
            {rows.map((row) => {
              const meta = TYPE_META[row.type] ?? TYPE_META.TRANSFER
              const Icon = meta.icon
              const voided = row.status === 'VOID'
              const sign = CREDIT_TYPES.includes(row.type) ? '+' : row.type === 'TRANSFER' ? '' : '−'

              return (
                <tr
                  key={row.id}
                  className={`transition hover:bg-[#FAF9F6] ${voided ? 'text-[#C9C6B8]' : ''}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#6B6858]">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-4 py-3">
                    <p className={`flex items-center gap-1.5 ${voided ? 'line-through' : 'text-[#26251F]'}`}>
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${voided ? 'text-[#C9C6B8]' : meta.tone}`} />
                      {row.description}
                    </p>
                    <p className="mt-0.5 text-xs text-[#8A8778]">
                      {[
                        meta.label,
                        row.counterparty,
                        row.clientName,
                        voided ? 'cancelled' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6B6858]">{row.categoryName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-[#6B6858]">
                    {row.toAccountName ? `${row.accountName} → ${row.toAccountName}` : row.accountName}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8A8778]">{row.reference ?? '—'}</td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums ${
                      voided
                        ? 'text-[#C9C6B8] line-through'
                        : CREDIT_TYPES.includes(row.type)
                          ? 'text-[#3F7A50]'
                          : row.type === 'TRANSFER'
                            ? 'text-[#6B6858]'
                            : 'text-[#C1443B]'
                    }`}
                  >
                    {sign}
                    {inr(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {voided ? (
                      <span className="text-xs text-[#C9C6B8]">Cancelled</span>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => cancel(row)}
                        title="Cancel this entry"
                        aria-label={`Cancel ${row.description}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E8E5DC] px-2.5 py-1.5 text-xs font-medium text-[#6B6858] transition hover:border-[#C1443B]/40 hover:text-[#C1443B] disabled:opacity-50"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#8A8778]">
        Financial entries are never deleted. Cancelling keeps the record and removes it from every
        balance — see the{' '}
        <Link href="/dashboard/activity" className="text-[#C1502E] hover:underline">
          activity log
        </Link>{' '}
        for the trail.
      </p>
    </div>
  )
}
