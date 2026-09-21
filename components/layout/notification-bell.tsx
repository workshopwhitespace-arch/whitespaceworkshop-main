'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/actions/notifications'
import { formatDate } from '@/lib/format'

export type NotificationItem = {
  id: string
  message: string
  isRead: boolean
  createdAt: Date | string
}

export function NotificationBell({
  items,
  unreadCount,
}: {
  items: NotificationItem[]
  unreadCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (panel.current && !panel.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action()
      router.refresh()
    })
  }

  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative rounded-full p-2 text-[#26251F] hover:bg-[#FAF9F6]"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C1443B] px-1 text-[10px] font-semibold leading-none text-white tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border border-[#E8E5DC] bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-[#F1EFE8] px-4 py-3">
            <h2 className="text-sm font-medium text-[#26251F]">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(markAllNotificationsRead)}
                className="text-xs font-medium text-[#C1502E] transition hover:text-[#A8431F] disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-[#8A8778]">You're all caught up.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-[#F1EFE8] overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    disabled={pending || n.isRead}
                    onClick={() => run(() => markNotificationRead(n.id))}
                    className={`flex w-full gap-2.5 px-4 py-3 text-left transition ${
                      n.isRead ? 'cursor-default' : 'bg-[#FAEDE8]/40 hover:bg-[#FAEDE8]'
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-[#C1502E]'}`}
                    />
                    <span className="min-w-0">
                      <span className={`block text-sm ${n.isRead ? 'text-[#8A8778]' : 'text-[#26251F]'}`}>
                        {n.message}
                      </span>
                      <span className="mt-0.5 block text-xs tabular-nums text-[#8A8778]">
                        {formatDate(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
