'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { setOpeningBalance } from '@/lib/actions/finance'

const field =
  'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'
const label = 'mb-1.5 block text-sm font-medium text-[#26251F]'

function toInput(date: Date | string) {
  const d = new Date(date)
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * What was in the account before the ledger began. It counts towards the
 * balance but never towards income, so it can't inflate a month's profit.
 */
export function OpeningBalanceForm({
  accountId,
  openingBalance,
  openingDate,
}: {
  accountId: string
  openingBalance: number
  openingDate: Date | string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState(String(openingBalance))
  const [date, setDate] = useState(toInput(openingDate))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const value = Number(amount)
    if (!Number.isFinite(value) || value < 0) return setError('Enter an opening balance of zero or more.')

    const [y, m, d] = date.split('-').map(Number)

    startTransition(async () => {
      const result = await setOpeningBalance({
        accountId,
        openingBalance: value,
        openingDate: new Date(y, m - 1, d),
      })
      if (!result.success) return setError(result.error)
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-3 py-1.5 text-xs font-medium text-[#6B6858] transition hover:border-[#C1502E]/40 hover:text-[#C1502E]"
      >
        <Pencil className="h-3.5 w-3.5" />
        Set opening balance
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-[#E8E5DC] bg-[#FAF9F6] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ob-amount" className={label}>Opening balance (₹)</label>
          <input
            id="ob-amount" type="number" min="0" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)} className={field}
          />
        </div>
        <div>
          <label htmlFor="ob-date" className={label}>Opening date</label>
          <input id="ob-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </div>
      </div>

      <p className="mt-2 text-xs text-[#8A8778]">
        Counts towards this account&apos;s balance, never towards income.
      </p>

      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-[#FBEAE6] px-3 py-2 text-sm text-[#C1443B]">
          {error}
        </p>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button" onClick={() => setOpen(false)}
          className="rounded-lg border border-[#E8E5DC] bg-white px-3 py-1.5 text-xs font-medium text-[#6B6858] transition hover:bg-[#FAF9F6]"
        >
          Cancel
        </button>
        <button
          type="submit" disabled={pending}
          className="rounded-lg bg-[#C1502E] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
