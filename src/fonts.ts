import '@fontsource-variable/inter'
import '@fontsource-variable/inter/wght-italic.css'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/wght-italic.css'
import '@fontsource-variable/playfair-display'
import '@fontsource-variable/playfair-display/wght-italic.css'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/dm-sans/wght-italic.css'
import '@fontsource-variable/manrope'
import '@fontsource-variable/outfit'
import '@fontsource-variable/lora'
import '@fontsource-variable/lora/wght-italic.css'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/bricolage-grotesque'

export interface FontDef {
  id: string
  label: string
  family: string
  min: number
  max: number
  kind: 'sans' | 'serif' | 'mono'
  /** Imported by the user (Google Fonts or a file); lives in IndexedDB, see customFonts.ts. */
  custom?: boolean
}

export const FONTS: FontDef[] = [
  { id: 'inter', label: 'Inter', family: "'Inter Variable'", min: 100, max: 900, kind: 'sans' },
  { id: 'dm-sans', label: 'DM Sans', family: "'DM Sans Variable'", min: 100, max: 1000, kind: 'sans' },
  { id: 'manrope', label: 'Manrope', family: "'Manrope Variable'", min: 200, max: 800, kind: 'sans' },
  { id: 'outfit', label: 'Outfit', family: "'Outfit Variable'", min: 100, max: 900, kind: 'sans' },
  { id: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk Variable'", min: 300, max: 700, kind: 'sans' },
  { id: 'bricolage', label: 'Bricolage Grotesque', family: "'Bricolage Grotesque Variable'", min: 200, max: 800, kind: 'sans' },
  { id: 'fraunces', label: 'Fraunces', family: "'Fraunces Variable'", min: 100, max: 900, kind: 'serif' },
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display Variable'", min: 400, max: 900, kind: 'serif' },
  { id: 'lora', label: 'Lora', family: "'Lora Variable'", min: 400, max: 700, kind: 'serif' },
  { id: 'jetbrains', label: 'JetBrains Mono', family: "'JetBrains Mono Variable'", min: 100, max: 800, kind: 'mono' },
]

export const MONO = FONTS.find((f) => f.id === 'jetbrains')!

// Fonts the user imported. They load after startup, so the list is observable.
let customList: FontDef[] = []
const listeners = new Set<() => void>()

export const getCustomFonts = () => customList
export function setCustomFonts(list: FontDef[]) {
  customList = list
  listeners.forEach((l) => l())
}
export function subscribeFonts(fn: () => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

/** Unknown ids (a deleted custom font) fall back to the first built-in. */
export function getFont(id: string): FontDef {
  return FONTS.find((f) => f.id === id) ?? customList.find((f) => f.id === id) ?? FONTS[0]
}

export function fontStack(f: FontDef): string {
  const fallback = f.kind === 'serif' ? 'Georgia, serif' : f.kind === 'mono' ? 'ui-monospace, monospace' : 'system-ui, sans-serif'
  return `${f.family}, ${fallback}`
}

export function clampWeight(f: FontDef, w: number): number {
  return Math.min(f.max, Math.max(f.min, w))
}

const SAMPLE = 'Aá éñü ¿¡'

/** Loads the faces a page needs so measurement uses real metrics. */
export async function ensureFonts(ids: string[], weights: number[]): Promise<void> {
  const loads: Promise<unknown>[] = []
  for (const id of ids) {
    const f = getFont(id)
    for (const w of weights) {
      const cw = clampWeight(f, w)
      // Sample text pulls in the accented-letter subset of imported fonts too.
      loads.push(document.fonts.load(`${cw} 48px ${f.family}`, SAMPLE))
      loads.push(document.fonts.load(`italic ${cw} 48px ${f.family}`, SAMPLE))
    }
  }
  loads.push(document.fonts.load(`400 48px ${MONO.family}`))
  await Promise.allSettled(loads)
  await document.fonts.ready
}
