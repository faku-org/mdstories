export type Align = 'left' | 'center' | 'right' | 'justify'
/** Headings never follow the body alignment: they anchor left or right. */
export type HeadingAlign = 'left' | 'right'

export type Bullet = 'dot' | 'dash' | string

export interface StoryStyle {
  bodyFont: string
  headingFont: string
  baseSize: number
  headingScale: number
  bodyWeight: number
  headingWeight: number
  lineHeight: number
  letterSpacing: number
  headingLetterSpacing: number
  paragraphSpacing: number
  headingUppercase: boolean
  highlightStrong: boolean
  align: Align
  headingAlign: HeadingAlign
  verticalAlign: 'start' | 'center'
  bgMode: 'solid' | 'gradient'
  gradientAngle: number
  colors: {
    bg: string
    bg2: string
    text: string
    heading: string
    accent: string
    muted: string
  }
  safe: { top: number; bottom: number; side: number }
  bullet: Bullet
  hrBreak: boolean
  brand: {
    showHeader: boolean
    handle: string
    logo: string | null
    icon: string | null
    showPageNumber: boolean
    showContinue: boolean
    continueIcon: string
    continueLabel: string
  }
}

export const STORY_W = 1080
export const STORY_H = 1920

/** Instagram Stories UI: progress bar + profile row on top, reply bar at the bottom. */
export const IG_SAFE = { top: 250, bottom: 340, side: 72 }

export const DEFAULT_STYLE: StoryStyle = {
  bodyFont: 'inter',
  headingFont: 'fraunces',
  baseSize: 44,
  headingScale: 1.3,
  bodyWeight: 400,
  headingWeight: 600,
  lineHeight: 1.45,
  letterSpacing: 0,
  headingLetterSpacing: -0.02,
  paragraphSpacing: 0.8,
  headingUppercase: false,
  highlightStrong: true,
  align: 'left',
  headingAlign: 'left',
  verticalAlign: 'start',
  bgMode: 'solid',
  gradientAngle: 160,
  colors: {
    bg: '#f5f0e8',
    bg2: '#e8dcc8',
    text: '#1f1b16',
    heading: '#14110d',
    accent: '#c2410c',
    muted: '#5c5348',
  },
  safe: { ...IG_SAFE },
  bullet: 'dot',
  hrBreak: true,
  brand: {
    showHeader: true,
    handle: '@usuario',
    logo: null,
    icon: 'feather',
    showPageNumber: true,
    showContinue: true,
    continueIcon: 'arrow-right',
    continueLabel: 'Seguí',
  },
}

export interface Template {
  id: string
  name: string
  style: StoryStyle
  builtIn?: boolean
}

const preset = (id: string, name: string, patch: Partial<StoryStyle> & { colors?: Partial<StoryStyle['colors']> }): Template => ({
  id,
  name,
  builtIn: true,
  style: {
    ...DEFAULT_STYLE,
    ...patch,
    colors: { ...DEFAULT_STYLE.colors, ...patch.colors },
    brand: { ...DEFAULT_STYLE.brand, ...patch.brand },
    safe: { ...IG_SAFE },
  },
})

export const PRESETS: Template[] = [
  preset('editorial', 'Editorial', {}),
  preset('noche', 'Noche', {
    bodyFont: 'inter',
    headingFont: 'inter',
    headingWeight: 750,
    headingLetterSpacing: -0.035,
    colors: { bg: '#0f1012', bg2: '#1c1f26', text: '#e7e7ea', heading: '#ffffff', accent: '#b8f36a', muted: '#a1a1aa' },
    bullet: 'chevron-right',
  }),
  preset('degradado', 'Degradado', {
    bodyFont: 'dm-sans',
    headingFont: 'bricolage',
    headingWeight: 780,
    bgMode: 'gradient',
    gradientAngle: 155,
    align: 'center',
    verticalAlign: 'center',
    colors: { bg: '#3b1d8f', bg2: '#d9466f', text: '#fbf7ff', heading: '#ffffff', accent: '#ffd166', muted: '#eadcff' },
    bullet: 'sparkles',
  }),
  preset('terminal', 'Terminal', {
    bodyFont: 'jetbrains',
    headingFont: 'space-grotesk',
    baseSize: 38,
    lineHeight: 1.55,
    headingWeight: 700,
    headingUppercase: true,
    headingLetterSpacing: 0.02,
    colors: { bg: '#0b1410', bg2: '#0b1410', text: '#c9f5d9', heading: '#7cf0a8', accent: '#7cf0a8', muted: '#8fb9a0' },
    bullet: 'dash',
  }),
  preset('clasico', 'Clásico', {
    bodyFont: 'lora',
    headingFont: 'playfair',
    headingWeight: 700,
    headingLetterSpacing: 0,
    lineHeight: 1.55,
    align: 'justify',
    colors: { bg: '#fffdf8', bg2: '#fffdf8', text: '#2a2522', heading: '#111111', accent: '#8a1c2b', muted: '#6b5f58' },
    bullet: 'diamond',
  }),
]

/** Merges a stored style over the defaults so older saves keep working when fields are added. */
export function normalizeStyle(s: Partial<StoryStyle> | undefined): StoryStyle {
  return {
    ...DEFAULT_STYLE,
    ...s,
    colors: { ...DEFAULT_STYLE.colors, ...s?.colors },
    safe: { ...DEFAULT_STYLE.safe, ...s?.safe },
    brand: { ...DEFAULT_STYLE.brand, ...s?.brand },
  }
}
