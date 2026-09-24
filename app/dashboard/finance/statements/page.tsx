import { getFinanceFormOptions } from '@/lib/actions/finance'
import { buildStatement, dateRangeFor } from '@/lib/finance/statement'
import { requireRole } from '@/lib/auth'
import { StatementView } from '@/components/modules/finance/statement-view'
import type { FinanceTxType } from '@prisma/client'

type Search = {
  account?: string
  range?: string
  from?: string
  to?: string
  type?: string
  category?: string
  client?: string
  project?: string
  method?: string
  q?: string
}

const TYPES = ['MONEY_IN', 'MONEY_OUT', 'TRANSFER', 'OWNER_INVESTMENT', 'OWNER_WITHDRAWAL']

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  await requireRole(['SUPER_ADMIN'])
  const params = await searchParams

  // A custom range wins; otherwise the named period, defaulting to this month.
  const preset = params.range ?? (params.from || params.to ? 'custom' : 'month')
  const named = preset === 'custom' ? {} : dateRangeFor(preset)
  const from = params.from ? new Date(`${params.from}T00:00:00`) : named.from
  const to = params.to ? new Date(`${params.to}T23:59:59.999`) : named.to

  const [options, statement] = await Promise.all([
    getFinanceFormOptions(),
    buildStatement({
      accountId: params.account || undefined,
      from,
      to,
      type: TYPES.includes(params.type ?? '') ? (params.type as FinanceTxType) : undefined,
      categoryId: params.category || undefined,
      clientId: params.client || undefined,
      projectId: params.project || undefined,
      paymentMethod: params.method || undefined,
      search: params.q || undefined,
    }),
  ])

  return (
    <StatementView
      statement={{
        ...statement,
        rows: statement.rows.map((r) => ({ ...r, date: r.date.toISOString() })),
      }}
      options={options}
      filters={{
        account: params.account ?? '',
        range: preset,
        from: params.from ?? '',
        to: params.to ?? '',
        type: params.type ?? '',
        category: params.category ?? '',
        client: params.client ?? '',
        project: params.project ?? '',
        method: params.method ?? '',
        q: params.q ?? '',
      }}
    />
  )
}
