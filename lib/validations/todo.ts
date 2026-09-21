import { z } from 'zod'

export const createTodoSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(191, 'Name is too long'),
  description: z.string().max(2000, 'Description is too long').optional(),
  deadline: z.coerce.date({ error: 'Choose a deadline' }),
})

export type CreateTodoInput = z.infer<typeof createTodoSchema>
