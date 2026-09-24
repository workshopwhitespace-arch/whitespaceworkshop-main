import { db } from '@/lib/db'
import type { FinanceTransaction, FinanceTxType, Prisma } from '@prisma/client'

/**
 * Balances are never stored. Every figure here is worked out from the
 * ledger, so an account can't drift away from its transactions.
 *
 * Account balance = opening balance
 *                 + money in / owner investment into it
 *                 + transfers into it
 *                 - money out / owner withdrawal from it
 *                 - transfers out of it
 *
 * Total balance = the three account balances added up. A transfer moves
 * money between two of them, so it cancels out and the total is unchanged.
 */

export type AccountBalance = {
  id: string
  type: string
  name: string
  openingBalance: number
  openingDate: Date
  balance: number
  moneyIn: number
  moneyOut: number
  transactionCount: number
}

const CREDIT_TYPES: FinanceTxType[] = ['MONEY_IN', 'OWNER_INVESTMENT']
const DEBIT_TYPES: FinanceTxType[] = ['MONEY_OUT', 'OWNER_WITHDRAWAL']

const n = (value: Prisma.Decimal | number | null) => (value === null ? 0 : Number(value))

/**
 * What one ledger row does to a given account: positive credits it,
 * negative debits it, zero means it doesn't touch that account.
 */
export function effectOnAccount(
  tx: Pick<FinanceTransaction, 'type' | 'accountId' | 'toAccountId' | 'amount'>,
  accountId: string
) {
  const amount = n(tx.amount)
  if (tx.type === 'TRANSFER') {
    if (tx.toAccountId === accountId) return amount
    if (tx.accountId === accountId) return -amount
    return 0
  }
  if (tx.accountId !== accountId) return 0
  if (CREDIT_TYPES.includes(tx.type)) return amount
  if (DEBIT_TYPES.includes(tx.type)) return -amount
  return 0
}

/** Every account with its balance, in Cash → Saving → Current order. */
export async function accountBalances(upTo?: Date): Promise<AccountBalance[]> {
  const [accounts, transactions] = await Promise.all([
    db.financeAccount.findMany({ orderBy: { type: 'asc' } }),
    db.financeTransaction.findMany({
      where: { status: 'ACTIVE', ...(upTo ? { date: { lte: upTo } } : {}) },
      select: { type: true, accountId: true, toAccountId: true, amount: true },
    }),
  ])

  const order = { CASH: 0, SAVING: 1, CURRENT: 2 } as Record<string, number>

  return accounts
    .map((account) => {
      let balance = n(account.openingBalance)
      let moneyIn = 0
      let moneyOut = 0
      let transactionCount = 0

      for (const tx of transactions) {
        const effect = effectOnAccount(tx, account.id)
        if (effect === 0) continue
        balance += effect
        transactionCount += 1
        if (effect > 0) moneyIn += effect
        else moneyOut += -effect
      }

      return {
        id: account.id,
        type: account.type as string,
        name: account.name,
        openingBalance: n(account.openingBalance),
        openingDate: account.openingDate,
        balance,
        moneyIn,
        moneyOut,
        transactionCount,
      }
    })
    .sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9))
}

export function totalBalance(accounts: AccountBalance[]) {
  return accounts.reduce((sum, a) => sum + a.balance, 0)
}

/**
 * Business income and expenses for a period — the only figures Profit & Loss
 * uses. Transfers, owner capital and opening balances are all left out by
 * design: moving your own money about isn't trading.
 */
export async function periodTotals(from: Date, to: Date) {
  const rows = await db.financeTransaction.groupBy({
    by: ['type'],
    where: { status: 'ACTIVE', date: { gte: from, lte: to } },
    _sum: { amount: true },
  })

  const sum = (type: FinanceTxType) => n(rows.find((r) => r.type === type)?._sum.amount ?? 0)

  const income = sum('MONEY_IN')
  const expense = sum('MONEY_OUT')

  return {
    income,
    expense,
    net: income - expense,
    ownerIn: sum('OWNER_INVESTMENT'),
    ownerOut: sum('OWNER_WITHDRAWAL'),
  }
}

/** First and last moment of a month, in the studio's local time. */
export function monthRange(date = new Date()) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { from, to }
}
