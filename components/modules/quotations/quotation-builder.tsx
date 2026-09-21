'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { createQuotation, updateQuotation } from '@/lib/actions/quotations'
import { inrExact } from '@/lib/format'

type ServiceOption = { id: string; name: string; description: string | null }

type Draft = { key: string; serviceId: string; description: string; quantity: string; rate: string }

/** An existing quotation, loaded into the builder for editing. */
export type QuotationBuilderInitial = {
  id: string
  clientName: string
  reference: string | null
  terms: string | null
  discount: number
  /** YYYY-MM-DD, for the date input. */
  quotationDate: string
  items: { serviceId: string | null; description: string; quantity: number; rate: number }[]
}

const newKey = () => Math.random().toString(36).slice(2)

const emptyRow = (): Draft => ({
  key: newKey(),
  serviceId: '',
  description: '',
  quantity: '1',
  rate: '',
})

/** "2026-09-20" → local midnight, so the date doesn't shift a day by timezone. */
function parseDateInput(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Blank and malformed inputs are treated as zero while typing. */
function num(value: string) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function QuotationBuilder({
  services = [],
  defaultName,
  initial,
}: {
  services?: ServiceOption[]
  /** Prefill for a new quotation, e.g. when started from a client's page. */
  defaultName?: string
  /** Present = edit mode, which also reveals the discount and date fields. */
  initial?: QuotationBuilderInitial
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const editing = Boolean(initial)

  const [clientName, setClientName] = useState(initial?.clientName ?? defaultName ?? '')
  const [reference, setReference] = useState(initial?.reference ?? '')
  const [terms, setTerms] = useState(initial?.terms ?? '')
  const [discount, setDiscount] = useState(initial && initial.discount > 0 ? String(initial.discount) : '')
  const [quotationDate, setQuotationDate] = useState(initial?.quotationDate ?? '')
  const [rows, setRows] = useState<Draft[]>(() =>
    initial && initial.items.length > 0
      ? initial.items.map((i) => ({
          key: newKey(),
          serviceId: i.serviceId ?? '',
          description: i.description,
          quantity: String(i.quantity),
          rate: String(i.rate),
        }))
      : [emptyRow()]
  )
  const [error, setError] = useState<string | null>(null)

  // Mirrors calculateTotals on the server: line amounts less the discount.
  const totals = useMemo(() => {
    const subtotal = rows.reduce((sum, r) => sum + num(r.quantity) * num(r.rate), 0)
    const off = editing ? num(discount) : 0
    return { subtotal, discount: off, total: Math.max(0, subtotal - off) }
  }, [rows, discount, editing])

  function updateRow(key: string, patch: Partial<Draft>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function removeRow(key: string) {
    setRows((current) => (current.length === 1 ? current : current.filter((r) => r.key !== key)))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (clientName.trim().length < 2) {
      setError('Enter the name this quotation is for.')
      return
    }

    const items = rows
      .filter((r) => r.description.trim() !== '')
      .map((r) => ({
        serviceId: r.serviceId || undefined,
        description: r.description.trim(),
        quantity: Math.trunc(num(r.quantity)),
        rate: num(r.rate),
      }))

    if (items.length === 0) {
      setError('Add at least one line item with a description.')
      return
    }
    if (items.some((i) => i.quantity < 1)) {
      setError('Every line item needs a quantity of at least 1.')
      return
    }

    if (editing) {
      if (!quotationDate) return setError('Choose a quotation date.')
      if (num(discount) < 0) return setError('The discount can’t be negative.')
      if (num(discount) > totals.subtotal) return setError('The discount can’t be more than the subtotal.')
    }

    const payload = {
      clientName: clientName.trim(),
      reference: reference.trim() || undefined,
      terms: terms.trim() || undefined,
      items,
    }

    startTransition(async () => {
      const result = initial
        ? await updateQuotation({
            ...payload,
            id: initial.id,
            discount: num(discount),
            quotationDate: parseDateInput(quotationDate),
          })
        : await createQuotation(payload)

      if (!result.success) {
        setError(result.error)
        return
      }
      router.push(`/dashboard/quotations/${result.quotation.id}`)
      router.refresh()
    })
  }

  const field =
    'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'
  const label = 'mb-1.5 block text-sm font-medium text-[#26251F]'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl border border-[#E8E5DC] bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor="clientName" className={label}>
              Name <span className="text-[#C1502E]">*</span>
            </label>
            <input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              maxLength={120}
              placeholder="e.g. IIA Saurashtra"
              className={field}
            />
            <p className="mt-1 text-xs text-[#8A8778]">Printed on the PDF as “For …”.</p>
          </div>

          <div>
            <label htmlFor="reference" className={label}>
              Reference <span className="font-normal text-[#8A8778]">(optional)</span>
            </label>
            <input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Who referred them?"
              className={field}
            />
            <p className="mt-1 text-xs text-[#8A8778]">Leave blank for a direct client.</p>
          </div>

        </div>

        {editing && (
          <div className="mt-4 grid gap-4 border-t border-[#F1EFE8] pt-4 sm:grid-cols-2">
            <div>
              <label htmlFor="qdate" className={label}>Quotation date</label>
              <input
                id="qdate"
                type="date"
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                className={field}
              />
              <p className="mt-1 text-xs text-[#8A8778]">The date printed on the PDF.</p>
            </div>
            <div>
              <label htmlFor="discount" className={label}>
                Discount (₹) <span className="font-normal text-[#8A8778]">(optional)</span>
              </label>
              <input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
                className={field}
              />
              <p className="mt-1 text-xs text-[#8A8778]">Taken off the subtotal.</p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#E8E5DC] bg-white">
        <div className="flex items-center justify-between border-b border-[#F1EFE8] px-5 py-3.5">
          <h2 className="text-sm font-medium text-[#26251F]">Line items</h2>
          <button
            type="button"
            onClick={() => setRows((c) => [...c, emptyRow()])}
            className="flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-2.5 py-1.5 text-xs font-medium text-[#6B6858] transition hover:border-[#C1502E]/40 hover:text-[#C1502E]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8A8778]">
                <th className="px-5 py-2.5 font-medium">Description</th>
                <th className="w-24 px-3 py-2.5 font-medium">Qty</th>
                <th className="w-36 px-3 py-2.5 font-medium">Rate</th>
                <th className="w-32 px-3 py-2.5 text-right font-medium">Amount</th>
                <th className="w-12 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFE8]">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="space-y-1.5 px-5 py-2">
                    {services.length > 0 && (
                      <select
                        value={r.serviceId}
                        onChange={(e) => {
                          const service = services.find((s) => s.id === e.target.value)
                          updateRow(r.key, {
                            serviceId: e.target.value,
                            // Fill the line from the service, but keep anything already typed.
                            ...(service && !r.description.trim()
                              ? { description: service.description?.trim() || service.name }
                              : {}),
                          })
                        }}
                        aria-label="Service"
                        className={`${field} text-[#6B6858]`}
                      >
                        <option value="">Custom item (no service)</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                    <input
                      value={r.description}
                      onChange={(e) => updateRow(r.key, { description: e.target.value })}
                      placeholder="e.g. Living room 3D visualisation"
                      aria-label="Description"
                      className={field}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={r.quantity}
                      onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                      className={field}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.rate}
                      onChange={(e) => updateRow(r.key, { rate: e.target.value })}
                      placeholder="0.00"
                      className={field}
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#26251F]">
                    {inrExact(num(r.quantity) * num(r.rate))}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(r.key)}
                      disabled={rows.length === 1}
                      aria-label="Remove line item"
                      className="rounded p-1.5 text-[#C9C6B8] transition hover:bg-[#FBEAE6] hover:text-[#C1443B] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#C9C6B8]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-[#F1EFE8] px-5 py-4">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#8A8778]">Subtotal</dt>
              <dd className="tabular-nums text-[#26251F]">{inrExact(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-[#8A8778]">Discount</dt>
                <dd className="tabular-nums text-[#26251F]">−{inrExact(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-[#F1EFE8] pt-1.5">
              <dt className="font-medium text-[#26251F]">Total</dt>
              <dd className="text-base font-semibold tabular-nums text-[#26251F]">
                {inrExact(totals.total)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-[#E8E5DC] bg-white p-5">
        <label htmlFor="terms" className={label}>Terms &amp; notes</label>
        <textarea
          id="terms"
          rows={4}
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          placeholder="Payment schedule, revision limits, delivery timeline…"
          className={field}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link
          href={initial ? `/dashboard/quotations/${initial.id}` : '/dashboard/quotations'}
          className="rounded-lg border border-[#E8E5DC] px-3.5 py-2 text-sm font-medium text-[#6B6858] transition hover:bg-[#FAF9F6]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#C1502E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-60"
        >
          {editing
            ? pending ? 'Saving…' : 'Save changes'
            : pending ? 'Creating…' : 'Create quotation'}
        </button>
      </div>
    </form>
  )
}
