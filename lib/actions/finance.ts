'use server'

import { revalidatePath } from 'next/cache'
import type { FinanceTxType, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { logActivity } from '@/lib/actions/activity'
import { ensureFinanceSetup } from '@/lib/finance/setup'
import { accountBalances, periodTotals, totalBalance, monthRange } from '@/lib/finance/balances'
import {
  moneyInSchema,
  moneyOutSchema,
  transferSchema,
  voidTransactionSchema,
  openingBalanceSchema,
  financeCategorySchema,
  type MoneyInInput,
  type MoneyOutInput,
  type TransferInput,
  type VoidTransactionInput,
  type OpeningBalanceInput,
  type FinanceCategoryInput,
} from '@/lib/validations/finance'

/**
 * Finance is Super Admin only — every function here starts with that check,
 * so no figure reaches anyone else even if a link leaks.
 *
 * Nothing is ever hard-deleted: a mistake is voided, which leaves the row
 * readable and out of every balance.
 */
async function requireFinanceAccess() {
  return requireRole(['SUPER_ADMIN'])
}

function revalidateFinance() {
  for (const path of [
    '/dashboard/finance',
    '/dashboard/finance/accounts',
    '/dashboard/finance/money-in',
    '/dashboard/finance/money-out',
    '/dashboard/finance/transfers',
    '/dashboard/finance/statements',
    '/dashboard',
  ]) {
    revalidatePath(path)
  }
}

/** Accounts with balances, plus the total. Creates the three on first run. */
export async function getAccountsOverview() {
  await requireFinanceAccess()
  await ensureFinanceSetup()

  const accounts = await accountBalances()
  return { accounts, total: totalBalance(accounts) }
}

/** Everything the Finance → Overview screen shows. */
export async function getFinanceOverview() {
  await requireFinanceAccess()
  await ensureFinanceSetup()

  const { from, to } = monthRange()
  const [accounts, month, recent, topExpenses] = await Promise.all([
    accountBalances(),
    periodTotals(from, to),
    db.financeTransaction.findMany({
      where: { status: 'ACTIVE' },
      include: {
        account: { select: { name: true } },
        toAccount: { select: { name: true } },
        category: { select: { name: true } },
        client: { select: { id: true, name: true, companyName: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    }),
    db.financeTransaction.groupBy({
      by: ['categoryId'],
      where: { status: 'ACTIVE', type: 'MONEY_OUT', date: { gte: from, lte: to } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
  ])

  const categoryNames = new Map(
    (
      await db.financeCategory.findMany({
        where: { id: { in: topExpenses.map((e) => e.categoryId).filter(Boolean) as string[] } },
        select: { id: true, name: true },
      })
    ).map((c) => [c.id, c.name])
  )

  return {
    accounts,
    total: totalBalance(accounts),
    month,
    recent: recent.map(toListRow),
    topExpenses: topExpenses.map((e) => ({
      name: e.categoryId ? (categoryNames.get(e.categoryId) ?? 'Uncategorised') : 'Uncategorised',
      amount: Number(e._sum.amount ?? 0),
    })),
  }
}

export type FinanceListRow = ReturnType<typeof toListRow>

function toListRow(tx: {
  id: string
  type: FinanceTxType
  status: string
  date: Date
  amount: Prisma.Decimal
  description: string
  reference: string | null
  counterparty: string | null
  paymentMethod: string | null
  account: { name: string }
  toAccount: { name: string } | null
  category: { name: string } | null
  client: { id: string; name: string; companyName: string | null } | null
}) {
  return {
    id: tx.id,
    type: tx.type,
    status: tx.status,
    date: tx.date,
    amount: Number(tx.amount),
    description: tx.description,
    reference: tx.reference,
    counterparty: tx.counterparty,
    paymentMethod: tx.paymentMethod,
    accountName: tx.account.name,
    toAccountName: tx.toAccount?.name ?? null,
    categoryName: tx.category?.name ?? null,
    clientId: tx.client?.id ?? null,
    clientName: tx.client ? tx.client.companyName || tx.client.name : null,
  }
}

const listInclude = {
  account: { select: { name: true } },
  toAccount: { select: { name: true } },
  category: { select: { name: true } },
  client: { select: { id: true, name: true, companyName: true } },
} as const

/** Ledger rows of one kind, newest first — the Money In / Out / Transfer lists. */
export async function listTransactions(filters: {
  types?: FinanceTxType[]
  accountId?: string
  take?: number
}) {
  await requireFinanceAccess()
  await ensureFinanceSetup()

  const rows = await db.financeTransaction.findMany({
    where: {
      ...(filters.types ? { type: { in: filters.types } } : {}),
      ...(filters.accountId
        ? { OR: [{ accountId: filters.accountId }, { toAccountId: filters.accountId }] }
        : {}),
    },
    include: listInclude,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: filters.take ?? 200,
  })

  return rows.map(toListRow)
}

/** Accounts, categories, clients and projects for the entry forms. */
export async function getFinanceFormOptions() {
  await requireFinanceAccess()
  await ensureFinanceSetup()

  const [accounts, categories, clients, projects] = await Promise.all([
    db.financeAccount.findMany({ orderBy: { type: 'asc' } }),
    db.financeCategory.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    db.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: 'asc' },
    }),
    db.project.findMany({
      select: { id: true, title: true, clientId: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const order = { CASH: 0, SAVING: 1, CURRENT: 2 } as Record<string, number>

  return {
    accounts: accounts
      .map((a) => ({ id: a.id, name: a.name, type: a.type as string }))
      .sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9)),
    incomeCategories: categories.filter((c) => c.kind === 'INCOME').map((c) => ({ id: c.id, name: c.name })),
    expenseCategories: categories.filter((c) => c.kind === 'EXPENSE').map((c) => ({ id: c.id, name: c.name })),
    clients: clients.map((c) => ({ id: c.id, name: c.companyName || c.name })),
    projects: projects.map((p) => ({ id: p.id, title: p.title, clientId: p.clientId })),
  }
}

async function record(
  type: FinanceTxType,
  data: Omit<Prisma.FinanceTransactionUncheckedCreateInput, 'type' | 'createdById'>,
  userId: string,
  label: string
) {
  const tx = await db.financeTransaction.create({
    data: { ...data, type, createdById: userId },
  })

  await logActivity(userId, label, 'finance', tx.id, {
    type,
    amount: Number(tx.amount),
    date: tx.date.toISOString(),
    description: tx.description,
  })

  revalidateFinance()
  return tx
}

export async function addMoneyIn(input: MoneyInInput) {
  const session = await requireFinanceAccess()

  const parsed = moneyInSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }
  const d = parsed.data

  const tx = await record(
    d.isOwnerCapital ? 'OWNER_INVESTMENT' : 'MONEY_IN',
    {
      date: d.date,
      amount: d.amount,
      accountId: d.accountId,
      categoryId: d.isOwnerCapital ? null : (d.categoryId || null),
      counterparty: d.counterparty || null,
      clientId: d.clientId || null,
      projectId: d.projectId || null,
      paymentMethod: d.paymentMethod || null,
      reference: d.reference || null,
      description: d.description,
      notes: d.notes || null,
      attachmentUrl: d.attachmentUrl || null,
    },
    session.user.id,
    d.isOwnerCapital ? 'recorded owner investment' : 'recorded money in'
  )

  return { success: true as const, id: tx.id }
}

export async function addMoneyOut(input: MoneyOutInput) {
  const session = await requireFinanceAccess()

  const parsed = moneyOutSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }
  const d = parsed.data

  const tx = await record(
    d.isOwnerCapital ? 'OWNER_WITHDRAWAL' : 'MONEY_OUT',
    {
      date: d.date,
      amount: d.amount,
      accountId: d.accountId,
      categoryId: d.isOwnerCapital ? null : (d.categoryId || null),
      counterparty: d.counterparty || null,
      clientId: d.clientId || null,
      projectId: d.projectId || null,
      paymentMethod: d.paymentMethod || null,
      reference: d.reference || null,
      description: d.description,
      notes: d.notes || null,
      attachmentUrl: d.attachmentUrl || null,
    },
    session.user.id,
    d.isOwnerCapital ? 'recorded owner withdrawal' : 'recorded money out'
  )

  return { success: true as const, id: tx.id }
}

/**
 * One row, two accounts: it debits `from` and credits `to`. Because both
 * sides are ours the total balance doesn't move, and Profit & Loss ignores
 * the row entirely.
 */
export async function addTransfer(input: TransferInput) {
  const session = await requireFinanceAccess()

  const parsed = transferSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }
  const d = parsed.data

  const [from, to] = await Promise.all([
    db.financeAccount.findUnique({ where: { id: d.fromAccountId }, select: { name: true } }),
    db.financeAccount.findUnique({ where: { id: d.toAccountId }, select: { name: true } }),
  ])
  if (!from || !to) {
    return { success: false as const, error: 'Pick two accounts that exist, then try again.' }
  }

  const tx = await record(
    'TRANSFER',
    {
      date: d.date,
      amount: d.amount,
      accountId: d.fromAccountId,
      toAccountId: d.toAccountId,
      reference: d.reference || null,
      description: `Transfer from ${from.name} to ${to.name}`,
      notes: d.notes || null,
    },
    session.user.id,
    'recorded transfer'
  )

  return { success: true as const, id: tx.id }
}

/**
 * Cancels a transaction. The row stays, marked VOID with a reason and who
 * did it, and drops out of every balance — an audit trail, not a delete.
 */
export async function voidTransaction(input: VoidTransactionInput) {
  const session = await requireFinanceAccess()

  const parsed = voidTransactionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const existing = await db.financeTransaction.findUnique({
    where: { id: parsed.data.id },
    select: { status: true, amount: true, type: true, description: true },
  })
  if (!existing) {
    return { success: false as const, error: 'That transaction no longer exists — refresh the page.' }
  }
  if (existing.status === 'VOID') {
    return { success: false as const, error: 'That transaction is already cancelled.' }
  }

  await db.financeTransaction.update({
    where: { id: parsed.data.id },
    data: {
      status: 'VOID',
      voidedById: session.user.id,
      voidedAt: new Date(),
      voidReason: parsed.data.reason,
    },
  })

  await logActivity(session.user.id, 'cancelled finance entry', 'finance', parsed.data.id, {
    type: existing.type,
    amount: Number(existing.amount),
    description: existing.description,
    reason: parsed.data.reason,
  })

  revalidateFinance()
  return { success: true as const }
}

/**
 * Opening balance — what was in the account before the ledger started. It
 * counts towards the balance but never towards income.
 */
export async function setOpeningBalance(input: OpeningBalanceInput) {
  const session = await requireFinanceAccess()

  const parsed = openingBalanceSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const account = await db.financeAccount.update({
    where: { id: parsed.data.accountId },
    data: {
      openingBalance: parsed.data.openingBalance,
      openingDate: parsed.data.openingDate,
    },
  })

  await logActivity(session.user.id, 'set opening balance', 'finance-account', account.id, {
    account: account.name,
    openingBalance: parsed.data.openingBalance,
  })

  revalidateFinance()
  return { success: true as const }
}

export async function addFinanceCategory(input: FinanceCategoryInput) {
  await requireFinanceAccess()

  const parsed = financeCategorySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const existing = await db.financeCategory.findFirst({
    where: { kind: parsed.data.kind, name: parsed.data.name },
  })
  if (existing) {
    return { success: false as const, error: 'That category already exists.' }
  }

  await db.financeCategory.create({ data: parsed.data })
  revalidateFinance()
  return { success: true as const }
}
