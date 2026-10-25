import { useEffect, useRef } from 'react'

/**
 * The only place keyboard shortcuts are defined. `useShortcuts` installs one listener from this list and
 * the help overlay (`?`) renders it, so what the app does and what the help says cannot drift apart.
 *
 * Keys: `mod` = Ctrl (⌘ on Mac). Combos with `mod` work while typing; plain keys do not.
 */
export type ShortcutId = 'prev' | 'next' | 'first' | 'last' | 'save' | 'exportOne' | 'exportAll' | 'preview' | 'exitPreview' | 'safeZones' | 'help'

export type ShortcutGroup = 'Historias' | 'Archivo' | 'Vista' | 'Ayuda'

export interface Shortcut {
  id: ShortcutId
  keys: string
  label: string
  group: ShortcutGroup
}

export const SHORTCUTS: Shortcut[] = [
  { id: 'prev', keys: 'arrowleft', label: 'Historia anterior', group: 'Historias' },
  { id: 'next', keys: 'arrowright', label: 'Historia siguiente', group: 'Historias' },
  { id: 'first', keys: 'home', label: 'Primera historia', group: 'Historias' },
  { id: 'last', keys: 'end', label: 'Última historia', group: 'Historias' },
  { id: 'save', keys: 'mod+s', label: 'Guardar en el historial', group: 'Archivo' },
  { id: 'exportOne', keys: 'mod+e', label: 'Descargar esta historia (PNG)', group: 'Archivo' },
  { id: 'exportAll', keys: 'mod+shift+e', label: 'Descargar todas las historias', group: 'Archivo' },
  { id: 'preview', keys: 'p', label: 'Modo preview: ver solo lo que se exporta', group: 'Vista' },
  { id: 'exitPreview', keys: 'escape', label: 'Salir del modo preview', group: 'Vista' },
  { id: 'safeZones', keys: 'z', label: 'Mostrar u ocultar las zonas seguras', group: 'Vista' },
  { id: 'help', keys: '?', label: 'Ver los atajos', group: 'Ayuda' },
]

export const isMac = () => /mac|iphone|ipad/i.test(navigator.platform)

const KEY_NAMES: Record<string, string> = { arrowleft: '←', arrowright: '→', escape: 'Esc', home: 'Inicio', end: 'Fin' }

/** Display parts of a combo: 'mod+shift+e' -> ['Ctrl', 'Shift', 'E']. */
export function comboParts(keys: string): string[] {
  return keys.split('+').map((k) => {
    if (k === 'mod') return isMac() ? '⌘' : 'Ctrl'
    if (k === 'shift') return isMac() ? '⇧' : 'Shift'
    return KEY_NAMES[k] ?? k.toUpperCase()
  })
}

function matches(e: KeyboardEvent, keys: string): boolean {
  const parts = keys.split('+')
  const key = parts[parts.length - 1]
  const wantMod = parts.includes('mod')
  const wantShift = parts.includes('shift')
  if (wantMod !== (e.ctrlKey || e.metaKey) || e.altKey) return false
  // Symbols like "?" already need Shift to be typed; everything else must match exactly.
  if (key.length === 1 && !/[a-z0-9]/.test(key)) return e.key === key
  return e.key.toLowerCase() === key && wantShift === e.shiftKey
}

const TYPING = 'input, textarea, select, [contenteditable], [role="separator"], [role="slider"]'

/** One window-level listener; handlers are read through a ref so they can close over fresh state. */
export function useShortcuts(handlers: Partial<Record<ShortcutId, () => void>>) {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const hit = SHORTCUTS.find((s) => matches(e, s.keys))
      const run = hit && ref.current[hit.id]
      if (!hit || !run) return
      if (!hit.keys.includes('mod')) {
        // Plain keys belong to the control that has focus and to open dialogs.
        if ((e.target as HTMLElement).closest?.(TYPING) || document.querySelector('dialog[open]')) return
      }
      e.preventDefault()
      run()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
