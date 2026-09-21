'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CheckSquare, ListTodo, RotateCcw, Trash2 } from 'lucide-react'
import {
  restoreItem,
  purgeItem,
  emptyRecycleBin,
  type DeletedItem,
  type DeletedKind,
} from '@/lib/actions/recycle-bin'
import { formatDateTime } from '@/lib/format'

const KIND_LABEL: Record<DeletedKind, string> = { task: 'Task', todo: 'Todo', client: 'Client' }
const KIND_ICON = { task: CheckSquare, todo: ListTodo, client: Building2 }

export function RecycleBinList({ items }: { items: DeletedItem[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  function run(action: () => Promise<{ success: boolean; error?: string }>, done?: string) {
    setError(null)
    setNote(null)
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.success) return setError(result.error ?? 'That could not be done.')
        if (done) setNote(done)
        router.refresh()
      } catch {
        setError('That could not be done. Refresh the page and try again.')
      }
    })
  }

  function purge(item: DeletedItem) {
    if (
      !window.confirm(
        `Delete "${item.title}" permanently? This cannot be undone — it will be gone for good.`
      )
    )
      return
    run(() => purgeItem(item.kind, item.id), `"${item.title}" was deleted permanently.`)
  }

  function empty() {
    if (
      !window.confirm(
        `Permanently delete all ${items.length} item${items.length === 1 ? '' : 's'} in the recycle bin? This cannot be undone.`
      )
    )
      return
    run(emptyRecycleBin, 'The recycle bin is empty.')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#8A8778]">
          {items.length === 0
            ? 'Nothing deleted'
            : `${items.length} deleted item${items.length === 1 ? '' : 's'}, newest first`}
        </p>
        {items.length > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={empty}
            className="flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-3.5 py-2 text-sm font-medium text-[#6B6858] transition hover:border-[#C1443B]/40 hover:text-[#C1443B] disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Empty recycle bin
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
          {error}
        </p>
      )}

      {note && (
        <p role="status" className="rounded-lg bg-[#E9F2EC] px-3.5 py-2.5 text-sm text-[#3F7A50]">
          {note}
        </p>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#E8E5DC] bg-white py-16 text-center">
          <Trash2 className="h-6 w-6 text-[#C9C6B8]" />
          <div>
            <p className="text-sm font-medium text-[#26251F]">The recycle bin is empty</p>
            <p className="mt-0.5 text-xs text-[#8A8778]">
              Deleted tasks, todos and clients land here, whoever deleted them.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E8E5DC] bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8A8778]">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Belonged to</th>
                <th className="px-4 py-3 font-medium">Deleted</th>
                <th className="w-52 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFE8]">
              {items.map((item) => {
                const Icon = KIND_ICON[item.kind]
                return (
                  <tr key={`${item.kind}-${item.id}`} className="transition hover:bg-[#FAF9F6]">
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-2 font-medium text-[#26251F]">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-[#C9C6B8]" />
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#8A8778]">
                        {KIND_LABEL[item.kind]} · {item.context}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B6858]">{item.ownerNames}</td>
                    <td className="px-4 py-3">
                      <p className="tabular-nums text-[#6B6858]">{formatDateTime(item.deletedAt)}</p>
                      <p className="text-xs text-[#8A8778]">by {item.deletedByName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => restoreItem(item.kind, item.id),
                              `"${item.title}" is back.`
                            )
                          }
                          className="flex items-center gap-1 rounded-lg bg-[#3F7A50] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#356544] disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => purge(item)}
                          className="flex items-center gap-1 rounded-lg border border-[#E8E5DC] px-2.5 py-1.5 text-xs font-medium text-[#6B6858] transition hover:border-[#C1443B]/40 hover:text-[#C1443B] disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
