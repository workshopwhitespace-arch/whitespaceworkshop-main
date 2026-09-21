import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listDeletedItems } from '@/lib/actions/recycle-bin'
import { RecycleBinList } from '@/components/modules/recycle-bin/recycle-bin-list'

export default async function RecycleBinPage() {
  const session = await auth()
  // proxy.ts blocks other roles; this guards the data too.
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const items = await listDeletedItems()

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#26251F]">Recycle bin</h1>
        <p className="mt-0.5 text-sm text-[#8A8778]">
          Everything anyone has deleted, from every user. Put it back, or delete it for
          good. Only Super Admins see this page.
        </p>
      </div>

      <RecycleBinList items={items} />
    </div>
  )
}
