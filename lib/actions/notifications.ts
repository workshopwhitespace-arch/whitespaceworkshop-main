'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] as const

/** The signed-in user's latest notifications plus their unread count. */
export async function listMyNotifications() {
  const session = await requireRole([...ALL_ROLES])
  const userId = session.user.id

  const [items, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, message: true, isRead: true, createdAt: true },
    }),
    db.notification.count({ where: { userId, isRead: false } }),
  ])

  return { items, unreadCount }
}

/** Scoped by userId, so nobody can mark someone else's notifications. */
export async function markNotificationRead(notificationId: string) {
  const session = await requireRole([...ALL_ROLES])

  await db.notification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: { isRead: true },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true as const }
}

export async function markAllNotificationsRead() {
  const session = await requireRole([...ALL_ROLES])

  await db.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true as const }
}
