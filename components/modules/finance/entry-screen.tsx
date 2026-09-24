'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { MoneyForm, type FinanceFormOptions } from './money-form'
import { TransferForm } from './transfer-form'
import { TransactionTable } from './transaction-table'
import type { FinanceListRow } from '@/lib/actions/finance'

/**
 * The Money In, Money Out and Transfer screens are the same shape: a button
 * that opens the right form, and the list of what's been recorded.
 */
export function EntryScreen({
  mode,
  rows,
  options,
  buttonLabel,
  emptyMessage,
  note,
}: {
  mode: 'in' | 'out' | 'transfer'
  rows: FinanceListRow[]
  options: FinanceFormOptions
  buttonLabel: string
  emptyMessage: string
  note: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#8A8778]">{note}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F]"
        >
          <Plus className="h-4 w-4" />
          {buttonLabel}
        </button>
      </div>

      <TransactionTable rows={rows} emptyMessage={emptyMessage} />

      {open &&
        (mode === 'transfer' ? (
          <TransferForm accounts={options.accounts} onClose={() => setOpen(false)} />
        ) : (
          <MoneyForm mode={mode} options={options} onClose={() => setOpen(false)} />
        ))}
    </div>
  )
}
