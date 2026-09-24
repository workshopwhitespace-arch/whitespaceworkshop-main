import { getFinanceFormOptions, listTransactions } from '@/lib/actions/finance'
import { EntryScreen } from '@/components/modules/finance/entry-screen'

export default async function MoneyInPage() {
  const [rows, options] = await Promise.all([
    listTransactions({ types: ['MONEY_IN', 'OWNER_INVESTMENT'] }),
    getFinanceFormOptions(),
  ])

  return (
    <EntryScreen
      mode="in"
      rows={rows}
      options={options}
      buttonLabel="Add money in"
      emptyMessage="No money recorded as received yet"
      note="Money the studio actually received. The account it lands in goes up, and so does the total balance."
    />
  )
}
