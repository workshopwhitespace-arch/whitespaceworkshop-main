'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Users } from 'lucide-react'

export type AssigneeOption = { id: string; name: string }

/** Kept in sync with the menu's own w-56 / max-h-60 classes. */
const MENU_WIDTH = 224
const MENU_MAX_HEIGHT = 240

/**
 * Picks the people on a task. A task can be shared, so this is a checkbox
 * list rather than a dropdown — used on the board, the task screen, the
 * project screen and the new-task form.
 */
export function AssigneePicker({
  selected,
  options,
  onChange,
  disabled,
  currentUserId,
  size = 'sm',
}: {
  selected: string[]
  options: AssigneeOption[]
  onChange: (ids: string[]) => void
  disabled?: boolean
  /** Marks "(you)" in the list. */
  currentUserId?: string
  size?: 'sm' | 'md'
}) {
  const [open, setOpen] = useState(false)
  // Which way the menu opens, decided when it opens (see below).
  const [placement, setPlacement] = useState<{ align: 'left' | 'right'; up: boolean }>({
    align: 'right',
    up: false,
  })
  const box = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  /**
   * The menu is wider than a board card, so right-aligning it on the
   * left-hand column pushed it under the sidebar, hiding the checkboxes.
   * Pick the side with room inside the scrolling area, and open upwards
   * when there isn't space below.
   */
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const area = triggerRef.current.closest('main')?.getBoundingClientRect()
    const leftEdge = (area?.left ?? 0) + 8
    const rightEdge = (area?.right ?? window.innerWidth) - 8
    setPlacement({
      // Right-aligned unless that would run past the left edge of the page area.
      align: rect.right - MENU_WIDTH >= leftEdge || rect.left + MENU_WIDTH > rightEdge ? 'right' : 'left',
      up: rect.bottom + MENU_MAX_HEIGHT > window.innerHeight - 8 && rect.top > MENU_MAX_HEIGHT,
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
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

  const chosen = options.filter((o) => selected.includes(o.id))
  const label =
    chosen.length === 0
      ? 'Unassigned'
      : chosen.length <= 2
        ? chosen.map((c) => c.name).join(', ')
        : `${chosen[0].name} +${chosen.length - 1}`

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  // A fixed width, so every card's control lines up whatever names it holds.
  const trigger =
    size === 'md'
      ? 'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm'
      : 'w-full rounded border border-[#E8E5DC] bg-white px-1.5 py-1 text-xs'

  return (
    <div className="relative" ref={box}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Assigned to ${label}`}
        onDragStart={(e) => e.preventDefault()}
        className={`flex items-center gap-1 text-[#6B6858] outline-none transition hover:border-[#C1502E]/40 focus-visible:border-[#C1502E] disabled:opacity-50 ${trigger}`}
      >
        <Users className="h-3 w-3 shrink-0 text-[#C9C6B8]" />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-[#C9C6B8]" />
      </button>

      {open && (
        <div
          className={`absolute z-30 max-h-60 w-56 overflow-y-auto rounded-lg border border-[#E8E5DC] bg-white py-1 shadow-lg ${
            placement.align === 'right' ? 'right-0' : 'left-0'
          } ${placement.up ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[#8A8778]">Nobody to assign yet.</p>
          ) : (
            options.map((o) => {
              const isOn = selected.includes(o.id)
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[#26251F] transition hover:bg-[#FAF9F6]"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isOn ? 'border-[#C1502E] bg-[#C1502E] text-white' : 'border-[#C9C6B8] text-transparent'
                    }`}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="truncate">
                    {o.name}
                    {o.id === currentUserId && <span className="text-[#8A8778]"> (you)</span>}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
