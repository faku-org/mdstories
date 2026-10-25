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
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

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

const cache = new Map<string, string>()

/** Static SVG markup for icons that live inside generated HTML (bullets, task lists). */
export function iconSvg(id: string, strokeWidth = 2.25): string {
  const key = `${id}:${strokeWidth}`
  let svg = cache.get(key)
  if (!svg) {
    const Icon = ICONS[id] ?? Sparkles
    svg = renderToStaticMarkup(createElement(Icon, { size: 24, strokeWidth }))
    cache.set(key, svg)
  }
  return svg
}
