'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { changeOwnPassword } from '@/lib/actions/account'

const field =
  'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'
const label = 'mb-1.5 block text-sm font-medium text-[#26251F]'

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDone(false)

    startTransition(async () => {
      try {
        const result = await changeOwnPassword({ currentPassword, newPassword, confirmPassword })
        if (!result.success) return setError(result.error)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setDone(true)
      } catch {
        setError('Could not change the password right now. Try again in a moment.')
      }
    })
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-[#E8E5DC] bg-white p-5">
      <h2 className="text-sm font-medium text-[#26251F]">Change password</h2>
      <p className="mt-0.5 mb-4 text-xs text-[#8A8778]">
        Forgotten your password and can&apos;t sign in? Ask a Super Admin to set a temporary
        one for you from Team &amp; Roles.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="currentPassword" className={label}>Current password</label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={field}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="newPassword" className={label}>New password</label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={field}
            />
            <p className="mt-1 text-xs text-[#8A8778]">At least 8 characters.</p>
          </div>

          <div>
            <label htmlFor="confirmNewPassword" className={label}>Confirm new password</label>
            <input
              id="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={field}
            />
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
          {error}
        </p>
      )}

      {done && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-[#E9F2EC] px-3.5 py-2.5 text-sm text-[#3F7A50]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Password changed. Use it next time you sign in.
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#C1502E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Change password'}
        </button>
      </div>
    </form>
  )
}
