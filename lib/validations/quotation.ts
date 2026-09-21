import { z } from 'zod'

const projectTypeEnum = z.enum(['INTERIOR', 'BRANDING', 'SOCIAL', 'WEB'])

const quotationItemSchema = z.object({
  serviceId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  rate: z.number().nonnegative('Rate cannot be negative'),
})

export const createQuotationSchema = z.object({
  /** Who the quotation is for — free text, printed on the PDF. */
  clientName: z
    .string()
    .trim()
    .min(2, 'Enter the name this quotation is for')
    .max(120, 'Name is too long (120 characters max)'),
  /** Who referred this enquiry. Empty means it came in as a direct client. */
  reference: z.string().max(120, 'Reference is too long').optional(),
  terms: z.string().optional(),
  items: z.array(quotationItemSchema).min(1, 'Add at least one line item'),
})

/**
 * Editing re-submits the whole quotation. Discount and the printed date are
 * edit-only: a new quotation always starts at no discount, dated today.
 */
export const updateQuotationSchema = createQuotationSchema.extend({
  id: z.string(),
  discount: z.number().nonnegative('Discount cannot be negative').default(0),
  quotationDate: z.coerce.date({ error: 'Choose a quotation date' }),
})

export const addQuotationItemSchema = z.object({
  quotationId: z.string(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  rate: z.number().nonnegative('Rate cannot be negative'),
})

export const updateQuotationItemSchema = z.object({
  itemId: z.string(),
  description: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  rate: z.number().nonnegative().optional(),
})

export const acceptQuotationSchema = z.object({
  quotationId: z.string(),
  /** The project needs a real client — one created by hand on the Clients page. */
  clientId: z.string().min(1, 'Choose the client this project belongs to'),
  projectTitle: z.string().min(2, 'Project title is required'),
  projectType: projectTypeEnum,
  deadline: z.coerce.date().optional(),
  /** Opt-in, matching createProject — no tasks appear unless asked for. */
  seedTasks: z.boolean().optional().default(false),
})

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>
export type AddQuotationItemInput = z.infer<typeof addQuotationItemSchema>
export type UpdateQuotationItemInput = z.infer<typeof updateQuotationItemSchema>
export type AcceptQuotationInput = z.infer<typeof acceptQuotationSchema>
