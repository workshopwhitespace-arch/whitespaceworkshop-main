'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { addMoneyIn, addMoneyOut } from '@/lib/actions/finance'
import { inr } from '@/lib/format'

export type FinanceFormOptions = {
  accounts: { id: string; name: string; type: string }[]
  incomeCategories: { id: string; name: string }[]
  expenseCategories: { id: string; name: string }[]
  clients: { id: string; name: string }[]
  projects: { id: string; title: string; clientId: string }[]
}

const field =
  'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'
const label = 'mb-1.5 block text-sm font-medium text-[#26251F]'

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank transfer', 'Cheque', 'Card', 'Other']

/** Today as YYYY-MM-DD in the studio's own timezone. */
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
 * One form for both directions — the wording, the account label and the
 * category list change with `mode`, everything else is shared.
 */
export function MoneyForm({
  mode,
  options,
  onClose,
}: {
  mode: 'in' | 'out'
  options: FinanceFormOptions
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(options.accounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [isOwnerCapital, setIsOwnerCapital] = useState(false)

  const isIn = mode === 'in'
  const categories = isIn ? options.incomeCategories : options.expenseCategories
  // Picking a client narrows the project list to that client's projects.
  const projects = useMemo(
    () => (clientId ? options.projects.filter((p) => p.clientId === clientId) : options.projects),
    [clientId, options.projects]
  )

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than zero.')
    if (!accountId) return setError(isIn ? 'Choose which account it was received into.' : 'Choose which account it was paid from.')
    if (description.trim().length < 2) return setError('Say what this was for.')

    const payload = {
      date: parseDate(date),
      amount: value,
      accountId,
      categoryId: categoryId || undefined,
      isOwnerCapital,
      counterparty: counterparty.trim() || undefined,
      clientId: clientId || undefined,
      projectId: projectId || undefined,
      paymentMethod: paymentMethod || undefined,
      reference: reference.trim() || undefined,
      description: description.trim(),
      notes: notes.trim() || undefined,
      attachmentUrl: attachmentUrl.trim() || undefined,
    }

    startTransition(async () => {
      try {
        const result = isIn ? await addMoneyIn(payload) : await addMoneyOut(payload)
        if (!result.success) return setError(result.error)
        onClose()
        router.refresh()
      } catch {
        setError('Could not save that entry. Try again in a moment.')
      }
    })
  }

  const selectedAccount = options.accounts.find((a) => a.id === accountId)

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
        aria-labelledby="money-form-title"
        className="w-full max-w-2xl rounded-xl border border-[#E8E5DC] bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#F1EFE8] px-5 py-3.5">
          <h2 id="money-form-title" className="text-sm font-medium text-[#26251F]">
            {isIn ? 'Add money in' : 'Add expense'}
          </h2>
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="rounded p-1 text-[#8A8778] transition hover:bg-[#FAF9F6] hover:text-[#26251F]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="f-date" className={label}>
                Date <span className="text-[#C1502E]">*</span>
              </label>
              <input id="f-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="f-amount" className={label}>
                Amount (₹) <span className="text-[#C1502E]">*</span>
              </label>
              <input
                id="f-amount" type="number" min="0" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={field}
              />
            </div>
            <div>
              <label htmlFor="f-account" className={label}>
                {isIn ? 'Received into' : 'Paid from'} <span className="text-[#C1502E]">*</span>
              </label>
              <select id="f-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={field}>
                {options.accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="f-description" className={label}>
              Description <span className="text-[#C1502E]">*</span>
            </label>
            <input
              id="f-description" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={isIn ? 'e.g. Part payment for lobby design' : 'e.g. Office electricity bill'}
              className={field}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="f-category" className={label}>
                {isIn ? 'Income category' : 'Expense category'}
              </label>
              <select
                id="f-category" value={categoryId} disabled={isOwnerCapital}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`${field} disabled:bg-[#FAF9F6] disabled:text-[#8A8778]`}
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-counterparty" className={label}>
                {isIn ? 'Received from' : 'Vendor / payee'}
              </label>
              <input
                id="f-counterparty" value={counterparty} onChange={(e) => setCounterparty(e.target.value)}
                className={field}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="f-client" className={label}>Client</label>
              <select
                id="f-client" value={clientId}
                onChange={(e) => { setClientId(e.target.value); setProjectId('') }}
                className={field}
              >
                <option value="">No client</option>
                {options.clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-project" className={label}>Project</label>
              <select id="f-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={field}>
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[#8A8778]">Links this to the project&apos;s finances.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="f-method" className={label}>{isIn ? 'Payment type' : 'Payment method'}</label>
              <select id="f-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={field}>
                <option value="">Not recorded</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-reference" className={label}>Reference / txn ID</label>
              <input id="f-reference" value={reference} onChange={(e) => setReference(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="f-attachment" className={label}>
                {isIn ? 'Payment proof' : 'Bill'} <span className="font-normal text-[#8A8778]">(link)</span>
              </label>
              <input
                id="f-attachment" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://…" className={field}
              />
            </div>
          </div>

          <div>
            <label htmlFor="f-notes" className={label}>Notes</label>
            <textarea id="f-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#E8E5DC] bg-[#FAF9F6] p-3">
            <input
              type="checkbox" checked={isOwnerCapital}
              onChange={(e) => { setIsOwnerCapital(e.target.checked); if (e.target.checked) setCategoryId('') }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#C1502E]"
            />
            <span>
              <span className="block text-xs text-[#8A8778]">
                {selectedAccount ? `${selectedAccount.name} still ${isIn ? 'goes up' : 'goes down'}` : 'The account still changes'},
                but it stays out of Profit &amp; Loss.
              </span>
            </span>
          </label>

          {amount && Number(amount) > 0 && selectedAccount && (
            <p className="rounded-lg bg-[#FAF9F6] px-3.5 py-2.5 text-xs text-[#6B6858]">
              {selectedAccount.name} {isIn ? 'increases' : 'decreases'} by{' '}
              <strong className="tabular-nums">{inr(Number(amount))}</strong>, and so does the total balance.
            </p>
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
              {pending ? 'Saving…' : isIn ? 'Save money in' : 'Save expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
