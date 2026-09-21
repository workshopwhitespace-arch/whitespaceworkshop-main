import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listActivityLog } from '@/lib/actions/activity'
import { TaskActivityList } from '@/components/modules/activity/task-activity-list'

/** The shape logActivity writes for a task move; anything else is skipped. */
type MoveMetadata = {
  title?: string
  from?: string
  to?: string
  projectId?: string
  projectTitle?: string
}

export default async function ActivityPage() {
  const session = await auth()
  // proxy.ts blocks other roles; this guards the data too.
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const entries = await listActivityLog({ entityType: 'task', action: 'moved task' })

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#26251F]">Activity Log</h1>
        <p className="mt-0.5 text-sm text-[#8A8778]">
          Every task move: who changed it, from which stage to which, and when. Only Super
          Admins see this page.
        </p>
      </div>

      <TaskActivityList
        entries={entries.map((entry) => {
          const meta = (entry.metadata ?? {}) as MoveMetadata
          return {
            id: entry.id,
            taskId: entry.entityId,
            taskTitle: meta.title ?? 'A task',
            from: meta.from ?? null,
            to: meta.to ?? null,
            projectId: meta.projectId ?? null,
            projectTitle: meta.projectTitle ?? null,
            userName: entry.user.name,
            userRole: entry.user.role,
            createdAt: entry.createdAt,
          }
        })}
      />
    </div>
  )
}
