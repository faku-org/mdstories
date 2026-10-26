export interface Page {
  html: string
  /** A single block that cannot fit even alone (huge image, giant heading). */
  overflow: boolean
  /** Style overrides for this page, set when its section was shrunk to fit. */
  vars?: Record<string, string>
}

const UNSPLITTABLE = /^(H[1-6]|HR|IMG|FIGURE|TABLE)$/
/** Don't start a block at the bottom of a page with fewer words than this. */
const MIN_HEAD_WORDS = 4
/** A section whose last page holds this many words or fewer is refitted with smaller parameters. */
const SPILL_WORDS = 10
/** Parameter scales tried in order, from gentle to tight. */
const SHRINK_STEPS = [0.96, 0.92, 0.88, 0.84, 0.8]

interface Pos {
  node: Text
  offset: number
}

/**
 * Fills pages block by block, measuring real layout in `measure` (an unscaled
 * content box at the final width). Blocks that overflow are split at the last
 * word that fits, keeping inline markup intact via Range.cloneContents.
 * A section that spills a few words onto an extra page is refitted with the
 * parameters from `varsAt(scale)` (smaller text and spacing) so it fits.
 */
export function paginate(sections: string[][], measure: HTMLElement, maxH: number, varsAt: (scale: number) => Record<string, string>): Page[] {
  const pages: Page[] = []

  for (const section of sections) {
    let result = paginateSection(section, measure, maxH)
    if (result.length > 1 && wordCount(result[result.length - 1].html) <= SPILL_WORDS) {
      for (const scale of SHRINK_STEPS) {
        const vars = varsAt(scale)
        const fitted = withVars(measure, vars, () => paginateSection(section, measure, maxH, vars))
        if (fitted.length < result.length) {
          result = fitted
          break
        }
      }
    }
    pages.push(...result)
  }

  measure.innerHTML = ''
  return pages.length ? pages : [{ html: '', overflow: false }]
}

function paginateSection(section: string[], measure: HTMLElement, maxH: number, vars?: Record<string, string>): Page[] {
  const fits = (blocks: string[]) => {
    measure.innerHTML = blocks.join('')
    return measure.offsetHeight <= maxH + 0.5
  }

  const pages: Page[] = []
  const queue = [...section]
  let cur: string[] = []
  let over = false

  const flush = () => {
    // A heading never ends a page: carry it to the next one with its content.
    const carry: string[] = []
    while (cur.length > 1 && /^<h[1-6]/i.test(cur[cur.length - 1])) carry.unshift(cur.pop()!)
    pages.push({ html: cur.join(''), overflow: over, vars })
    cur = []
    over = false
    queue.unshift(...carry)
  }

  while (queue.length) {
    const html = queue.shift()!
    if (fits([...cur, html])) {
      cur.push(html)
      continue
    }

    const el = toElement(html)
    if (el && !UNSPLITTABLE.test(el.tagName)) {
      const ends = wordEnds(el)
      let lo = 0
      let hi = ends.length - 2
      let best = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (fits([...cur, cut(el, ends[mid], 'head')])) {
          best = mid
          lo = mid + 1
        } else hi = mid - 1
      }
      const minWords = cur.length ? MIN_HEAD_WORDS : 1
      if (best + 1 >= minWords) {
        cur.push(cut(el, ends[best], 'head'))
        queue.unshift(cut(el, ends[best], 'tail'))
        flush()
        continue
      }
    }

    if (cur.length === 0) {
      cur.push(html)
      over = true
      flush()
    } else {
      flush()
      queue.unshift(html)
    }
  }
  if (cur.length) flush()
  return pages
}

/** Runs `fn` with style overrides set on the measured story root, then restores the previous inline values. */
function withVars<T>(measure: HTMLElement, vars: Record<string, string>, fn: () => T): T {
  const root = measure.closest<HTMLElement>('.story') ?? measure
  const prev = Object.keys(vars).map((k) => [k, root.style.getPropertyValue(k)] as const)
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  try {
    return fn()
  } finally {
    for (const [k, v] of prev) root.style.setProperty(k, v)
  }
}

const wordCount = (html: string) => (html.replace(/<[^>]+>/g, ' ').match(/\S+/g) ?? []).length

function toElement(html: string): Element | null {
  const box = document.createElement('div')
  box.innerHTML = html
  return box.firstElementChild
}

const inBullet = (n: Node) => !!n.parentElement?.closest('.sb')

function wordEnds(el: Element): Pos[] {
  const res: Pos[] = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (inBullet(n)) continue
    const text = n as Text
    const re = /\S+/g
    for (let m = re.exec(text.data); m; m = re.exec(text.data)) {
      res.push({ node: text, offset: m.index + m[0].length })
    }
  }
  return res
}

function cut(el: Element, pos: Pos, part: 'head' | 'tail'): string {
  const r = document.createRange()
  if (part === 'head') {
    r.setStart(el, 0)
    r.setEnd(pos.node, pos.offset)
  } else {
    r.setStart(pos.node, pos.offset)
    r.setEnd(el, el.childNodes.length)
  }
  const out = el.cloneNode(false) as Element
  out.append(r.cloneContents())
  prune(out)
  if (part === 'tail') {
    trimLeading(out)
    out.setAttribute('data-cont', '')
  }
  return out.outerHTML
}

function realText(el: Element): string {
  let s = ''
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!inBullet(n)) s += (n as Text).data
  return s
}

/** Drops elements left empty by the cut (e.g. a list item whose text went to the other half). */
function prune(root: Element) {
  for (const el of Array.from(root.querySelectorAll('*')).reverse()) {
    if (el.closest('.sb') || el.closest('svg') || /^(IMG|BR|HR)$/.test(el.tagName)) continue
    if (!realText(el).trim() && !el.querySelector('img, hr')) el.remove()
  }
}

function trimLeading(root: Element) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (inBullet(n)) continue
    const t = n as Text
    t.data = t.data.replace(/^\s+/, '')
    if (t.data) return
  }
}
