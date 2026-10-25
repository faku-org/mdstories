import {
  ArrowRight,
  AtSign,
  BookOpen,
  Bookmark,
  Check,
  ChevronRight,
  ChevronsRight,
  CircleCheck,
  Coffee,
  Diamond,
  Eye,
  Feather,
  Flame,
  Hash,
  Heart,
  Leaf,
  Lightbulb,
  MessageCircle,
  Moon,
  MoveRight,
  PenLine,
  Pin,
  Quote,
  Rocket,
  Sparkles,
  Square,
  Star,
  Sun,
  Target,
  Triangle,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

export interface IconProps {
  className?: string
  size?: number | string
  strokeWidth?: number
}
export type IconComp = ComponentType<IconProps>

export interface IconEntry {
  id: string
  label: string
  /** Extra search terms (brand aliases). */
  keywords?: string
  Icon: IconComp
}

/**
 * Icon ids: a bare kebab name is a Lucide icon ('arrow-right'), `si:<slug>` is a Simple Icons brand ('si:github').
 * The curated set below is bundled; every other icon comes from a lazy chunk, loaded on demand.
 */
export const BRAND_PREFIX = 'si:'

/** Quick picks shown in the picker grid. */
export const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  star: Star,
  zap: Zap,
  flame: Flame,
  heart: Heart,
  lightbulb: Lightbulb,
  target: Target,
  rocket: Rocket,
  'book-open': BookOpen,
  feather: Feather,
  'pen-line': PenLine,
  quote: Quote,
  leaf: Leaf,
  sun: Sun,
  moon: Moon,
  coffee: Coffee,
  'message-circle': MessageCircle,
  eye: Eye,
  bookmark: Bookmark,
  pin: Pin,
  hash: Hash,
  'at-sign': AtSign,
  check: Check,
  'circle-check': CircleCheck,
  'arrow-right': ArrowRight,
  'move-right': MoveRight,
  'chevron-right': ChevronRight,
  'chevrons-right': ChevronsRight,
  diamond: Diamond,
  triangle: Triangle,
  square: Square,
}

export const ICON_IDS = Object.keys(ICONS)

// ---------- lazy catalogs ----------

const loaded = new Map<string, IconComp>()
const listeners = new Set<() => void>()

const norm = (s: string) => s.replace(/[^a-z0-9]/gi, '').toLowerCase()

const toKebab = (pascal: string) =>
  pascal
    .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
    .replace(/([0-9])([A-Za-z])/g, '$1-$2')
    .toLowerCase()

interface Catalog {
  list: IconEntry[]
  byNorm: Map<string, IconEntry>
}

function catalog(list: IconEntry[], key: (e: IconEntry) => string): Catalog {
  return { list, byNorm: new Map(list.map((e) => [norm(key(e)), e])) }
}

let lucideCatalog: Promise<Catalog> | undefined
let brandCatalog: Promise<Catalog> | undefined

export function loadLucide(): Promise<Catalog> {
  // Deep import on purpose: `import('lucide-react')` resolves to the package barrel the app already uses
  // statically, so the bundler would fold every icon into the main chunk.
  lucideCatalog ??= import('lucide-react/dist/esm/icons/index.mjs').then((icons) =>
    catalog(
      Object.entries(icons).map(([key, Icon]) => ({ id: toKebab(key), label: toKebab(key), Icon: Icon as IconComp })),
      (e) => e.id,
    ),
  )
  lucideCatalog.catch(() => (lucideCatalog = undefined))
  return lucideCatalog
}

function brandComp(path: string): IconComp {
  return ({ className, size = 24 }) =>
    createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: size, height: size, fill: 'currentColor', className, 'aria-hidden': true }, createElement('path', { d: path }))
}

export function loadBrands(): Promise<Catalog> {
  brandCatalog ??= import('virtual:brands').then(({ default: rows }) =>
    catalog(
      rows.map(([slug, title, path, ...aka]) => ({ id: BRAND_PREFIX + slug, label: title, keywords: aka.join(' '), Icon: brandComp(path) })),
      (e) => e.id.slice(BRAND_PREFIX.length),
    ),
  )
  brandCatalog.catch(() => (brandCatalog = undefined))
  return brandCatalog
}

export const isBrand = (id: string) => id.startsWith(BRAND_PREFIX)

/** Synchronous lookup: curated icons and anything already loaded. */
export function getIconSync(id: string): IconComp | undefined {
  return ICONS[id] ?? loaded.get(id)
}

export async function loadIcon(id: string): Promise<IconComp | undefined> {
  const hit = getIconSync(id)
  if (hit) return hit
  const cat = await (isBrand(id) ? loadBrands() : loadLucide())
  const entry = cat.byNorm.get(norm(isBrand(id) ? id.slice(BRAND_PREFIX.length) : id))
  if (entry) {
    loaded.set(id, entry.Icon)
    listeners.forEach((l) => l())
  }
  return entry?.Icon
}

/** Resolves every id and resolves when all are cached (unknown ids are ignored). */
export const ensureIcons = (ids: string[]) => Promise.allSettled(ids.filter((id) => !getIconSync(id)).map(loadIcon))

export function subscribeIcons(fn: () => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

// ---------- static markup for generated HTML ----------

const cache = new Map<string, string>()

/** Static SVG markup for icons that live inside generated HTML (bullets, task lists). */
export function iconSvg(id: string, strokeWidth = 2.25): string {
  const key = `${id}:${strokeWidth}`
  let svg = cache.get(key)
  if (!svg) {
    const Icon = getIconSync(id)
    svg = renderToStaticMarkup(createElement(Icon ?? Sparkles, { size: 24, strokeWidth }))
    // Don't keep the placeholder: the real icon may still be loading.
    if (Icon) cache.set(key, svg)
  }
  return svg
}
