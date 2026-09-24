import { db } from '@/lib/db'
import type { FinanceTxType, Prisma } from '@prisma/client'
import { effectOnAccount } from './balances'

/**
 * A bank-statement view of the ledger.
 *
 * For one account: money arriving is a credit, money leaving is a debit, and
 * the running balance starts from that account's opening balance. A transfer
 * shows once on each side — debit on the account it left, credit on the one
 * it reached.
 *
 * For all accounts together: the running balance is the studio's total, so a
 * transfer's two halves cancel out and nothing is counted twice.
 */

export type StatementRow = {
  id: string
  date: Date
  description: string
  category: string
  reference: string
  account: string
  type: FinanceTxType
  status: string
  debit: number
  credit: number
  balance: number
  clientName: string | null
  projectTitle: string | null
  paymentMethod: string | null
}

export type StatementFilters = {
  accountId?: string
  from?: Date
  to?: Date
  type?: FinanceTxType
  categoryId?: string
  clientId?: string
  projectId?: string
  paymentMethod?: string
  search?: string
  includeVoid?: boolean
}

const n = (value: Prisma.Decimal | number | null) => (value === null ? 0 : Number(value))

export async function buildStatement(filters: StatementFilters) {
  const where: Prisma.FinanceTransactionWhereInput = {
    ...(filters.includeVoid ? {} : { status: 'ACTIVE' }),
    ...(filters.accountId
      ? { OR: [{ accountId: filters.accountId }, { toAccountId: filters.accountId }] }
      : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
    ...(filters.search
      ? {
          OR: [
            { description: { contains: filters.search } },
            { reference: { contains: filters.search } },
            { counterparty: { contains: filters.search } },
          ],
        }
      : {}),
  }

  // The balance a statement opens with: everything before the start date.
  const [account, rows] = await Promise.all([
    filters.accountId
      ? db.financeAccount.findUnique({ where: { id: filters.accountId } })
      : Promise.resolve(null),
    db.financeTransaction.findMany({
      where: {
        ...where,
        ...(filters.from || filters.to
          ? { date: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
          : {}),
      },
      include: {
        account: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
        category: { select: { name: true } },
        client: { select: { name: true, companyName: true } },
        project: { select: { title: true } },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
  ])

  const openingBalance = await balanceBefore(filters.accountId, filters.from)

  let running = openingBalance
  const statement: StatementRow[] = rows.map((tx) => {
    // One account: what it did to that account. All accounts: what it did to
    // the studio's total, which a transfer leaves unchanged.
    const effect = filters.accountId
      ? effectOnAccount(tx, filters.accountId)
      : tx.type === 'TRANSFER'
        ? 0
        : effectOnAccount(tx, tx.accountId)

    if (tx.status === 'ACTIVE') running += effect

    const transferIn = tx.type === 'TRANSFER' && tx.toAccountId === filters.accountId

    return {
      id: tx.id,
      date: tx.date,
      description:
        tx.type === 'TRANSFER' && filters.accountId
          ? transferIn
            ? `Transfer from ${tx.account.name}`
            : `Transfer to ${tx.toAccount?.name ?? 'another account'}`
          : tx.description,
      category: tx.category?.name ?? transferLabel(tx.type),
      reference: tx.reference ?? '—',
      account: filters.accountId
        ? (transferIn ? tx.toAccount?.name : tx.account.name) ?? tx.account.name
        : tx.type === 'TRANSFER'
          ? `${tx.account.name} → ${tx.toAccount?.name ?? '—'}`
          : tx.account.name,
      type: tx.type,
      status: tx.status,
      debit: effect < 0 ? -effect : 0,
      credit: effect > 0 ? effect : 0,
      balance: running,
      clientName: tx.client ? tx.client.companyName || tx.client.name : null,
      projectTitle: tx.project?.title ?? null,
      paymentMethod: tx.paymentMethod,
    }
  })

  const totals = statement.reduce(
    (acc, row) => ({ debit: acc.debit + row.debit, credit: acc.credit + row.credit }),
    { debit: 0, credit: 0 }
  )

  return {
    openingBalance,
    closingBalance: running,
    rows: statement,
    totals,
    accountName: account?.name ?? 'All accounts',
  }
}

function transferLabel(type: FinanceTxType) {
  if (type === 'TRANSFER') return 'Transfer'
  if (type === 'OWNER_INVESTMENT') return 'Owner investment'
  if (type === 'OWNER_WITHDRAWAL') return 'Owner withdrawal'
  return 'Uncategorised'
}

/** Balance carried into the statement: opening balances plus earlier rows. */
async function balanceBefore(accountId?: string, from?: Date) {
  const accounts = await db.financeAccount.findMany(
    accountId ? { where: { id: accountId } } : undefined
  )
  let balance = accounts.reduce((sum, a) => sum + n(a.openingBalance), 0)

  if (!from) return balance

  const earlier = await db.financeTransaction.findMany({
    where: {
      status: 'ACTIVE',
      date: { lt: from },
      ...(accountId ? { OR: [{ accountId }, { toAccountId: accountId }] } : {}),
    },
    select: { type: true, accountId: true, toAccountId: true, amount: true },
  })

  for (const tx of earlier) {
    balance += accountId
      ? effectOnAccount(tx, accountId)
      : tx.type === 'TRANSFER'
        ? 0
        : effectOnAccount(tx, tx.accountId)
  }

  return balance
}

/** Named date ranges for the statement filters. */
export function dateRangeFor(preset: string): { from?: Date; to?: Date } {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'yesterday': {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return { from: startOfDay(y), to: endOfDay(y) }
    }
    case 'week': {
      const start = new Date(now)
      // Weeks run Monday to Sunday.
      const day = (start.getDay() + 6) % 7
      start.setDate(start.getDate() - day)
      return { from: startOfDay(start), to: endOfDay(now) }
    }
    case 'month':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: endOfDay(now),
      }
    case 'last-month':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      }
    case 'year':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) }
    default:
      return {}
  }
}
