'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'

/**
 * Opens the browser's print window for a quotation without leaving the page:
 * the print-ready A4 page loads in a hidden iframe and is printed from
 * there, so the user just picks "Save as PDF". If anything goes wrong (the
 * iframe didn't land on the print page, e.g. an expired session), it falls
 * back to opening that page in a new tab.
 */
export function PrintQuotationButton({
  quotationId,
  label,
  className,
}: {
  quotationId: string
  /** Omit for an icon-only button (the label is then its tooltip). */
  label?: string
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const url = `/print/quotations/${quotationId}`

  function print() {
    if (busy) return
    setBusy(true)

    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    // Kept in the layout (not display:none) so it renders and prints fully.
    Object.assign(frame.style, {
      position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', opacity: '0',
    })

    const originalTitle = document.title
    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      document.title = originalTitle
      frame.remove()
      setBusy(false)
    }

    frame.onload = async () => {
      const win = frame.contentWindow
      try {
        if (!win || !win.location.pathname.startsWith('/print/')) throw new Error('not the print page')
        await win.document.fonts.ready
        // Browsers name the saved PDF after the page title.
        document.title = win.document.title
        win.addEventListener('afterprint', () => setTimeout(cleanup, 100), { once: true })
        win.focus()
        win.print()
        // The dialog has read the title by now (Chrome blocks in print()
        // until it closes), so the tab's own title can come straight back.
        document.title = originalTitle
        // Safari returns from print() before the dialog closes; afterprint covers it.
        setTimeout(cleanup, 60_000)
      } catch {
        cleanup()
        window.open(url, '_blank', 'noopener')
      }
    }

    frame.src = url
    document.body.appendChild(frame)
  }

  const Icon = busy ? Loader2 : FileDown
  const tooltip = label ?? 'Download PDF'

  return (
    <button
      type="button"
      onClick={print}
      disabled={busy}
      title={tooltip}
      aria-label={tooltip}
      className={className}
    >
      <Icon className={`h-4 w-4 shrink-0 ${busy ? 'animate-spin' : ''}`} />
      {label && <span>{busy ? 'Preparing…' : label}</span>}
    </button>
  )
}
