import { comboParts, SHORTCUTS, type ShortcutGroup } from '../shortcuts'
import { Dialog } from './Dialog'

const GROUPS: ShortcutGroup[] = ['Historias', 'Archivo', 'Vista', 'Ayuda']

/** Rendered from the shortcut registry, so it always matches what the keys do. */
export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Atajos de teclado" className="w-[min(480px,92vw)]">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {GROUPS.map((g) => (
          <section key={g} className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{g}</h3>
            <dl className="space-y-1.5">
              {SHORTCUTS.filter((s) => s.group === g).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4 text-sm">
                  <dt>{s.label}</dt>
                  <dd className="flex flex-none items-center gap-1">
                    {comboParts(s.keys).map((k, i) => (
                      <kbd key={i} className="min-w-6 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-center font-mono text-xs">
                        {k}
                      </kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <p className="text-xs text-ink-muted">Las teclas sueltas no funcionan mientras escribís en un campo. Con Ctrl sí.</p>
      </div>
    </Dialog>
  )
}
