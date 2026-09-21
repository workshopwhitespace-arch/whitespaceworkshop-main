import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listUsers } from '@/lib/actions/users'
import { TeamList } from '@/components/modules/team/team-list'

export default async function TeamPage() {
  const session = await auth()
  // proxy.ts already blocks other roles; this guards the data too.
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const users = await listUsers()

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#26251F]">Team &amp; Roles</h1>
        <p className="mt-0.5 text-sm text-[#8A8778]">
          Approve new sign-ups and decide what each person can reach. Only Super Admins
          see this page.
        </p>
      </div>

      <TeamList
        currentUserId={session.user.id}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt,
          projectCount: u._count.projectAssignments,
          taskCount: u._count.taskAssignments,
        }))}
      />
    </div>
  )
}
