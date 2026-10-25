import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { iconSvg } from './icons'
import type { Bullet } from './types'

/**
 * Markdown -> sections of top-level block HTML.
 * A section always starts a new story; `---` opens one when `hrBreak` is on.
 */
export function mdToSections(md: string, bullet: Bullet, hrBreak: boolean): string[][] {
  const raw = marked.parse(md, { async: false, gfm: true, breaks: false })
  const body = DOMPurify.sanitize(raw, { RETURN_DOM: true, FORBID_TAGS: ['style', 'form'] }) as HTMLElement
  decorateLists(body, bullet)

  const sections: string[][] = [[]]
  for (const el of Array.from(body.children)) {
    if (el.tagName === 'HR' && hrBreak) {
      if (sections[sections.length - 1].length) sections.push([])
      continue
    }
    sections[sections.length - 1].push(el.outerHTML)
  }
  return sections.filter((s) => s.length)
}

/** Explicit bullet spans: they survive splitting and PNG export, unlike ::marker. */
function svgNode(doc: Document, id: string): Node {
  const svg = new DOMParser().parseFromString(iconSvg(id), 'image/svg+xml').documentElement
  return doc.importNode(svg, true)
}

function decorateLists(root: HTMLElement, bullet: Bullet) {
  const doc = root.ownerDocument
  root.querySelectorAll('li').forEach((li) => {
    const parent = li.parentElement
    const span = doc.createElement('span')
    span.className = 'sb'
    span.setAttribute('aria-hidden', 'true')

    const checkbox = li.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]')
    if (checkbox) {
      span.classList.add('task')
      span.append(svgNode(doc, (checkbox as HTMLInputElement).hasAttribute('checked') ? 'circle-check' : 'square'))
      checkbox.remove()
    } else if (parent?.tagName === 'OL') {
      const start = Number(parent.getAttribute('start') ?? 1)
      const idx = Array.from(parent.children).indexOf(li)
      span.classList.add('num')
      span.textContent = `${start + idx}.`
      parent.classList.add('ol')
    } else if (bullet === 'dot' || bullet === 'dash') {
      const mark = doc.createElement('i')
      mark.className = bullet
      span.append(mark)
    } else {
      span.append(svgNode(doc, bullet))
    }
    li.prepend(span)
  })
}

export function countWords(md: string): number {
  return md.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0
}

export function titleFromMd(md: string): string {
  const h = md.match(/^#{1,3}\s+(.+)$/m)
  return h ? h[1].replace(/[*_`#]/g, '').trim().slice(0, 80) : ''
}
