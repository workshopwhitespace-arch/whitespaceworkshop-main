import { NextResponse } from 'next/server'
import { notifyOverdueTodos } from '@/lib/overdue-todos'

export const dynamic = 'force-dynamic'

/**
 * Daily todo reminder, called by Vercel Cron at 13:30 UTC = 19:00 IST (see
 * vercel.json). Vercel
 * sends `Authorization: Bearer <CRON_SECRET>`; anything else is refused, and
 * with no CRON_SECRET configured the route stays shut entirely.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await notifyOverdueTodos()
  return NextResponse.json(result)
}
