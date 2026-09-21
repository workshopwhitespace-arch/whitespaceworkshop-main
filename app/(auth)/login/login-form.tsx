'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { authButton, authField, authLabel } from '../form-styles'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      // Auth.js reports a rejected credential as CredentialsSignin, with our
      // own `code` when the password was right but the account isn't usable
      // yet. Anything else — an unreachable database, a missing AUTH_SECRET —
      // is a server problem, and saying "wrong password" for those sends
      // people hunting in entirely the wrong place.
      if (result.code === 'account_pending') {
        setError('Your account is waiting for a Super Admin to approve it.')
      } else if (result.code === 'account_inactive') {
        setError('This account has been deactivated. Ask a Super Admin to restore it.')
      } else if (result.error === 'CredentialsSignin') {
        setError("That email or password isn't right. Try again.")
      } else {
        setError('Sign-in is not working right now — this is a server problem, not your password. Check the server logs.')
      }
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className={authLabel}>Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={authField}
        />
      </div>

      <div>
        <label htmlFor="password" className={authLabel}>Password</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={authField}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#C1443B]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={authButton}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
