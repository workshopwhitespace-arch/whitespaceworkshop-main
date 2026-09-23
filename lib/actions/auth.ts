'use server'

import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signupSchema, type SignupInput } from '@/lib/validations/auth'
import { notifyUsers, superAdminIds } from '@/lib/notify'

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

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'EMPLOYEE',
      status: 'pending',
    },
  })

  await notifyUsers(
    await superAdminIds(),
    `${name} signed up (${email}) and is waiting for approval on Team & Roles.`,
    { type: 'User', id: user.id }
  )

  return { success: true as const }
}
