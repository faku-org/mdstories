export type ToastData = { text: string; action?: { label: string; run: () => void } }

export function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2">
      {toast && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-2.5 text-sm shadow-xl ring-1 ring-line">
          {toast.text}
          {toast.action && (
            <button
              type="button"
              className="font-semibold text-accent"
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
