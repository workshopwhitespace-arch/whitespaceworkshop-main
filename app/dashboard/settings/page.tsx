import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ChangePasswordForm } from '@/components/modules/settings/change-password-form'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  EMPLOYEE: 'Team',
}

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#26251F]">Settings</h1>
        <p className="mt-0.5 text-sm text-[#8A8778]">Your account.</p>
      </div>

      <div className="mb-4 rounded-xl border border-[#E8E5DC] bg-white p-5">
        <h2 className="text-sm font-medium text-[#26251F]">Signed in as</h2>
        <p className="mt-2 text-sm text-[#26251F]">{session.user.name}</p>
        <p className="text-xs text-[#8A8778]">
          {session.user.email} · {ROLE_LABELS[session.user.role] ?? session.user.role}
        </p>
        <p className="mt-3 text-xs text-[#8A8778]">
          Only a Super Admin can change your role, from Team &amp; Roles.
        </p>
      </div>

      <ChangePasswordForm />
    </div>
  )
}
