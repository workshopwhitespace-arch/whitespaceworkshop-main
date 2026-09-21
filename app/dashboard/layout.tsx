import { redirect } from 'next/navigation'
import { after } from 'next/server'
import type { ReactNode } from 'react'
import { auth } from '@/lib/auth'
import { listMyNotifications } from '@/lib/actions/notifications'
import { notifyOverdueTodosThrottled } from '@/lib/overdue-todos'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const notifications = await listMyNotifications()

  // Todo reminders (19:00 IST on the due day). Runs after the page is sent so
  // it never slows a load down; throttled, and the daily cron covers idle periods.
  after(notifyOverdueTodosThrottled)

  return (
    <div className="flex h-screen bg-[#FAF9F6]">
      <Sidebar role={session.user.role} userName={session.user.name ?? 'User'} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          userName={session.user.name ?? 'User'}
          notifications={notifications.items}
          unreadCount={notifications.unreadCount}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
