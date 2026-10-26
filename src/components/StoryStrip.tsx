import { TriangleAlert } from 'lucide-react'
import type { Page } from '../paginate'
import { STORY_H, STORY_W, type StoryStyle } from '../types'
import { StoryPage } from './StoryPage'

const SCALE = 0.1

/** Thumbnails double as the export sources: each root is registered by position. */
export function StoryStrip(props: { style: StoryStyle; pages: Page[]; current: number; onSelect: (i: number) => void; register: (i: number, el: HTMLDivElement | null) => void }) {
  const { style, pages, current, onSelect, register } = props
  return (
    <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Historias">
      {pages.map((p, i) => (
        // A story's identity is its position in the sequence; content changes on every edit.
        <li key={i} className="flex-none">
          <button
            type="button"
            onClick={() => onSelect(i)}
            aria-current={i === current}
            aria-label={`Historia ${i + 1}`}
            className={`relative block overflow-hidden rounded-md ring-2 transition ${i === current ? 'ring-accent' : 'ring-transparent hover:ring-white/20'}`}
            style={{ width: STORY_W * SCALE, height: STORY_H * SCALE }}
          >
            <div className="pointer-events-none origin-top-left" style={{ transform: `scale(${SCALE})` }}>
              <StoryPage
                style={style}
                html={p.html}
                vars={p.vars}
                index={i}
                total={pages.length}
                rootRef={(el) => register(i, el)}
              />
            </div>
            {p.overflow && <TriangleAlert className="absolute top-1 right-1 size-4 text-danger" />}
          </button>
        </li>
      ))}
    </ol>
  )
}
