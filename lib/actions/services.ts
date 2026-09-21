'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import {
  createServiceSchema,
  updateServiceSchema,
  type CreateServiceInput,
  type UpdateServiceInput,
} from '@/lib/validations/service'

/**
 * Everyone can read the catalogue — Employees pick services on their own
 * tasks — but only Admins and above can add, rename or retire one.
 */
export async function listServices(options?: { activeOnly?: boolean }) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  return db.service.findMany({
    where: options?.activeOnly ? { isActive: true } : {},
    include: { _count: { select: { tasks: true, quotationItems: true } } },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  })
}

export async function createService(input: CreateServiceInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const parsed = createServiceSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const service = await db.service.create({
    data: { ...parsed.data, createdById: session.user.id },
  })

  revalidatePath('/dashboard/services')
  return { success: true as const, service }
}

/**
 * Also used to retire and restore a service (isActive). There is no delete:
 * tasks and quotation lines keep pointing at a retired service, so history
 * still reads correctly.
 */
export async function updateService(input: UpdateServiceInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const parsed = updateServiceSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { id, ...data } = parsed.data

  try {
    const service = await db.service.update({ where: { id }, data })

    revalidatePath('/dashboard/services')
    return { success: true as const, service }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return { success: false as const, error: 'That service no longer exists — refresh the page.' }
    }
    throw error
  }
}
