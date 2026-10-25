import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ensureFonts } from './fonts'
import { mdToSections } from './markdown'
import { paginate, type Page } from './paginate'
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
  const sections = useMemo(() => mdToSections(md, style.bullet, style.hrBreak), [md, style.bullet, style.hrBreak])

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
      setPages(paginate(sections, measureRef.current, areaRef.current.clientHeight))
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [sections, style, fontTick])

  return { pages, measureRef, areaRef }
}
