'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Re-fetches the current screen every few minutes so notifications, task
 * boards and counts stay current without anyone pressing reload.
 *
 * router.refresh() re-runs the server components only: typing, open dialogs
 * and scroll position survive it, so this can't interrupt someone mid-edit.
 * Refreshes are skipped while the tab is in the background and done once on
 * the way back, so a tab left open all day isn't polling for nothing.
 */
export function AutoRefresh({ intervalMs = 5 * 60 * 1000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    let last = Date.now()

    const refresh = () => {
      last = Date.now()
      router.refresh()
    }

    const timer = setInterval(() => {
      if (!document.hidden) refresh()
    }, intervalMs)

    const onVisible = () => {
      if (!document.hidden && Date.now() - last >= intervalMs) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router, intervalMs])

  return null
}
