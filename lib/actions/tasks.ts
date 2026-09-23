'use server'

import { revalidatePath } from 'next/cache'
import { Prisma, type ProjectType } from '@prisma/client'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { TASK_TEMPLATES } from '@/lib/task-templates'
import { logActivity } from '@/lib/actions/activity'
import { notifyUsers } from '@/lib/notify'
import {
  createTaskSchema,
  updateTaskSchema,
  setTaskAssigneesSchema,
  updateTaskStatusSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
  type SetTaskAssigneesInput,
  type UpdateTaskStatusInput,
} from '@/lib/validations/task'

/**
 * Prisma throws P2025 when an update targets a row that no longer exists —
 * a board left open after someone else deleted the task, a second tab, a
 * stale refresh. That's an ordinary race, not a crash, so it comes back as
 * a normal failed result the UI can show inline.
 */
/** Plain-English stage names for notification text. */
const STAGE_LABEL: Record<string, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  REVIEW: 'Review',
  DONE: 'Done',
}

function missingRecord(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
  )
}

export async function createTask(input: CreateTaskInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = createTaskSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { assigneeIds = [], ...data } = parsed.data
  const task = await db.task.create({
    data: {
      ...data,
      assignees: { create: [...new Set(assigneeIds)].map((userId) => ({ userId })) },
    },
  })

  await notifyUsers(
    assigneeIds.filter((userId) => userId !== session.user.id),
    `${session.user.name} assigned you the task “${task.title}”.`,
    { type: 'Task', id: task.id }
  )

  revalidatePath('/dashboard/tasks')
  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`)
  return { success: true as const, task }
}

export async function updateTask(input: UpdateTaskInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = updateTaskSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { id, ...data } = parsed.data

  try {
    const task = await db.task.update({ where: { id }, data })

    revalidatePath('/dashboard/tasks')
    return { success: true as const, task }
  } catch (error) {
    if (missingRecord(error)) {
      return {
        success: false as const,
        error: 'That task no longer exists — refresh to see the current board.',
      }
    }
    throw error
  }
}

/**
 * Moving a task between phases. Every move is written to the activity log —
 * who moved it, from which phase to which, and when — which is what the
 * Activity Log screen reads.
 */
export async function updateTaskStatus(input: UpdateTaskStatusInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = updateTaskStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const before = await db.task.findUnique({
    where: { id: parsed.data.id },
    select: {
      status: true,
      project: { select: { id: true, title: true } },
      assignees: { select: { userId: true } },
    },
  })

  try {
    const task = await db.task.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    })

    // A drag that lands back where it started isn't a move worth recording.
    if (before && before.status !== task.status) {
      await logActivity(session.user.id, 'moved task', 'task', task.id, {
        title: task.title,
        from: before.status,
        to: task.status,
        projectId: before.project.id,
        projectTitle: before.project.title,
      })

      await notifyUsers(
        before.assignees.map((a) => a.userId).filter((userId) => userId !== session.user.id),
        `${session.user.name} moved “${task.title}” to ${STAGE_LABEL[task.status] ?? task.status}.`,
        { type: 'Task', id: task.id }
      )
    }

    revalidatePath('/dashboard/tasks')
    return { success: true as const, task }
  } catch (error) {
    if (missingRecord(error)) {
      return {
        success: false as const,
        error: 'That task no longer exists — refresh to see the current board.',
      }
    }
    throw error
  }
}

/**
 * Sets who is working on a task — anyone on the team can, and a task can be
 * shared between several people. The list replaces whoever was on it, so one
 * call adds, removes and clears.
 */
export async function setTaskAssignees(input: SetTaskAssigneesInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = setTaskAssigneesSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { id, assigneeIds } = parsed.data
  const keep = [...new Set(assigneeIds)]

  const task = await db.task.findUnique({
    where: { id },
    select: { id: true, title: true, assignees: { select: { userId: true } } },
  })
  if (!task) {
    return {
      success: false as const,
      error: 'That task no longer exists — refresh to see the current board.',
    }
  }

  const before = task.assignees.map((a) => a.userId)
  const added = keep.filter((userId) => !before.includes(userId) && userId !== session.user.id)

  await db.$transaction([
    // notIn [] matches nothing in MySQL, so guard the empty case.
    keep.length > 0
      ? db.taskAssignee.deleteMany({ where: { taskId: id, userId: { notIn: keep } } })
      : db.taskAssignee.deleteMany({ where: { taskId: id } }),
    db.taskAssignee.createMany({
      data: keep.map((userId) => ({ taskId: id, userId })),
      skipDuplicates: true,
    }),
  ])

  await notifyUsers(added, `${session.user.name} assigned you the task “${task.title}”.`, {
    type: 'Task',
    id: task.id,
  })

  revalidatePath('/dashboard/tasks')
  return { success: true as const }
}

export async function listTasks(filters?: { projectId?: string; assigneeId?: string }) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])
  const isEmployee = session.user.role === 'EMPLOYEE'

  return db.task.findMany({
    where: {
      deletedAt: null,
      ...(filters?.projectId ? { projectId: filters.projectId } : {}),
      ...(filters?.assigneeId ? { assignees: { some: { userId: filters.assigneeId } } } : {}),
      ...(isEmployee ? { assignees: { some: { userId: session.user.id } } } : {}),
    },
    include: {
      project: { select: { id: true, title: true, type: true } },
      assignees: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { dueDate: 'asc' },
  })
}

/**
 * Called once, right after a Project is created — from createProject
 * directly, or from acceptQuotation when a quotation converts into a
 * project — to seed its task list from the matching template.
 */
export async function seedTasksForProject(projectId: string, type: ProjectType) {
  const template = TASK_TEMPLATES[type]

  await db.task.createMany({
    data: template.map((title) => ({
      projectId,
      title,
      status: 'TODO' as const,
    })),
  })
}
/**
 * A single task with everything its detail screen shows.
 *
 * Scoping mirrors what an Employee can already reach elsewhere: their own
 * assigned tasks, plus any task on a project they're an assignee of — which
 * is exactly the set the project detail screen already lists for them.
 * Anything else returns null so the page 404s.
 */
export async function getTaskDetail(taskId: string) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])
  const isEmployee = session.user.role === 'EMPLOYEE'

  const task = await db.task.findFirst({
    where: { id: taskId, deletedAt: null },
    include: {
      assignees: { include: { user: { select: { id: true, name: true } } } },
      project: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          deadline: true,
          client: { select: { id: true, name: true } },
          assignees: { select: { userId: true } },
        },
      },
    },
  })

  if (!task) return null

  if (isEmployee) {
    const isAssignee = task.assignees.some((a) => a.userId === session.user.id)
    const onProject = task.project.assignees.some((a) => a.userId === session.user.id)
    if (!isAssignee && !onProject) return null
  }

  return task
}

/**
 * Deleting a task moves it to the recycle bin (deletedAt) rather than
 * removing the row — a Super Admin can restore it or delete it for good.
 * Admins and above only; Team members drive their own tasks but can't
 * remove them.
 */
export async function deleteTask(taskId: string) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN'])

  try {
    const task = await db.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date(), deletedById: session.user.id },
    })

    revalidatePath('/dashboard/tasks')
    revalidatePath(`/dashboard/projects/${task.projectId}`)
    return { success: true as const, task }
  } catch (error) {
    if (missingRecord(error)) {
      return {
        success: false as const,
        error: 'That task has already been deleted.',
      }
    }
    throw error
  }
}
