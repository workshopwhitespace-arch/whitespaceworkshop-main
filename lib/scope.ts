import type { Prisma } from '@prisma/client'

/**
 * What an Employee is allowed to see: projects they're an assignee of, plus
 * any project they have a task assigned on. Being given a task is enough —
 * without the second half, a task assigned to someone who isn't on the
 * project is invisible to them on Tasks, Projects and Clients alike.
 *
 * Every Employee-scoped query uses this, so the three screens agree.
 */
export function employeeProjectScope(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      { assignees: { some: { userId } } },
      { tasks: { some: { deletedAt: null, assignees: { some: { userId } } } } },
    ],
  }
}

/** The same rule, for filtering Clients by the projects under them. */
export function employeeClientScope(userId: string): Prisma.ClientWhereInput {
  return { projects: { some: employeeProjectScope(userId) } }
}
