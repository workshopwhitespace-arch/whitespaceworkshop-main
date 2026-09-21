'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ListTodo, CalendarClock, Trash2, Check } from 'lucide-react'
import { setTodoDone, deleteTodo } from '@/lib/actions/todos'
import { formatDate } from '@/lib/format'
import { TodoForm } from './todo-form'

type Todo = {
  id: string
  name: string
  description: string | null
  deadline: Date | string
  isDone: boolean
  createdAt: Date | string
}

const DAY = 24 * 60 * 60 * 1000

function startOfDay(value: Date | string) {
  const d = new Date(value)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** "Due today", "Due in 3 days", "Overdue by 2 days" — relative to today. */
function deadlineLabel(deadline: Date | string) {
  const days = Math.round((startOfDay(deadline) - startOfDay(new Date())) / DAY)
  if (days === 0) return { text: 'Due today', tone: 'soon' as const }
  if (days === 1) return { text: 'Due tomorrow', tone: 'soon' as const }
  if (days > 1) return { text: `Due in ${days} days`, tone: days <= 3 ? ('soon' as const) : ('later' as const) }
  const late = -days
  return { text: `Overdue by ${late} day${late === 1 ? '' : 's'}`, tone: 'overdue' as const }
}

const TONE: Record<'overdue' | 'soon' | 'later', string> = {
  overdue: 'bg-[#FBEAE6] text-[#C1443B]',
  soon: 'bg-[#FBF1E1] text-[#A87A2E]',
  later: 'bg-[#F1EFE8] text-[#6B6858]',
}

export function TodoList({ todos }: { todos: Todo[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const open = todos.filter((t) => !t.isDone)
  const done = todos.filter((t) => t.isDone)

  function toggle(todo: Todo) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await setTodoDone(todo.id, !todo.isDone)
        if (!result.success) return setError(result.error)
        router.refresh()
      } catch {
        setError('Could not update that todo. Refresh the page and try again.')
      }
    })
  }

  function remove(todo: Todo) {
    if (!window.confirm(`Delete "${todo.name}"? This cannot be undone.`)) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await deleteTodo(todo.id)
        if (!result.success) return setError(result.error)
        router.refresh()
      } catch {
        setError('Could not delete that todo. Refresh the page and try again.')
      }
    })
  }

  function row(t: Todo) {
    const due = deadlineLabel(t.deadline)

    return (
      <li key={t.id} className="group flex items-start gap-3 px-4 py-3.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => toggle(t)}
          aria-label={t.isDone ? `Mark "${t.name}" as not done` : `Mark "${t.name}" as done`}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50 ${
            t.isDone
              ? 'border-[#3F7A50] bg-[#3F7A50] text-white'
              : 'border-[#C9C6B8] bg-white text-transparent hover:border-[#3F7A50] hover:text-[#3F7A50]'
          }`}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <p className={`text-sm ${t.isDone ? 'text-[#8A8778] line-through' : 'font-medium text-[#26251F]'}`}>
            {t.name}
          </p>
          {t.description && (
            <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-[#8A8778]">
              {t.description}
            </p>
          )}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8A8778]">
            <span className="flex items-center gap-1 tabular-nums">
              <CalendarClock className="h-3 w-3" />
              Deadline {formatDate(t.deadline)}
            </span>
            <span className="tabular-nums">Created {formatDate(t.createdAt)}</span>
          </p>
        </div>

        {!t.isDone && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TONE[due.tone]}`}>
            {due.text}
          </span>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={() => remove(t)}
          aria-label={`Delete ${t.name}`}
          className="shrink-0 rounded p-1 text-[#C9C6B8] opacity-0 transition group-hover:opacity-100 hover:bg-[#FBEAE6] hover:text-[#C1443B] focus:opacity-100 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </li>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F]"
        >
          <Plus className="h-4 w-4" />
          Create task
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
          {error}
        </p>
      )}

      {todos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#E8E5DC] bg-white py-16 text-center">
          <ListTodo className="h-6 w-6 text-[#C9C6B8]" />
          <div>
            <p className="text-sm font-medium text-[#26251F]">Nothing on your list</p>
            <p className="mt-0.5 text-xs text-[#8A8778]">Create a task with a deadline to get started.</p>
          </div>
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-[#E8E5DC] bg-white">
            <header className="flex items-center justify-between border-b border-[#F1EFE8] px-4 py-3">
              <h2 className="text-sm font-medium text-[#26251F]">To do</h2>
              <span className="text-xs tabular-nums text-[#8A8778]">{open.length}</span>
            </header>
            {open.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#8A8778]">All caught up.</p>
            ) : (
              <ul className="divide-y divide-[#F1EFE8]">{open.map(row)}</ul>
            )}
          </section>

          {done.length > 0 && (
            <section className="rounded-xl border border-[#E8E5DC] bg-white">
              <header className="flex items-center justify-between border-b border-[#F1EFE8] px-4 py-3">
                <h2 className="text-sm font-medium text-[#8A8778]">Done</h2>
                <span className="text-xs tabular-nums text-[#8A8778]">{done.length}</span>
              </header>
              <ul className="divide-y divide-[#F1EFE8]">{done.map(row)}</ul>
            </section>
          )}
        </>
      )}

      {formOpen && <TodoForm onClose={() => setFormOpen(false)} />}
    </div>
  )
}
