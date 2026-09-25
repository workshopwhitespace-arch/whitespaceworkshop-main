'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

/**
 * Everything the dashboard widgets need, in one round trip.
 *
 * Role scoping follows the same rules as the rest of the app: an Employee
 * only ever sees projects they're assigned to and tasks assigned to them,
 * and the activity widget is withheld entirely. Project values are Super
 * Admin only, matching the Projects screens.
 * Decimals are converted to numbers here because Prisma's Decimal
 * instances can't cross the server/client boundary.
 */
export async function getDashboardData() {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])
  const userId = session.user.id
  const isEmployee = session.user.role === 'EMPLOYEE'

  // Projects are shared with everyone; only tasks stay personal.
  const projectScope = {}
  // Deleted tasks sit in the recycle bin and count for nothing.
  const taskScope = isEmployee
    ? { deletedAt: null, assignees: { some: { userId } } }
    : { deletedAt: null }

  const now = new Date()
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    activeProjects,
    openTasks,
    overdueTasks,
    openTodos,
    myTasks,
    recentProjects,
    upcomingDeadlines,
    recentLeads,
  ] = await Promise.all([
    db.project.count({
      where: { ...projectScope, status: { not: 'DELIVERED' } },
    }),
    db.task.count({
      where: { ...taskScope, status: { not: 'DONE' } },
    }),
    db.task.count({
      where: { ...taskScope, status: { not: 'DONE' }, dueDate: { lt: now } },
    }),
    db.todo.count({ where: { userId, isDone: false, deletedAt: null } }),

    db.task.findMany({
      where: { deletedAt: null, assignees: { some: { userId } }, status: { not: 'DONE' } },
      include: { project: { select: { id: true, title: true } } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 6,
    }),

    db.project.findMany({
      where: projectScope,
      include: {
        client: { select: { name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),

    db.project.findMany({
      where: {
        ...projectScope,
        status: { not: 'DELIVERED' },
        deadline: { gte: now, lte: inSevenDays },
      },
      select: { id: true, title: true, deadline: true, status: true },
      orderBy: { deadline: 'asc' },
      take: 5,
    }),

    db.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        service: true,
        status: true,
        budget: true,
        createdAt: true,
      },
    }),
  ])

  // Done-task counts per project, so the project widget can show progress.
  const doneByProject = await db.task.groupBy({
    by: ['projectId'],
    where: { projectId: { in: recentProjects.map((p) => p.id) }, status: 'DONE', deletedAt: null },
    _count: { _all: true },
  })
  const doneMap = new Map(doneByProject.map((r) => [r.projectId, r._count._all]))

  // Activity is Super Admin only, matching the Activity Log screen.
  let recentActivity:
    | { id: string; action: string; entityType: string; createdAt: Date; userName: string }[]
    | null = null

  if (session.user.role === 'SUPER_ADMIN') {
    const logs = await db.activityLog.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    })
    recentActivity = logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      createdAt: l.createdAt,
      userName: l.user.name,
    }))
  }

  return {
    role: session.user.role,
    userName: session.user.name ?? 'there',
    counts: { activeProjects, openTasks, overdueTasks, openTodos },
    myTasks: myTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      progressPercent: t.progressPercent,
      projectId: t.project.id,
      projectTitle: t.project.title,
    })),
    recentProjects: recentProjects.map((p) => ({
      id: p.id,
      title: p.title,
      type: p.type,
      status: p.status,
      clientName: p.client.name,
      deadline: p.deadline,
      totalTasks: p._count.tasks,
      doneTasks: doneMap.get(p.id) ?? 0,
      // Super Admin only, matching the Projects screens.
      projectValue:
        session.user.role !== 'SUPER_ADMIN' || p.projectValue === null
          ? null
          : Number(p.projectValue),
    })),
    upcomingDeadlines,
    recentLeads: recentLeads.map((l) => ({
      id: l.id,
      name: l.name,
      service: l.service,
      status: l.status,
      createdAt: l.createdAt,
      budget: l.budget === null ? null : Number(l.budget),
    })),
    recentActivity,
  }
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>
