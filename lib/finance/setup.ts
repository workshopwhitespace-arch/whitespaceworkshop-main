import { db } from '@/lib/db'
import type { FinanceAccountType } from '@prisma/client'

/**
 * The studio's three money accounts and its starting category lists.
 *
 * Accounts and categories are created on first use rather than by a seed
 * script, so the module works on a fresh database (including the Hostinger
 * one) without anyone running anything.
 */

export const ACCOUNTS: { type: FinanceAccountType; name: string }[] = [
  { type: 'CASH', name: 'Cash' },
  { type: 'SAVING', name: 'Saving Account' },
  { type: 'CURRENT', name: 'Current Account' },
]

export const INCOME_CATEGORIES = [
  'Interior Design',
  'Branding',
  'Graphic Design',
  'Architecture',
  'Web Design',
  'ERP Solutions',
  'Digital Marketing',
  'Video Production',
  'Consultation',
  'Other Income',
]

export const EXPENSE_CATEGORIES = [
  'Office',
  'Rent',
  'Electricity',
  'Salary',
  'Labour',
  'Material',
  'Transport',
  'Travel',
  'Marketing',
  'Advertising',
  'Software',
  'Printing',
  'Client Expense',
  'Professional Fees',
  'Maintenance',
  'Food',
  'Other',
]

/** Idempotent — safe to call on every finance page load. */
export async function ensureFinanceSetup() {
  const existing = await db.financeAccount.count()
  if (existing < ACCOUNTS.length) {
    for (const account of ACCOUNTS) {
      await db.financeAccount.upsert({
        where: { type: account.type },
        update: {},
        create: { type: account.type, name: account.name },
      })
    }
  }

  const categories = await db.financeCategory.count()
  if (categories === 0) {
    await db.financeCategory.createMany({
      data: [
        ...INCOME_CATEGORIES.map((name) => ({ kind: 'INCOME' as const, name })),
        ...EXPENSE_CATEGORIES.map((name) => ({ kind: 'EXPENSE' as const, name })),
      ],
      skipDuplicates: true,
    })
  }
}
