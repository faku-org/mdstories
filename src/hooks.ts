import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ensureFonts, getCustomFonts, subscribeFonts } from './fonts'
import { getIconSync, loadIcon, subscribeIcons } from './icons'
import { mdToSections } from './markdown'
import { paginate, type Page } from './paginate'
import { shrinkVars } from './storyVars'
import type { StoryStyle } from './types'

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

/**
 * Splits the Markdown into stories. The caller renders a hidden, unscaled
 * measurement page wired to `areaRef` (safe-area height) and `measureRef`
 * (content box). Re-runs when fonts finish loading so metrics are real.
 */
export function usePagination(md: string, style: StoryStyle) {
  const measureRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<Page[]>([{ html: '', overflow: false }])
  const [fontTick, setFontTick] = useState(0)
  // Imported fonts arrive after startup; measure again once they are registered.
  const customFonts = useSyncExternalStore(subscribeFonts, getCustomFonts)
  // A lazily loaded bullet icon (any Lucide icon or brand) is baked into the HTML, so re-split once it arrives.
  const bulletReady = useSyncExternalStore(subscribeIcons, () => style.bullet === 'dot' || style.bullet === 'dash' || !!getIconSync(style.bullet))
  useEffect(() => {
    if (!bulletReady) void loadIcon(style.bullet)
  }, [bulletReady, style.bullet])
  const sections = useMemo(() => mdToSections(md, bulletReady ? style.bullet : 'dot', style.hrBreak), [md, style.bullet, style.hrBreak, bulletReady])

  useEffect(() => {
    const bump = () => setFontTick((t) => t + 1)
    document.fonts.addEventListener('loadingdone', bump)
    return () => document.fonts.removeEventListener('loadingdone', bump)
  }, [])

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      await ensureFonts([style.bodyFont, style.headingFont], [style.bodyWeight, style.headingWeight, style.bodyWeight + 300])
      if (cancelled || !measureRef.current || !areaRef.current) return
      setPages(paginate(sections, measureRef.current, areaRef.current.clientHeight, (scale) => shrinkVars(style, scale)))
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [sections, style, fontTick, customFonts])

  return { pages, measureRef, areaRef }
}

// ---------- resizable panels ----------

const LAYOUT_KEY = 'mds:layout'

export const PANELS = {
  editor: { min: 220, max: 760, def: 420 },
  settings: { min: 280, max: 600, def: 360 },
  /** The preview never gets squeezed below this. */
  previewMin: 320,
}

interface Sizes {
  editor: number
  settings: number
}

function readSizes(): Sizes {
  try {
    const raw = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? 'null') as Partial<Sizes> | null
    const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
    return { editor: num(raw?.editor, PANELS.editor.def), settings: num(raw?.settings, PANELS.settings.def) }
  } catch {
    return { editor: PANELS.editor.def, settings: PANELS.settings.def }
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))

/**
 * Editor and settings widths in px, saved in localStorage. The stored value is the user's preference; what is
 * rendered is clamped to the window so the preview keeps its minimum (and the preference comes back on a wider window).
 */
export function usePanelSizes(containerWidth: number) {
  const [raw, setRaw] = useState(readSizes)
  const w = containerWidth
  const editor = w ? clamp(raw.editor, PANELS.editor.min, Math.min(PANELS.editor.max, w - PANELS.settings.min - PANELS.previewMin)) : raw.editor
  const settings = w ? clamp(raw.settings, PANELS.settings.min, Math.min(PANELS.settings.max, w - editor - PANELS.previewMin)) : raw.settings

  const update = (patch: Partial<Sizes>) =>
    setRaw((s) => {
      const next = { ...s, ...patch }
      try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(next))
      } catch {
        // storage blocked: the layout just won't persist
      }
      return next
    })

  return {
    editor,
    settings,
    maxEditor: Math.max(PANELS.editor.min, Math.min(PANELS.editor.max, w - settings - PANELS.previewMin)),
    maxSettings: Math.max(PANELS.settings.min, Math.min(PANELS.settings.max, w - editor - PANELS.previewMin)),
    setEditor: (v: number) => update({ editor: v }),
    setSettings: (v: number) => update({ settings: v }),
    reset: (which: keyof Sizes) => update({ [which]: PANELS[which].def }),
  }
}
