import { z } from 'zod'

export const createServiceSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name is too long'),
  description: z.string().max(2000, 'Description is too long').optional(),
})

export const updateServiceSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name is too long').optional(),
  description: z.string().max(2000, 'Description is too long').optional(),
  isActive: z.boolean().optional(),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
