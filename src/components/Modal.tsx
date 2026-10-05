import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Bottom-sheet style modal (mobile) / centered dialog (desktop).
 *
 * Layout: header (fixed) + scrollable body + sticky footer.
 * Forms should use <ModalBody> for fields and <ModalFooter> for the
 * Save / Cancel buttons so the actions are always visible on phones,
 * even when the form is long or the browser chrome is showing.
 *
 * Rendered through a portal on <body> so it is not trapped inside the
 * page's stacking context (otherwise the bottom nav covers the footer).
 */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  // Lock background page scroll while the modal is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4 no-print">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="modal-panel relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-cream shadow-xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-cream-dark bg-cream px-4 py-3">
          <h2 className="text-base font-bold text-navy">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-navy/60 hover:bg-cream-dark"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/** Scrollable content area of a modal. */
export function ModalBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

/** Always-visible action bar pinned to the bottom of a modal. */
export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="modal-footer shrink-0 border-t border-cream-dark bg-cream px-4 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      {children}
    </div>
  )
}
