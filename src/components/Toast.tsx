export type ToastData = { text: string; action?: { label: string; run: () => void } }

export function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 w-max max-w-[92vw] -translate-x-1/2 max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom))]">
      {toast && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-2.5 text-sm max-md:py-3 shadow-xl ring-1 ring-line">
          {toast.text}
          {toast.action && (
            <button
              type="button"
              className="px-1 font-semibold text-accent max-md:py-2"
              onClick={() => {
                toast.action?.run()
                onClose()
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
