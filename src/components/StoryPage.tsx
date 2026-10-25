import type { Ref } from 'react'
import { storyVars } from '../storyVars'
import type { StoryStyle } from '../types'
import { Icon } from './Icon'

interface Props {
  style: StoryStyle
  /** null = measurement page: the content box is left for paginate() to fill. */
  html: string | null
  index: number
  total: number
  rootRef?: Ref<HTMLDivElement>
  areaRef?: Ref<HTMLDivElement>
  contentRef?: Ref<HTMLDivElement>
}

function StoryHeader({ brand }: { brand: StoryStyle['brand'] }) {
  return (
    <header className="story-header">
      {brand.logo ? <img src={brand.logo} alt="" /> : brand.icon && <Icon id={brand.icon} strokeWidth={2} />}
      {brand.handle && <span>{brand.handle}</span>}
    </header>
  )
}

function StoryFooter({ brand, index, total }: { brand: StoryStyle['brand']; index: number; total: number }) {
  const pad = Math.max(2, String(total).length)
  const counter = brand.showPageNumber && total > 1 ? `${String(index + 1).padStart(pad, '0')} / ${String(total).padStart(pad, '0')}` : ''
  return (
    <footer className="story-footer">
      <span>{counter}</span>
      {brand.showContinue && (
        // Hidden, not removed, on the last story so every story keeps the same content height.
        <span className="cont" style={{ visibility: index >= total - 1 ? 'hidden' : 'visible' }}>
          {brand.continueLabel}
          <Icon id={brand.continueIcon} strokeWidth={2.25} />
        </span>
      )}
    </footer>
  )
}

export function StoryPage({ style, html, index, total, rootRef, areaRef, contentRef }: Props) {
  const b = style.brand
  const content = {
    className: 'story-content',
    'data-align': style.align,
    'data-hl': style.highlightStrong || undefined,
  }
  return (
    <div ref={rootRef} className="story" style={storyVars(style)}>
      <div className="story-safe">
        {b.showHeader && <StoryHeader brand={b} />}
        <div ref={areaRef} className="story-area">
          {/* html is DOMPurify-sanitized in mdToSections; paginate() only re-serializes it. */}
          {html === null ? <div ref={contentRef} {...content} /> : <div {...content} dangerouslySetInnerHTML={{ __html: html }} />}
        </div>
        {(b.showPageNumber || b.showContinue) && <StoryFooter brand={b} index={index} total={total} />}
      </div>
    </div>
  )
}
