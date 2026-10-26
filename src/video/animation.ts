import { Easing, interpolate } from 'remotion'

export type AnimationKind = 'fade' | 'slide' | 'words'

export const ANIMATIONS: { value: AnimationKind; label: string; hint: string }[] = [
  { value: 'fade', label: 'Aparecer', hint: 'Cada bloque aparece con un fundido.' },
  { value: 'slide', label: 'Subir', hint: 'Cada bloque sube un poco mientras aparece.' },
  { value: 'words', label: 'Palabra por palabra', hint: 'El texto se va revelando a un ritmo de lectura.' },
]

export const FPS = 30

export interface VideoStory {
  html: string
  /** Per-page style overrides from paginate(), when the text was shrunk to fit. */
  vars?: Record<string, string>
  /** Position in the whole sequence (for "02 / 07") and its length in frames. */
  index: number
  frames: number
}

export const totalFrames = (stories: VideoStory[]) => stories.reduce((n, s) => n + s.frames, 0)

/** Reading pace for the automatic duration. */
const WORDS_PER_SECOND = 4
export const MIN_SECONDS = 4
export const MAX_SECONDS = 20

export function wordCount(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0
}

export function storySeconds(html: string, fixed: number | null): number {
  if (fixed) return fixed
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.ceil(wordCount(html) / WORDS_PER_SECOND) + 2))
}

const ease = Easing.out(Easing.cubic)

/** Eased 0..1 over [start, start + len] frames. */
const ramp = (frame: number, start: number, len: number) => interpolate(frame, [start, start + len], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })

function show(el: Element | null, p: number, lift = 0) {
  if (!el) return
  const s = (el as HTMLElement).style
  s.opacity = String(p)
  s.transform = lift && p < 1 ? `translateY(${((1 - p) * lift).toFixed(2)}px)` : ''
}

/** Wraps every word of the story text in a span, once, so words can be revealed one by one. */
function wrapWords(content: HTMLElement) {
  if (content.dataset.words) return
  content.dataset.words = '1'
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT)
  const texts: Text[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!n.parentElement?.closest('.sb, svg')) texts.push(n as Text)
  for (const t of texts) {
    const frag = document.createDocumentFragment()
    for (const part of t.data.split(/(\s+)/)) {
      if (!part) continue
      if (/^\s+$/.test(part)) frag.append(part)
      else {
        const w = document.createElement('span')
        w.className = 'w'
        w.textContent = part
        frag.append(w)
      }
    }
    t.replaceWith(frag)
  }
}

/**
 * Sets the visual state of one story for a given frame. Pure function of the frame, so seeking
 * (Player) and frame-by-frame rendering give the same picture.
 */
export function applyAnimation(root: HTMLElement, frame: number, frames: number, kind: AnimationKind) {
  const content = root.querySelector<HTMLElement>('.story-content')
  if (!content) return
  show(root.querySelector('.story-header'), ramp(frame, 0, 10))
  show(root.querySelector('.story-footer'), ramp(frame, 0, 10))

  const blocks = Array.from(content.children)
  const start = 8

  if (kind !== 'words') {
    const stagger = Math.min(8, Math.floor(FPS / Math.max(blocks.length, 1)) + 2)
    blocks.forEach((b, i) => show(b, ramp(frame, start + i * stagger, 14), kind === 'slide' ? 28 : 0))
    return
  }

  wrapWords(content)
  const words = Array.from(content.querySelectorAll('.w'))
  // Reveal over at most 65 % of the story; faster for short texts.
  const span = Math.min(frames * 0.65, Math.max(words.length * 2.4, 20))
  const at = (i: number) => start + (words.length > 1 ? (i / (words.length - 1)) * span : 0)
  words.forEach((w, i) => show(w, ramp(frame, at(i), 6)))

  let seen = 0
  blocks.forEach((b, bi) => {
    const own = b.querySelectorAll('.w').length
    if (own === 0) {
      // Rules, images and tables follow their position in the sequence.
      show(b, ramp(frame, start + (bi / Math.max(blocks.length - 1, 1)) * span, 10))
    } else {
      show(b, 1)
      // Bullets and numbers appear with the first word of their item.
      b.querySelectorAll('li').forEach((li) => {
        const first = li.querySelector('.w')
        const idx = first ? words.indexOf(first) : seen
        show(li.querySelector(':scope > .sb'), ramp(frame, at(Math.max(idx, 0)), 8))
      })
    }
    seen += own
  })
}
