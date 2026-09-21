'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Layers, Archive, ArchiveRestore } from 'lucide-react'
import { createService, updateService } from '@/lib/actions/services'
import { formatDateShort } from '@/lib/format'

type Service = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date | string
  taskCount: number
  quotationCount: number
}

const field =
  'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'
const label = 'mb-1.5 block text-sm font-medium text-[#26251F]'

export function ServiceList({
  services,
  canManage,
}: {
  services: Service[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // null = form closed, 'new' = creating, otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  function openForm(service?: Service) {
    setError(null)
    setEditing(service?.id ?? 'new')
    setName(service?.name ?? '')
    setDescription(service?.description ?? '')
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (name.trim().length < 2) return setError('Give the service a name.')

    const payload = { name: name.trim(), description: description.trim() || undefined }

    startTransition(async () => {
      const result =
        editing === 'new'
          ? await createService(payload)
          : await updateService({ id: editing!, ...payload })

      if (!result.success) return setError(result.error)
      setEditing(null)
      router.refresh()
    })
  }

  function toggleActive(service: Service) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await updateService({ id: service.id, isActive: !service.isActive })
        if (!result.success) return setError(result.error)
        router.refresh()
      } catch {
        setError('Could not update that service. Refresh the page and try again.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {canManage && editing === null && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => openForm()}
            className="flex items-center gap-1.5 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F]"
          >
            <Plus className="h-4 w-4" />
            New service
          </button>
        </div>
      )}

      {canManage && editing !== null && (
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-[#E8E5DC] bg-white p-5">
          <h2 className="text-sm font-medium text-[#26251F]">
            {editing === 'new' ? 'New service' : 'Edit service'}
          </h2>
          <div>
            <label htmlFor="sname" className={label}>
              Name <span className="text-[#C1502E]">*</span>
            </label>
            <input
              id="sname"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly social media calendar"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="sdesc" className={label}>
              Description <span className="font-normal text-[#8A8778]">(optional)</span>
            </label>
            <textarea
              id="sdesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's included — this is copied onto quotation lines."
              className={field}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-[#E8E5DC] px-3.5 py-2 text-sm font-medium text-[#6B6858] transition hover:bg-[#FAF9F6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[#C1502E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-60"
            >
              {pending ? 'Saving…' : editing === 'new' ? 'Create service' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
          {error}
        </p>
      )}

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#E8E5DC] bg-white py-16 text-center">
          <Layers className="h-6 w-6 text-[#C9C6B8]" />
          <div>
            <p className="text-sm font-medium text-[#26251F]">No services yet</p>
            <p className="mt-0.5 text-xs text-[#8A8778]">
              {canManage
                ? 'Add the work you offer repeatedly so it can be picked on tasks and quotations.'
                : 'An Admin hasn’t added any services yet.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E8E5DC] bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8A8778]">
                <th className="px-5 py-2.5 font-medium">Service</th>
                <th className="w-20 px-3 py-2.5 text-right font-medium">Tasks</th>
                <th className="w-28 px-3 py-2.5 text-right font-medium">Quote lines</th>
                <th className="w-28 px-3 py-2.5 font-medium">Added</th>
                <th className="w-24 px-3 py-2.5 font-medium">Status</th>
                {canManage && <th className="w-20 px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFE8]">
              {services.map((s) => (
                <tr key={s.id} className={s.isActive ? '' : 'text-[#8A8778]'}>
                  <td className="px-5 py-3">
                    <p className={s.isActive ? 'font-medium text-[#26251F]' : 'font-medium'}>{s.name}</p>
                    {s.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-[#8A8778]">{s.description}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{s.taskCount}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{s.quotationCount}</td>
                  <td className="px-3 py-3 tabular-nums text-[#8A8778]">{formatDateShort(s.createdAt)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.isActive ? 'bg-[#E9F2EC] text-[#3F7A50]' : 'bg-[#F1EFE8] text-[#8A8778]'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Retired'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-3 py-3">
                      <span className="flex justify-end gap-0.5">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => openForm(s)}
                          aria-label={`Edit ${s.name}`}
                          className="rounded p-1.5 text-[#C9C6B8] transition hover:bg-[#FAF9F6] hover:text-[#C1502E] disabled:opacity-40"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => toggleActive(s)}
                          aria-label={s.isActive ? `Retire ${s.name}` : `Restore ${s.name}`}
                          title={s.isActive ? 'Retire — hides it from pickers' : 'Restore'}
                          className="rounded p-1.5 text-[#C9C6B8] transition hover:bg-[#FAF9F6] hover:text-[#C1502E] disabled:opacity-40"
                        >
                          {s.isActive ? (
                            <Archive className="h-3.5 w-3.5" />
                          ) : (
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
