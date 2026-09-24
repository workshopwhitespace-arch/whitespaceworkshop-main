import { getFinanceFormOptions, listTransactions } from '@/lib/actions/finance'
import { EntryScreen } from '@/components/modules/finance/entry-screen'

export default async function MoneyOutPage() {
  const [rows, options] = await Promise.all([
    listTransactions({ types: ['MONEY_OUT', 'OWNER_WITHDRAWAL'] }),
    getFinanceFormOptions(),
  ])

  return (
    <EntryScreen
      mode="out"
      rows={rows}
      options={options}
      buttonLabel="Add expense"
      emptyMessage="No expenses recorded yet"
      note="Money the studio actually paid out. The account it comes from goes down, and so does the total balance."
    />
  )
}
