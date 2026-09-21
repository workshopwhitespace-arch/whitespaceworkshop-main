'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

/**
 * The recycle bin: everything anyone has deleted, from every user.
 *
 * Deleting sets `deletedAt` rather than removing the row (see deleteTask and
 * deleteTodo), so the whole app hides it while a Super Admin can put it back
 * — or clear it out for good, which is the only real delete in the app.
 *
 * Super Admin only, in every function here.
 */

export type DeletedKind = 'task' | 'todo' | 'client'

export type DeletedItem = {
  kind: DeletedKind
  id: string
  title: string
  /** Where it came from — a task's project, a todo's owner. */
  context: string
  deletedAt: Date
  deletedByName: string
  ownerNames: string
}

export async function listDeletedItems(): Promise<DeletedItem[]> {
  await requireRole(['SUPER_ADMIN'])

  const [tasks, todos, clients] = await Promise.all([
    db.task.findMany({
      where: { deletedAt: { not: null } },
      include: {
        project: { select: { title: true } },
        deletedBy: { select: { name: true } },
        assignees: { include: { user: { select: { name: true } } } },
      },
      orderBy: { deletedAt: 'desc' },
    }),
    db.todo.findMany({
      where: { deletedAt: { not: null } },
      include: {
        user: { select: { name: true } },
        deletedBy: { select: { name: true } },
      },
      orderBy: { deletedAt: 'desc' },
    }),
    db.client.findMany({
      where: { deletedAt: { not: null } },
      include: {
        createdBy: { select: { name: true } },
        deletedBy: { select: { name: true } },
      },
      orderBy: { deletedAt: 'desc' },
    }),
  ])

  const items: DeletedItem[] = [
    ...tasks.map((task) => ({
      kind: 'task' as const,
      id: task.id,
      title: task.title,
      context: task.project.title,
      deletedAt: task.deletedAt!,
      deletedByName: task.deletedBy?.name ?? 'Someone',
      ownerNames:
        task.assignees.length === 0
          ? 'Unassigned'
          : task.assignees.map((a) => a.user.name).join(', '),
    })),
    ...clients.map((client) => ({
      kind: 'client' as const,
      id: client.id,
      title: client.name,
      context: client.companyName ?? 'Client',
      deletedAt: client.deletedAt!,
      deletedByName: client.deletedBy?.name ?? 'Someone',
      ownerNames: `Added by ${client.createdBy.name}`,
    })),
    ...todos.map((todo) => ({
      kind: 'todo' as const,
      id: todo.id,
      title: todo.name,
      context: 'Personal todo',
      deletedAt: todo.deletedAt!,
      deletedByName: todo.deletedBy?.name ?? 'Someone',
      ownerNames: todo.user.name,
    })),
  ]

  return items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime())
}

/** Puts an item back where it was. */
export async function restoreItem(kind: DeletedKind, id: string) {
  await requireRole(['SUPER_ADMIN'])

  const data = { deletedAt: null, deletedById: null }
  const where = { id, deletedAt: { not: null } }
  const { count } =
    kind === 'task'
      ? await db.task.updateMany({ where, data })
      : kind === 'todo'
        ? await db.todo.updateMany({ where, data })
        : await db.client.updateMany({ where, data })

  if (count === 0) {
    return { success: false as const, error: 'That item is no longer in the recycle bin.' }
  }

  revalidateAfterChange(kind)
  return { success: true as const }
}

/**
 * Deletes for good. Only reachable from the recycle bin, and only for items
 * already deleted — a live record can never be destroyed by this.
 */
export async function purgeItem(kind: DeletedKind, id: string) {
  await requireRole(['SUPER_ADMIN'])

  const where = { id, deletedAt: { not: null } }
  const { count } =
    kind === 'task'
      ? await db.task.deleteMany({ where })
      : kind === 'todo'
        ? await db.todo.deleteMany({ where })
        : await db.client.deleteMany({ where })

  if (count === 0) {
    return { success: false as const, error: 'That item is no longer in the recycle bin.' }
  }

  revalidateAfterChange(kind)
  return { success: true as const }
}

/** Empties the bin — every deleted item, from every user, gone for good. */
export async function emptyRecycleBin() {
  await requireRole(['SUPER_ADMIN'])

  const [tasks, todos, clients] = await db.$transaction([
    db.task.deleteMany({ where: { deletedAt: { not: null } } }),
    db.todo.deleteMany({ where: { deletedAt: { not: null } } }),
    db.client.deleteMany({ where: { deletedAt: { not: null } } }),
  ])

  for (const kind of ['task', 'todo', 'client'] as const) revalidateAfterChange(kind)
  return { success: true as const, removed: tasks.count + todos.count + clients.count }
}

const PATHS: Record<DeletedKind, string> = {
  task: '/dashboard/tasks',
  todo: '/dashboard/todos',
  client: '/dashboard/clients',
}

function revalidateAfterChange(kind: DeletedKind) {
  revalidatePath('/dashboard/recycle-bin')
  revalidatePath(PATHS[kind])
  if (kind === 'task') revalidatePath('/dashboard/projects')
}
