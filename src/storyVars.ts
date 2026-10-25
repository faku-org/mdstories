import type { CSSProperties } from 'react'
import { clampWeight, fontStack, getFont, MONO } from './fonts'
import type { StoryStyle } from './types'

export function storyVars(s: StoryStyle): CSSProperties {
  const body = getFont(s.bodyFont)
  const head = getFont(s.headingFont)
  const h3 = s.baseSize * s.headingScale
  const h2 = h3 * s.headingScale
  const h1 = h2 * s.headingScale
  const c = s.colors
  return {
    '--st-bg': s.bgMode === 'gradient' ? `linear-gradient(${s.gradientAngle}deg, ${c.bg}, ${c.bg2})` : c.bg,
    '--st-text': c.text,
    '--st-heading-color': c.heading,
    '--st-accent': c.accent,
    '--st-muted': c.muted,
    '--st-body': fontStack(body),
    '--st-heading': fontStack(head),
    '--st-mono': fontStack(MONO),
    '--st-fs': `${s.baseSize}px`,
    '--st-h1': `${h1.toFixed(1)}px`,
    '--st-h2': `${h2.toFixed(1)}px`,
    '--st-h3': `${h3.toFixed(1)}px`,
    '--st-bw': clampWeight(body, s.bodyWeight),
    '--st-hw': clampWeight(head, s.headingWeight),
    '--st-lh': s.lineHeight,
    '--st-ls': `${s.letterSpacing}em`,
    '--st-hls': `${s.headingLetterSpacing}em`,
    '--st-ps': s.paragraphSpacing,
    '--st-hcase': s.headingUppercase ? 'uppercase' : 'none',
    '--st-align': s.align,
    '--st-justify': s.align === 'center' ? 'center' : s.align === 'right' ? 'flex-end' : 'flex-start',
    '--st-valign': s.verticalAlign === 'center' ? 'center' : 'flex-start',
    '--st-top': `${s.safe.top}px`,
    '--st-bottom': `${s.safe.bottom}px`,
    '--st-side': `${s.safe.side}px`,
  } as CSSProperties
}
