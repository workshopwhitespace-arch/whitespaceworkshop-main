import { db } from '@/lib/db'

/**
 * Writes notifications for the bell in the top bar. Everyone gets their own:
 * the people a task is handed to, the people already on it when it moves,
 * the owner of an overdue todo, and Super Admins for sign-ups.
 *
 * Not a server action — called from inside other actions, never the browser.
 * A notification is a side effect, so a failure here is logged and swallowed
 * rather than failing the action the user actually asked for.
 */
export async function notifyUsers(
  userIds: string[],
  message: string,
  related?: { type: string; id: string }
) {
  const recipients = [...new Set(userIds)].filter(Boolean)
  if (recipients.length === 0) return

  try {
    await db.notification.createMany({
      data: recipients.map((userId) => ({
        userId,
        message,
        relatedEntityType: related?.type ?? null,
        relatedEntityId: related?.id ?? null,
      })),
    })
  } catch (error) {
    console.error('[notify] Could not write notifications:', error)
  }
}

/** Every active Super Admin — for things only they can act on. */
export async function superAdminIds() {
  const admins = await db.user.findMany({
    where: { role: 'SUPER_ADMIN', status: 'active' },
    select: { id: true },
  })
  return admins.map((a) => a.id)
}
