'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createTodoSchema, type CreateTodoInput } from '@/lib/validations/todo'

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] as const

/**
 * The signed-in user's own todos. Open items come first, nearest deadline on
 * top; finished ones sink to the bottom in the same order.
 */
export async function listTodos() {
  const session = await requireRole([...ALL_ROLES])

  return db.todo.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: [{ isDone: 'asc' }, { deadline: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function createTodo(input: CreateTodoInput) {
  const session = await requireRole([...ALL_ROLES])

  const parsed = createTodoSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  // createdAt is filled in by the database — the client never sends it.
  const todo = await db.todo.create({
    data: { ...parsed.data, userId: session.user.id },
  })

  revalidatePath('/dashboard/todos')
  return { success: true as const, todo }
}

/**
 * Scoped by userId as well as id, so one user can never touch another's
 * list — a foreign or deleted id simply matches nothing.
 */
export async function setTodoDone(todoId: string, isDone: boolean) {
  const session = await requireRole([...ALL_ROLES])

  const { count } = await db.todo.updateMany({
    where: { id: todoId, userId: session.user.id, deletedAt: null },
    data: { isDone, completedAt: isDone ? new Date() : null },
  })
  if (count === 0) {
    return { success: false as const, error: 'That todo no longer exists — refresh the page.' }
  }

  revalidatePath('/dashboard/todos')
  return { success: true as const }
}

/** Moves the todo to the recycle bin; a Super Admin can restore it. */
export async function deleteTodo(todoId: string) {
  const session = await requireRole([...ALL_ROLES])

  const { count } = await db.todo.updateMany({
    where: { id: todoId, userId: session.user.id, deletedAt: null },
    data: { deletedAt: new Date(), deletedById: session.user.id },
  })
  if (count === 0) {
    return { success: false as const, error: 'That todo has already been deleted.' }
  }

  revalidatePath('/dashboard/todos')
  return { success: true as const }
}
