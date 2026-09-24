'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Download, Printer, Search } from 'lucide-react'
import { formatDate, inr, inrExact } from '@/lib/format'
import type { FinanceFormOptions } from './money-form'

type Row = {
  id: string
  date: string
  description: string
  category: string
  reference: string
  account: string
  type: string
  status: string
  debit: number
  credit: number
  balance: number
  clientName: string | null
  projectTitle: string | null
  paymentMethod: string | null
}

type Statement = {
  openingBalance: number
  closingBalance: number
  rows: Row[]
  totals: { debit: number; credit: number }
  accountName: string
}

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
]

const TYPES = [
  { value: 'MONEY_IN', label: 'Money in' },
  { value: 'MONEY_OUT', label: 'Money out' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'OWNER_INVESTMENT', label: 'Owner capital' },
  { value: 'OWNER_WITHDRAWAL', label: 'Owner drawing' },
]

const field =
  'rounded-lg border border-[#E8E5DC] bg-white px-2.5 py-1.5 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'

/**
 * A bank-statement view: every row with debit, credit and the balance after
 * it. Filters live in the URL, so a statement can be bookmarked or shared.
 */
export function StatementView({
  statement,
  options,
  filters,
}: {
  statement: Statement
  options: FinanceFormOptions
  filters: Record<string, string>
}) {
  const router = useRouter()
  const params = useSearchParams()

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'range' && value !== 'custom') {
      next.delete('from')
      next.delete('to')
    }
    router.push(`/dashboard/finance/statements?${next.toString()}`)
  }

  /** CSV opens straight in Excel — no library, no server round trip. */
  function exportCsv() {
    const header = ['Date', 'Description', 'Category', 'Reference', 'Account', 'Debit', 'Credit', 'Balance']
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
    const lines = [
      header.join(','),
      ...statement.rows.map((r) =>
        [
          formatDate(r.date),
          escape(r.description),
          escape(r.category),
          escape(r.reference),
          escape(r.account),
          r.debit || '',
          r.credit || '',
          r.balance,
        ].join(',')
      ),
      ['', 'Closing balance', '', '', '', statement.totals.debit, statement.totals.credit, statement.closingBalance].join(','),
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `statement-${statement.accountName.toLowerCase().replace(/\s+/g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3 rounded-xl border border-[#E8E5DC] bg-white p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <select value={filters.account} onChange={(e) => setFilter('account', e.target.value)} className={field} aria-label="Account">
            <option value="">All accounts</option>
            {options.accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select value={filters.range} onChange={(e) => setFilter('range', e.target.value)} className={field} aria-label="Period">
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          {filters.range === 'custom' && (
            <>
              <input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} className={field} aria-label="From date" />
              <input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} className={field} aria-label="To date" />
            </>
          )}

          <select value={filters.type} onChange={(e) => setFilter('type', e.target.value)} className={field} aria-label="Transaction type">
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)} className={field} aria-label="Category">
            <option value="">All categories</option>
            <optgroup label="Income">
              {options.incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
            <optgroup label="Expense">
              {options.expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          </select>

          <select value={filters.client} onChange={(e) => setFilter('client', e.target.value)} className={field} aria-label="Client">
            <option value="">All clients</option>
            {options.clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select value={filters.project} onChange={(e) => setFilter('project', e.target.value)} className={field} aria-label="Project">
            <option value="">All projects</option>
            {options.projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A8778]" />
            <input
              type="search"
              defaultValue={filters.q}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setFilter('q', (e.target as HTMLInputElement).value)
              }}
              placeholder="Search description or reference…"
              aria-label="Search transactions"
              className={`${field} w-60 pl-8`}
            />
          </div>

          <span className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-3 py-1.5 text-sm font-medium text-[#6B6858] transition hover:border-[#C1502E]/40 hover:text-[#C1502E]"
            >
              <Download className="h-3.5 w-3.5" />
              Excel (CSV)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-3 py-1.5 text-sm font-medium text-[#6B6858] transition hover:border-[#C1502E]/40 hover:text-[#C1502E]"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / PDF
            </button>
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Summary label="Opening balance" value={inr(statement.openingBalance)} />
        <Summary label="Total in" value={inr(statement.totals.credit)} tone="text-[#3F7A50]" />
        <Summary label="Total out" value={inr(statement.totals.debit)} tone="text-[#C1443B]" />
        <Summary label="Closing balance" value={inr(statement.closingBalance)} strong />
      </div>

      {/* Statement */}
      <div className="overflow-x-auto rounded-xl border border-[#E8E5DC] bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8A8778]">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 text-right font-medium">Debit</th>
              <th className="px-4 py-3 text-right font-medium">Credit</th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1EFE8]">
            <tr className="bg-[#FAF9F6] text-[#6B6858]">
              <td className="px-4 py-2.5 text-xs">—</td>
              <td className="px-4 py-2.5 text-xs font-medium" colSpan={4}>
                Opening balance · {statement.accountName}
              </td>
              <td className="px-4 py-2.5 text-right text-xs">—</td>
              <td className="px-4 py-2.5 text-right text-xs">—</td>
              <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                {inrExact(statement.openingBalance)}
              </td>
            </tr>

            {statement.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-[#8A8778]">
                  No transactions in this period.
                </td>
              </tr>
            ) : (
              statement.rows.map((row) => (
                <tr
                  key={row.id}
                  className={`transition hover:bg-[#FAF9F6] ${row.status === 'VOID' ? 'text-[#C9C6B8] line-through' : ''}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#6B6858]">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-4 py-3 text-[#26251F]">
                    {row.description}
                    {(row.clientName || row.projectTitle) && (
                      <p className="text-xs text-[#8A8778]">
                        {[row.clientName, row.projectTitle].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6B6858]">{row.category}</td>
                  <td className="px-4 py-3 text-xs text-[#8A8778]">{row.reference}</td>
                  <td className="px-4 py-3 text-xs text-[#6B6858]">{row.account}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#C1443B]">
                    {row.debit ? inrExact(row.debit) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#3F7A50]">
                    {row.credit ? inrExact(row.credit) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-[#26251F]">
                    {inrExact(row.balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#E8E5DC] bg-[#FAF9F6]">
              <td className="px-4 py-3 text-sm font-medium text-[#26251F]" colSpan={5}>
                Closing balance · {statement.accountName}
              </td>
              <td className="px-4 py-3 text-right text-sm tabular-nums text-[#C1443B]">
                {inrExact(statement.totals.debit)}
              </td>
              <td className="px-4 py-3 text-right text-sm tabular-nums text-[#3F7A50]">
                {inrExact(statement.totals.credit)}
              </td>
              <td className="px-4 py-3 text-right text-base font-semibold tabular-nums text-[#26251F]">
                {inrExact(statement.closingBalance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-[#8A8778] print:hidden">
        On a single account, money arriving is a credit and money leaving is a debit — a transfer
        shows on both accounts. Across all accounts the balance is the studio&apos;s total, so
        transfers cancel out and are never counted as income or expense.
      </p>
    </div>
  )
}

function Summary({
  label,
  value,
  tone = 'text-[#26251F]',
  strong,
}: {
  label: string
  value: string
  tone?: string
  strong?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${strong ? 'border-[#26251F] bg-[#26251F]' : 'border-[#E8E5DC] bg-white'}`}>
      <p className={`text-xl font-semibold tabular-nums ${strong ? 'text-white' : tone}`}>{value}</p>
      <p className={`mt-0.5 text-xs ${strong ? 'text-white/70' : 'text-[#8A8778]'}`}>{label}</p>
    </div>
  )
}
