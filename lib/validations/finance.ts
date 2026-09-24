import { z } from 'zod'

const amount = z
  .number({ error: 'Enter an amount' })
  .positive('Amount must be more than zero')
  .max(99_999_999_99, 'That amount is too large')

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} is too long`).optional()

/** Money the business received. */
export const moneyInSchema = z.object({
  date: z.coerce.date({ error: 'Choose a date' }),
  amount,
  accountId: z.string().min(1, 'Choose which account it was received into'),
  categoryId: z.string().optional(),
  /** Owner capital is recorded here too, but never counts as income. */
  isOwnerCapital: z.boolean().optional().default(false),
  counterparty: optionalText(160, 'Received from'),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  paymentMethod: optionalText(60, 'Payment type'),
  reference: optionalText(120, 'Reference'),
  description: z.string().trim().min(2, 'Say what this payment was for').max(200, 'Description is too long'),
  notes: optionalText(2000, 'Notes'),
  attachmentUrl: optionalText(500, 'Attachment link'),
})

/** Money the business paid out. */
export const moneyOutSchema = z.object({
  date: z.coerce.date({ error: 'Choose a date' }),
  amount,
  accountId: z.string().min(1, 'Choose which account it was paid from'),
  categoryId: z.string().optional(),
  /** Owner withdrawal — money out of the account, but not a business cost. */
  isOwnerCapital: z.boolean().optional().default(false),
  counterparty: optionalText(160, 'Vendor or payee'),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  paymentMethod: optionalText(60, 'Payment method'),
  reference: optionalText(120, 'Reference'),
  description: z.string().trim().min(2, 'Say what this expense was for').max(200, 'Description is too long'),
  notes: optionalText(2000, 'Notes'),
  attachmentUrl: optionalText(500, 'Attachment link'),
})

/** Moving money between our own accounts — never income or expense. */
export const transferSchema = z
  .object({
    date: z.coerce.date({ error: 'Choose a date' }),
    amount,
    fromAccountId: z.string().min(1, 'Choose the account the money leaves'),
    toAccountId: z.string().min(1, 'Choose the account the money lands in'),
    reference: optionalText(120, 'Reference'),
    notes: optionalText(2000, 'Notes'),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'Choose two different accounts — a transfer has to go somewhere else',
    path: ['toAccountId'],
  })

export const voidTransactionSchema = z.object({
  id: z.string().min(1),
  reason: z.string().trim().min(3, 'Say why this is being cancelled').max(200, 'Reason is too long'),
})

export const openingBalanceSchema = z.object({
  accountId: z.string().min(1),
  openingBalance: z.number().min(0, 'Opening balance cannot be negative'),
  openingDate: z.coerce.date({ error: 'Choose the opening date' }),
})

export const financeCategorySchema = z.object({
  kind: z.enum(['INCOME', 'EXPENSE']),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
})

export type MoneyInInput = z.input<typeof moneyInSchema>
export type MoneyOutInput = z.input<typeof moneyOutSchema>
export type TransferInput = z.input<typeof transferSchema>
export type VoidTransactionInput = z.infer<typeof voidTransactionSchema>
export type OpeningBalanceInput = z.infer<typeof openingBalanceSchema>
export type FinanceCategoryInput = z.infer<typeof financeCategorySchema>
