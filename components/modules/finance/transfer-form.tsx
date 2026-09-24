'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, X } from 'lucide-react'
import { addTransfer } from '@/lib/actions/finance'
import { inr } from '@/lib/format'

const field =
  'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'
const label = 'mb-1.5 block text-sm font-medium text-[#26251F]'

function today() {
  const d = new Date()
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseDate(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Moving money between the studio's own accounts. It changes two balances
 * and leaves the total alone — and never reaches Profit & Loss.
 */
export function TransferForm({
  accounts,
  onClose,
}: {
  accounts: { id: string; name: string; type: string }[]
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? '')
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? '')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  const from = accounts.find((a) => a.id === fromAccountId)
  const to = accounts.find((a) => a.id === toAccountId)
  const value = Number(amount)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than zero.')
    if (fromAccountId === toAccountId) {
      return setError('Choose two different accounts — a transfer has to go somewhere else.')
    }

    startTransition(async () => {
      try {
        const result = await addTransfer({
          date: parseDate(date),
          amount: value,
          fromAccountId,
          toAccountId,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        })
        if (!result.success) return setError(result.error)
        onClose()
        router.refresh()
      } catch {
        setError('Could not save that transfer. Try again in a moment.')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#1F1E1B]/40 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-form-title"
        className="w-full max-w-lg rounded-xl border border-[#E8E5DC] bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#F1EFE8] px-5 py-3.5">
          <h2 id="transfer-form-title" className="text-sm font-medium text-[#26251F]">New transfer</h2>
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="rounded p-1 text-[#8A8778] transition hover:bg-[#FAF9F6] hover:text-[#26251F]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="t-date" className={label}>
                Date <span className="text-[#C1502E]">*</span>
              </label>
              <input id="t-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="t-amount" className={label}>
                Amount (₹) <span className="text-[#C1502E]">*</span>
              </label>
              <input
                id="t-amount" type="number" min="0" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={field}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="t-from" className={label}>
                From account <span className="text-[#C1502E]">*</span>
              </label>
              <select id="t-from" value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className={field}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="t-to" className={label}>
                To account <span className="text-[#C1502E]">*</span>
              </label>
              <select id="t-to" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={field}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === fromAccountId}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="t-reference" className={label}>Reference</label>
            <input id="t-reference" value={reference} onChange={(e) => setReference(e.target.value)} className={field} />
          </div>

          <div>
            <label htmlFor="t-notes" className={label}>Notes</label>
            <textarea id="t-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
          </div>

          {value > 0 && from && to && from.id !== to.id && (
            <div className="rounded-lg bg-[#FAF9F6] px-3.5 py-3 text-xs text-[#6B6858]">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-[#C1443B]">{from.name} −{inr(value)}</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#C9C6B8]" />
                <span className="font-medium text-[#3F7A50]">{to.name} +{inr(value)}</span>
              </p>
              <p className="mt-1.5">
                Total balance is unchanged, and this is neither income nor an expense.
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="rounded-lg border border-[#E8E5DC] px-3.5 py-2 text-sm font-medium text-[#6B6858] transition hover:bg-[#FAF9F6]"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={pending}
              className="rounded-lg bg-[#C1502E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
