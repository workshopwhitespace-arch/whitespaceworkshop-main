'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, KeyRound, Plus, UserCog, X, RotateCcw } from 'lucide-react'
import type { Role } from '@prisma/client'
import { createUser, updateUser } from '@/lib/actions/users'
import { resetUserPassword } from '@/lib/actions/account'
import { formatDate } from '@/lib/format'

type Member = {
  id: string
  name: string
  email: string
  role: Role
  status: string
  createdAt: Date | string
  projectCount: number
  taskCount: number
}

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: 'EMPLOYEE', label: 'Team', hint: 'Own projects and tasks only' },
  { value: 'ADMIN', label: 'Admin', hint: 'Everything except Team & Settings' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', hint: 'Full access, including this page' },
]

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-[#E9F2EC] text-[#3F7A50]',
  pending: 'bg-[#FBF1E1] text-[#A87A2E]',
  inactive: 'bg-[#F1EFE8] text-[#8A8778]',
}

const field =
  'rounded-lg border border-[#E8E5DC] bg-white px-2.5 py-1.5 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'
const formField =
  'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'
const label = 'mb-1.5 block text-sm font-medium text-[#26251F]'

export function TeamList({
  users,
  currentUserId,
}: {
  users: Member[]
  currentUserId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  // Which row's password is being reset, and what it's being set to.
  const [resetFor, setResetFor] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState('')
  const [resetDone, setResetDone] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('EMPLOYEE')

  const waiting = users.filter((u) => u.status === 'pending')

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.success) return setError(result.error ?? 'That change could not be saved.')
        router.refresh()
      } catch {
        setError('That change could not be saved. Refresh the page and try again.')
      }
    })
  }

  function openReset(userId: string) {
    setError(null)
    setResetDone(null)
    setResetFor(userId)
    // A readable one-off they can type, then change themselves in Settings.
    setTempPassword(`wsw-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}`)
  }

  function submitReset(e: React.FormEvent, member: Member) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await resetUserPassword({ userId: member.id, newPassword: tempPassword })
      if (!result.success) return setError(result.error)
      setResetFor(null)
      setResetDone(`${member.name}'s password is now: ${tempPassword}  —  pass it on; they can change it in Settings.`)
    })
  }

  function submitNewUser(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createUser({ name, email, password, role })
      if (!result.success) return setError(result.error)
      setName('')
      setEmail('')
      setPassword('')
      setRole('EMPLOYEE')
      setAdding(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#8A8778]">
          {waiting.length > 0
            ? `${waiting.length} sign-up${waiting.length === 1 ? '' : 's'} waiting for approval`
            : `${users.length} ${users.length === 1 ? 'person' : 'people'}`}
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F]"
          >
            <Plus className="h-4 w-4" />
            Add person
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={submitNewUser} className="rounded-xl border border-[#E8E5DC] bg-white p-5">
          <h2 className="mb-4 text-sm font-medium text-[#26251F]">Add a person</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tname" className={label}>Full name</label>
              <input id="tname" value={name} onChange={(e) => setName(e.target.value)} className={formField} />
            </div>
            <div>
              <label htmlFor="temail" className={label}>Email</label>
              <input id="temail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={formField} />
            </div>
            <div>
              <label htmlFor="tpassword" className={label}>Temporary password</label>
              <input
                id="tpassword" type="text" value={password} minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={formField}
              />
              <p className="mt-1 text-xs text-[#8A8778]">Share it with them to sign in.</p>
            </div>
            <div>
              <label htmlFor="trole" className={label}>Role</label>
              <select id="trole" value={role} onChange={(e) => setRole(e.target.value as Role)} className={formField}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#8A8778]">
            People added here can sign in straight away — no approval needed.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg border border-[#E8E5DC] px-3.5 py-2 text-sm font-medium text-[#6B6858] transition hover:bg-[#FAF9F6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[#C1502E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-60"
            >
              {pending ? 'Adding…' : 'Add person'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
          {error}
        </p>
      )}

      {resetDone && (
        <p role="status" className="rounded-lg bg-[#E9F2EC] px-3.5 py-2.5 text-sm text-[#3F7A50]">
          {resetDone}
        </p>
      )}

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#E8E5DC] bg-white py-16 text-center">
          <UserCog className="h-6 w-6 text-[#C9C6B8]" />
          <p className="text-sm font-medium text-[#26251F]">Nobody here yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E8E5DC] bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8A8778]">
                <th className="px-4 py-3 font-medium">Person</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Work</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="w-44 px-4 py-3 font-medium">Role</th>
                <th className="w-28 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFE8]">
              {users.map((u) => {
                const isSelf = u.id === currentUserId

                return (
                  <tr key={u.id} className="transition hover:bg-[#FAF9F6]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#26251F]">
                        {u.name}
                        {isSelf && <span className="ml-1.5 text-xs font-normal text-[#8A8778]">(you)</span>}
                      </p>
                      <p className="text-xs text-[#8A8778]">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-[#8A8778]">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-[#8A8778]">
                      {u.projectCount} project{u.projectCount === 1 ? '' : 's'} · {u.taskCount} task
                      {u.taskCount === 1 ? '' : 's'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[u.status] ?? STATUS_STYLE.inactive}`}>
                        {u.status === 'pending' ? 'Awaiting approval' : u.status === 'active' ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={pending || isSelf}
                        title={isSelf ? 'You can’t change your own role' : undefined}
                        aria-label={`Role for ${u.name}`}
                        onChange={(e) => run(() => updateUser({ id: u.id, role: e.target.value as Role }))}
                        className={`${field} disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => openReset(u.id)}
                        title="Set a temporary password"
                        aria-label={`Reset password for ${u.name}`}
                        className="rounded-md p-1.5 text-[#8A8778] transition hover:bg-[#FAEDE8] hover:text-[#C1502E] disabled:opacity-50"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      {isSelf ? (
                        <span className="text-xs text-[#C9C6B8]">—</span>
                      ) : u.status === 'active' ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => updateUser({ id: u.id, status: 'inactive' }))}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E8E5DC] px-2.5 py-1.5 text-xs font-medium text-[#6B6858] transition hover:border-[#C1443B]/40 hover:text-[#C1443B] disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => updateUser({ id: u.id, status: 'active' }))}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#3F7A50] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#356544] disabled:opacity-50"
                        >
                          {u.status === 'pending' ? <Check className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                          {u.status === 'pending' ? 'Approve' : 'Restore'}
                        </button>
                      )}
                      </div>

                      {resetFor === u.id && (
                        <form
                          onSubmit={(e) => submitReset(e, u)}
                          className="mt-2 flex items-center justify-end gap-2"
                        >
                          <input
                            value={tempPassword}
                            onChange={(e) => setTempPassword(e.target.value)}
                            aria-label={`Temporary password for ${u.name}`}
                            minLength={8}
                            className={`${field} w-48 text-left`}
                          />
                          <button
                            type="submit"
                            disabled={pending}
                            className="rounded-lg bg-[#C1502E] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-50"
                          >
                            Set
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetFor(null)}
                            className="rounded-lg border border-[#E8E5DC] px-2.5 py-1.5 text-xs font-medium text-[#6B6858] transition hover:bg-[#FAF9F6]"
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-[#8A8778]">
        {ROLES.map((r) => `${r.label}: ${r.hint}`).join(' · ')}
      </p>
    </div>
  )
}
