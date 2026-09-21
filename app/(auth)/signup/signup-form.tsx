'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { signup } from '@/lib/actions/auth'
import { authButton, authField, authLabel } from '../form-styles'

export function SignupForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signup({ name, email, password, confirmPassword })
      if (!result.success) {
        setError(result.error)
        return
      }
      setDone(true)
    } catch {
      setError('Could not create the account right now. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-[#E8E5DC] bg-white p-5">
        <CheckCircle2 className="h-6 w-6 text-[#3F7A50]" />
        <h2 className="mt-3 text-sm font-medium text-[#26251F]">Account created</h2>
        <p className="mt-1 text-sm text-[#6B6858]">
          A Super Admin has to approve it before you can sign in. You&apos;ll start with
          Team access.
        </p>
        <Link
          href="/login"
          className={`${authButton} mt-4 inline-block text-center`}
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className={authLabel}>Full name</label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className={authField}
        />
      </div>

      <div>
        <label htmlFor="email" className={authLabel}>Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className={authField}
        />
      </div>

      <div>
        <label htmlFor="password" className={authLabel}>Password</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className={authField}
        />
        <p className="mt-1 text-xs text-[#8A8778]">At least 8 characters.</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className={authLabel}>Confirm password</label>
        <input
          id="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className={authField}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#C1443B]">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className={authButton}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
