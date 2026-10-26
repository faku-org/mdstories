import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

/** Native modal dialog: focus trap, Esc and the backdrop come for free. Children mount only while open. */
export function Dialog({ open, onClose, title, children, className = '' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto max-h-[85vh] w-[min(560px,92vw)] flex-col overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60 open:flex ${className}`}
    >
      {open && (
        <>
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id={titleId} className="text-sm font-semibold">
              {title}
            </h2>
            <button type="button" onClick={onClose} title="Cerrar (Esc)" className="rounded-md p-1.5 max-md:p-3 text-ink-muted hover:bg-white/[0.08] hover:text-ink">
              <X className="size-4" />
              <span className="sr-only">Cerrar</span>
            </button>
          </header>
          {children}
        </>
      )}
    </dialog>
  )
}
