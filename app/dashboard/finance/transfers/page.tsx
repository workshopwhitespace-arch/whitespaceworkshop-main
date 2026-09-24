import { getFinanceFormOptions, listTransactions } from '@/lib/actions/finance'
import { EntryScreen } from '@/components/modules/finance/entry-screen'

export default async function TransfersPage() {
  const [rows, options] = await Promise.all([
    listTransactions({ types: ['TRANSFER'] }),
    getFinanceFormOptions(),
  ])

  return (
    <EntryScreen
      mode="transfer"
      rows={rows}
      options={options}
      buttonLabel="New transfer"
      emptyMessage="No transfers between your accounts yet"
      note="Moving your own money between accounts — bank to cash, cash to bank, or between banks. The total balance never changes, and it never counts as income or expense."
    />
  )
}
