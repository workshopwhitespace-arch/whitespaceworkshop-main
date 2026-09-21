const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrPreciseFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Rupees, rounded — for tiles, lists and totals at a glance. */
export function inr(value: number) {
  return inrFormatter.format(value)
}

/** Rupees with paise — for line items and invoice-style totals. */
export function inrExact(value: number) {
  return inrPreciseFormatter.format(value)
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** "18 Sept 2026, 7:04 pm" — for the activity log, in studio time. */
export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

export function formatDateShort(value: Date | string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
