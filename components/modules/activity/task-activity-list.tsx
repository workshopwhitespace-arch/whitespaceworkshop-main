'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, History, Search } from 'lucide-react'
import type { Role } from '@prisma/client'
import { formatDateTime } from '@/lib/format'

type Entry = {
  id: string
  taskId: string
  taskTitle: string
  from: string | null
  to: string | null
  projectId: string | null
  projectTitle: string | null
  userName: string
  userRole: Role
  createdAt: Date | string
}

const STAGE_LABEL: Record<string, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  REVIEW: 'Review',
  DONE: 'Done',
}

const STAGE_STYLE: Record<string, string> = {
  TODO: 'bg-[#F1EFE8] text-[#6B6858]',
  IN_PROGRESS: 'bg-[#E7EEF7] text-[#3B6CA8]',
  REVIEW: 'bg-[#FBF1E1] text-[#A87A2E]',
  DONE: 'bg-[#E9F2EC] text-[#3F7A50]',
}

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  EMPLOYEE: 'Team',
}

function Stage({ value }: { value: string | null }) {
  if (!value) return <span className="text-xs text-[#C9C6B8]">—</span>
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_STYLE[value] ?? STAGE_STYLE.TODO}`}>
      {STAGE_LABEL[value] ?? value.toLowerCase()}
    </span>
  )
}

export function TaskActivityList({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState('')

  const visible = entries.filter((e) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      e.taskTitle.toLowerCase().includes(q) ||
      e.userName.toLowerCase().includes(q) ||
      (e.projectTitle ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-[#8A8778]">
          {entries.length === 0
            ? 'Nothing recorded yet'
            : `${entries.length} move${entries.length === 1 ? '' : 's'}, newest first`}
        </p>
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8778]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search task, person or project…"
            className="w-full rounded-lg border border-[#E8E5DC] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#E8E5DC] bg-white py-16 text-center">
          <History className="h-6 w-6 text-[#C9C6B8]" />
          <div>
            <p className="text-sm font-medium text-[#26251F]">
              {entries.length === 0 ? 'No task moves yet' : 'Nothing matches that search'}
            </p>
            <p className="mt-0.5 text-xs text-[#8A8778]">
              {entries.length === 0
                ? 'Drag a task to another column on the Tasks board and it shows up here.'
                : 'Try a different task, person or project.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E8E5DC] bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8A8778]">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="w-64 px-4 py-3 font-medium">Moved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFE8]">
              {visible.map((e) => (
                <tr key={e.id} className="transition hover:bg-[#FAF9F6]">
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#6B6858]">
                    {formatDateTime(e.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[#26251F]">{e.userName}</p>
                    <p className="text-xs text-[#8A8778]">{ROLE_LABEL[e.userRole]}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/tasks/${e.taskId}`}
                      className="font-medium text-[#26251F] transition hover:text-[#C1502E]"
                    >
                      {e.taskTitle}
                    </Link>
                    {e.projectTitle && (
                      <p className="text-xs text-[#8A8778]">
                        {e.projectId ? (
                          <Link
                            href={`/dashboard/projects/${e.projectId}`}
                            className="transition hover:text-[#C1502E]"
                          >
                            {e.projectTitle}
                          </Link>
                        ) : (
                          e.projectTitle
                        )}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Stage value={e.from} />
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#C9C6B8]" />
                      <Stage value={e.to} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
