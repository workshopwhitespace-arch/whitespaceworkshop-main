'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole, getCurrentUser } from '@/lib/auth'
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/lib/validations/user'

export async function createUser(input: CreateUserInput) {
  await requireRole(['SUPER_ADMIN'])

  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  })
  if (existing) {
    return { success: false as const, error: 'A user with this email already exists' }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)

  // Created by a Super Admin, so it's active immediately — unlike sign-up.
  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      status: 'active',
    },
  })

  revalidatePath('/dashboard/team')
  return {
    success: true as const,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  }
}

/**
 * Role and status changes, including approving a pending sign-up
 * (status: 'active'). Super Admins only, with two locks: nobody changes
 * their own role or status, and the last active Super Admin can't be
 * demoted or switched off — either would leave the studio with no one able
 * to manage roles.
 */
export async function updateUser(input: UpdateUserInput) {
  const session = await requireRole(['SUPER_ADMIN'])

  const parsed = updateUserSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { id, ...data } = parsed.data

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true, status: true },
  })
  if (!target) {
    return { success: false as const, error: 'That user no longer exists — refresh the page.' }
  }

  const changingRole = data.role !== undefined && data.role !== target.role
  const changingStatus = data.status !== undefined && data.status !== target.status

  if (id === session.user.id && (changingRole || changingStatus)) {
    return {
      success: false as const,
      error: 'You can’t change your own role or status — ask another Super Admin.',
    }
  }

  const losesSuperAdmin =
    target.role === 'SUPER_ADMIN' &&
    target.status === 'active' &&
    ((changingRole && data.role !== 'SUPER_ADMIN') || (changingStatus && data.status !== 'active'))

  if (losesSuperAdmin) {
    const activeSuperAdmins = await db.user.count({
      where: { role: 'SUPER_ADMIN', status: 'active' },
    })
    if (activeSuperAdmins <= 1) {
      return {
        success: false as const,
        error: 'This is the last active Super Admin — promote someone else first.',
      }
    }
  }

  const user = await db.user.update({ where: { id }, data })

  revalidatePath('/dashboard/team')
  return {
    success: true as const,
    user: { id: user.id, name: user.name, role: user.role, status: user.status },
  }
}

export async function deactivateUser(userId: string) {
  return updateUser({ id: userId, status: 'inactive' })
}

export async function listUsers() {
  await requireRole(['SUPER_ADMIN'])

  return db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      _count: { select: { projectAssignments: true, taskAssignments: true } },
    },
    // Sign-ups waiting for approval first, then newest.
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function getSessionUser() {
  return getCurrentUser()
}