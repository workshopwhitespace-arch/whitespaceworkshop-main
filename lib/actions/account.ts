'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import {
  changePasswordSchema,
  resetPasswordSchema,
  type ChangePasswordInput,
  type ResetPasswordInput,
} from '@/lib/validations/account'

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] as const

/**
 * Change your own password. Always acts on the signed-in user — the id is
 * taken from the session, never from the form — and only after the current
 * password is proven, so an unattended screen can't be used to take over
 * the account.
 */
export async function changeOwnPassword(input: ChangePasswordInput) {
  const session = await requireRole([...ALL_ROLES])

  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })
  if (!user) {
    return { success: false as const, error: 'Your account no longer exists — sign in again.' }
  }

  const correct = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!correct) {
    return { success: false as const, error: 'That current password isn’t right.' }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  })

  return { success: true as const }
}

/**
 * For someone who has genuinely forgotten theirs: a Super Admin sets a
 * temporary password and passes it on. The current password isn't needed —
 * that's the point — so it stays Super Admin only.
 */
export async function resetUserPassword(input: ResetPasswordInput) {
  await requireRole(['SUPER_ADMIN'])

  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const target = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, name: true },
  })
  if (!target) {
    return { success: false as const, error: 'That user no longer exists — refresh the page.' }
  }

  await db.user.update({
    where: { id: target.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  })

  revalidatePath('/dashboard/team')
  return { success: true as const, name: target.name }
}
