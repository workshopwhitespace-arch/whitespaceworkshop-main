import { z } from 'zod'

/** Anyone may sign up; the account is created as a pending Employee. */
export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name is too long'),
    email: z.email('Enter a valid email').transform((value) => value.trim().toLowerCase()),
    password: z.string().min(8, 'Password must be at least 8 characters').max(200, 'Password is too long'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Both passwords must match',
    path: ['confirmPassword'],
  })

export type SignupInput = z.infer<typeof signupSchema>
