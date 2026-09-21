'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createTodo } from '@/lib/actions/todos'
import { formatDate } from '@/lib/format'

const field =
  'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'
const label = 'mb-1.5 block text-sm font-medium text-[#26251F]'

/** Today as YYYY-MM-DD in the user's own timezone, for the date input's min. */
function todayInputValue() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "2026-09-20" → local midnight, so the deadline doesn't shift a day by timezone. */
function parseDateInput(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function TodoForm({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const first = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  // Shown for reference only — the real timestamp is set by the database.
  const [createdOn] = useState(() => new Date())

  useEffect(() => {
    first.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) return setError('Give the task a name.')
    if (!deadline) return setError('Choose a deadline.')

    startTransition(async () => {
      const result = await createTodo({
        name: name.trim(),
        description: description.trim() || undefined,
        deadline: parseDateInput(deadline),
      })

      if (!result.success) return setError(result.error)
      onClose()
      router.refresh()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#1F1E1B]/40 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="todo-form-title"
        className="w-full max-w-lg rounded-xl border border-[#E8E5DC] bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#F1EFE8] px-5 py-3.5">
          <h2 id="todo-form-title" className="text-sm font-medium text-[#26251F]">Create task</h2>
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="rounded p-1 text-[#8A8778] transition hover:bg-[#FAF9F6] hover:text-[#26251F]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          <div>
            <label htmlFor="todo-name" className={label}>
              Name <span className="text-[#C1502E]">*</span>
            </label>
            <input
              id="todo-name" ref={first} value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Call vendor about tile samples"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="todo-desc" className={label}>
              Description <span className="font-normal text-[#8A8778]">(optional)</span>
            </label>
            <textarea
              id="todo-desc" rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any details you'll want to remember."
              className={field}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="todo-deadline" className={label}>
                Deadline <span className="text-[#C1502E]">*</span>
              </label>
              <input
                id="todo-deadline" type="date" value={deadline} min={todayInputValue()}
                onChange={(e) => setDeadline(e.target.value)}
                className={field}
              />
            </div>

            <div>
              <label htmlFor="todo-created" className={label}>Created on</label>
              <input
                id="todo-created" value={formatDate(createdOn)} readOnly tabIndex={-1}
                className={`${field} cursor-default bg-[#FAF9F6] text-[#8A8778]`}
              />
              <p className="mt-1 text-xs text-[#8A8778]">Filled in automatically.</p>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="rounded-lg border border-[#E8E5DC] px-3.5 py-2 text-sm font-medium text-[#6B6858] transition hover:bg-[#FAF9F6]"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={pending}
              className="rounded-lg bg-[#C1502E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-60"
            >
              {pending ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
