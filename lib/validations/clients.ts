'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { employeeClientScope, employeeProjectScope } from '@/lib/scope'
import {
  createClientSchema,
  updateClientSchema,
  type CreateClientInput,
  type UpdateClientInput,
} from '@/lib/validations/client'

export async function createClient(input: CreateClientInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = createClientSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const client = await db.client.create({
    data: {
      ...parsed.data,
      createdById: session.user.id,
    },
  })

  revalidatePath('/dashboard/clients')
  return { success: true as const, client }
}

/**
 * Deleting a client moves it to the recycle bin. Blocked while it still has
 * projects or quotations: those can't be deleted on their own, so removing
 * the client would leave work filed under something nobody can see.
 */
export async function deleteClient(clientId: string) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const client = await db.client.findFirst({
    where: { id: clientId, deletedAt: null },
    select: {
      name: true,
      _count: { select: { projects: true, quotations: true } },
    },
  })
  if (!client) {
    return { success: false as const, error: 'That client no longer exists — refresh the page.' }
  }

  const { projects, quotations } = client._count
  if (projects > 0 || quotations > 0) {
    const parts = [
      projects > 0 ? `${projects} project${projects === 1 ? '' : 's'}` : null,
      quotations > 0 ? `${quotations} quotation${quotations === 1 ? '' : 's'}` : null,
    ].filter(Boolean)
    return {
      success: false as const,
      error: `${client.name} still has ${parts.join(' and ')}. A client can only be deleted once nothing is filed under it.`,
    }
  }

  await db.client.update({
    where: { id: clientId },
    data: { deletedAt: new Date(), deletedById: session.user.id },
  })

  revalidatePath('/dashboard/clients')
  return { success: true as const }
}

export async function updateClient(input: UpdateClientInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = updateClientSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { id, ...data } = parsed.data
  const client = await db.client.update({ where: { id }, data })

  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${id}`)
  return { success: true as const, client }
}

/**
 * All clients for the Clients list screen. Employees only see clients they
 * have an assigned project under.
 */
export async function listClients() {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])
  const isEmployee = session.user.role === 'EMPLOYEE'

  return db.client.findMany({
    where: {
      deletedAt: null,
      ...(isEmployee ? employeeClientScope(session.user.id) : {}),
    },
    include: {
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Full client profile for the client detail screen. Admin/Super Admin get
 * all projects with their values. Employees only see this client at all if
 * they have an assigned project under it, and never see project values.
 */
export async function getClientDetail(clientId: string) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])
  const isEmployee = session.user.role === 'EMPLOYEE'

  const canSeeMoney = session.user.role === 'SUPER_ADMIN'

  const client = await db.client.findFirst({ where: { id: clientId, deletedAt: null } })
  if (!client) return null

  const projects = await db.project.findMany({
    where: {
      clientId,
      ...(isEmployee ? employeeProjectScope(session.user.id) : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  if (isEmployee && projects.length === 0) {
    return null
  }

  return {
    ...client,
    // Project values are withheld from Employees, not just hidden in the UI.
    // Project money is Super Admin only, matching the Projects screens.
    projects: canSeeMoney ? projects : projects.map((p) => ({ ...p, projectValue: null })),
    canSeeMoney,
  }
}