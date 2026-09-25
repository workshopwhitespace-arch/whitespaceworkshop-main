import { db } from '@/lib/db'
import { notifyUsers } from '@/lib/notify'

/**
 * Tells every active Super Admin about todos still unfinished at 19:00 IST on
 * their due day (or any time after). Each todo is reported exactly once.
 *
 * Deliberately NOT a server action (no 'use server'): it runs as the system,
 * from the dashboard layout's after() hook and from the cron route, and must
 * never be callable from the browser.
 */

const HOUR = 60 * 60 * 1000

/** Reminders go out at this hour (IST) on the day a todo is due. */
const REMINDER_HOUR = 18

// The studio works in IST. Server-side dates must be formatted in that zone
// explicitly — on Vercel the server clock is UTC and would show the wrong day.
const STUDIO_TIMEZONE = 'Asia/Kolkata'

function formatDeadline(date: Date) {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: STUDIO_TIMEZONE,
  })
}

export async function notifyOverdueTodos() {
  // A deadline is stored as midnight (IST) at the start of its day, so
  // 18:00 on the due day is deadline + 19h. Anything at or past that is due
  // a reminder — including older todos a missed run never got to.
  const cutoff = new Date(Date.now() - REMINDER_HOUR * HOUR)

  const overdue = await db.todo.findMany({
    where: { isDone: false, overdueNotifiedAt: null, deadline: { lte: cutoff }, deletedAt: null },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { deadline: 'asc' },
  })
  if (overdue.length === 0) return { notified: 0 }

  const superAdmins = await db.user.findMany({
    where: { role: 'SUPER_ADMIN', status: 'active' },
    select: { id: true, email: true },
  })
  if (superAdmins.length === 0) return { notified: 0 }

  const reported: { name: string; owner: string; deadline: string }[] = []

  for (const todo of overdue) {
    // Claim the todo first. If another run (a second tab, the cron job)
    // got there already, count is 0 and this run skips it — no duplicates.
    const { count } = await db.todo.updateMany({
      where: { id: todo.id, overdueNotifiedAt: null },
      data: { overdueNotifiedAt: new Date() },
    })
    if (count === 0) continue

    const deadline = formatDeadline(todo.deadline)
    const dueToday = deadline === formatDeadline(new Date())
    await db.notification.createMany({
      data: superAdmins.map((admin) => ({
        userId: admin.id,
        message: dueToday
          ? `Todo due today: "${todo.name}" (${todo.user.name}) is still not done.`
          : `Overdue todo: "${todo.name}" (${todo.user.name}) was due ${deadline} and is still not done.`,
        relatedEntityType: 'Todo',
        relatedEntityId: todo.id,
      })),
    })
    // The person whose todo it is hears about it as well.
    await notifyUsers(
      [todo.userId],
      dueToday
        ? `Your todo “${todo.name}” is due today and still isn’t done.`
        : `Your todo “${todo.name}” was due ${deadline} and still isn’t done.`,
      { type: 'Todo', id: todo.id }
    )

    reported.push({ name: todo.name, owner: todo.user.name, deadline })
  }

  if (reported.length > 0) {
    await emailSuperAdmins(superAdmins.map((a) => a.email), reported)
  }

  return { notified: reported.length }
}

/**
 * Optional email copy through Resend. Skipped silently until RESEND_API_KEY
 * and REMINDER_FROM_EMAIL are set — the in-app notification is the source
 * of truth, so a mail failure is logged but never undoes it.
 */
async function emailSuperAdmins(
  to: string[],
  todos: { name: string; owner: string; deadline: string }[]
) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.REMINDER_FROM_EMAIL
  if (!apiKey || !from) return

  const lines = todos.map((t) => `• ${t.name} — ${t.owner}, due ${t.deadline}`).join('\n')

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject: `${todos.length} todo${todos.length === 1 ? '' : 's'} still remaining`,
        text: `These todos are due and still not done:\n\n${lines}\n`,
      }),
    })
    if (!res.ok) console.error('[overdue-todos] Resend rejected the email:', res.status, await res.text())
  } catch (error) {
    console.error('[overdue-todos] Could not send the reminder email:', error)
  }
}

let lastRun = 0

/** The same check, throttled to once per 10 minutes per server process. */
export async function notifyOverdueTodosThrottled() {
  if (Date.now() - lastRun < 10 * 60 * 1000) return
  lastRun = Date.now()
  try {
    await notifyOverdueTodos()
  } catch (error) {
    console.error('[overdue-todos] Check failed:', error)
  }
}
