'use server'

import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signupSchema, type SignupInput } from '@/lib/validations/auth'

/**
 * Public sign-up — the one action with no requireRole in front of it.
 *
 * Everyone starts as a pending Employee: they can't sign in until a Super
 * Admin activates them on the Team page, so a stranger who finds the page
 * gets an account that sees nothing. Roles are never taken from this input.
 */
export async function signup(input: SignupInput) {
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { name, email, password } = parsed.data

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    return {
      success: false as const,
      error: 'An account with this email already exists — try signing in instead.',
    }
  }

  await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'EMPLOYEE',
      status: 'pending',
    },
  })

  return { success: true as const }
}
