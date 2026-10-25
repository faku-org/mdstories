import { createStore, del, set, values } from 'idb-keyval'
import { getCustomFonts, setCustomFonts, type FontDef } from './fonts'

/**
 * Fonts the user brings in: Google Fonts (downloaded once) or a local file. Face data is kept in IndexedDB and
 * exposed as a real `@font-face` in a <style> element with data: URLs, so the browser renders it, pagination
 * measures it, and html-to-image can read the rule and inline it into exported PNGs.
 */

export interface StoredFace {
  style: 'normal' | 'italic'
  /** CSS font-weight: '400' or a range like '100 900'. */
  weight: string
  unicodeRange?: string
  format: 'woff2' | 'woff' | 'truetype' | 'opentype'
  data: Blob
}

export interface StoredFont {
  id: string
  label: string
  source: 'google' | 'file'
  kind: FontDef['kind']
  min: number
  max: number
  faces: StoredFace[]
  createdAt: number
}

export const MAX_FILE_BYTES = 8 * 1024 * 1024

const store = createStore('md-stories-fonts', 'fonts')
const MIME: Record<StoredFace['format'], string> = { woff2: 'font/woff2', woff: 'font/woff', truetype: 'font/ttf', opentype: 'font/otf' }

const shortId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8)

function toDef(f: StoredFont): FontDef {
  return { id: f.id, label: f.label, family: `'mdsf-${f.id.slice('custom:'.length)}'`, min: f.min, max: f.max, kind: f.kind, custom: true }
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

async function fontFaceCss(f: StoredFont): Promise<string> {
  const family = toDef(f).family
  const rules = await Promise.all(
    f.faces.map(async (face) => {
      const url = await toDataUrl(new Blob([face.data], { type: MIME[face.format] }))
      const range = face.unicodeRange ? `unicode-range:${face.unicodeRange};` : ''
      return `@font-face{font-family:${family};font-style:${face.style};font-weight:${face.weight};font-display:block;src:url(${url}) format('${face.format}');${range}}`
    }),
  )
  return rules.join('\n')
}

const styleId = (id: string) => `mds-font-${id.replace(':', '-')}`

async function applyStyle(f: StoredFont) {
  const css = await fontFaceCss(f)
  let el = document.getElementById(styleId(f.id))
  if (!el) {
    el = document.createElement('style')
    el.id = styleId(f.id)
    document.head.append(el)
  }
  el.textContent = css
}

/** Loads every stored font into the page and into the font registry. Call once at startup. */
export async function initCustomFonts() {
  try {
    const all = await values<StoredFont>(store)
    all.sort((a, b) => a.createdAt - b.createdAt)
    await Promise.all(all.map(applyStyle))
    setCustomFonts(all.map(toDef))
  } catch {
    // IndexedDB can be unavailable (private windows); the built-in fonts keep working.
  }
}

async function save(f: StoredFont) {
  await set(f.id, f, store)
  await applyStyle(f)
  setCustomFonts([...getCustomFonts().filter((x) => x.id !== f.id), toDef(f)])
}

export async function removeCustomFont(id: string) {
  await del(id, store)
  document.getElementById(styleId(id))?.remove()
  setCustomFonts(getCustomFonts().filter((x) => x.id !== id))
}

/** Reuses the id when a font with the same name already exists, so re-importing updates it. */
function idFor(label: string): string {
  const prev = getCustomFonts().find((f) => f.label.toLowerCase() === label.toLowerCase())
  return prev?.id ?? `custom:${shortId()}`
}

// ---------- Google Fonts ----------

/** Accepts a name ("Playfair Display"), a fonts.google.com/specimen link or a css2?family= URL. */
export function parseGoogleFamily(input: string): string {
  const text = input.trim()
  const fromQuery = /[?&]family=([^&:]+)/.exec(text)?.[1]
  const fromSpecimen = /fonts\.google\.com\/(?:specimen|share)\/([^/?#]+)/.exec(text)?.[1]
  const raw = fromQuery ?? fromSpecimen ?? text
  let name = raw
  try {
    name = decodeURIComponent(raw)
  } catch {
    // keep the raw text
  }
  return name.replace(/[+_]/g, ' ').replace(/\s+/g, ' ').trim()
}

const API = 'https://fonts.googleapis.com/css2?family='

/**
 * Google answers 400 (without CORS headers, so it surfaces as a network error) for a weight range the family
 * doesn't have, and there is no CORS-readable metadata to ask first. So try the usual variable ranges in parallel.
 */
/** Two rounds: the common ranges first, so most families never trigger the rest of the (console-visible) failed probes. */
const RANGES = [
  ['100..900', '200..900', '300..900', '400..900'],
  ['500..900', '100..800', '200..800', '300..800', '400..800', '100..700', '200..700', '300..700', '400..700', '100..1000'],
]
const variableQueries = (ranges: string[]) => ranges.flatMap((r) => [`ital,wght@0,${r};1,${r}`, `wght@${r}`])
/** Static families: a few fixed weights, then whatever the default gives. */
const STATIC_QUERIES = ['ital,wght@0,400;0,700;1,400;1,700', 'wght@400;700', '']

interface ParsedFace {
  style: StoredFace['style']
  weight: string
  unicodeRange?: string
  url: string
}

function parseCss(css: string): ParsedFace[] {
  const faces: ParsedFace[] = []
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = m[1]
    const url = /url\((https:[^)]+)\)\s*format\(['"]woff2['"]\)/.exec(body)?.[1]
    if (!url) continue
    const style = /font-style:\s*italic/.test(body) ? 'italic' : 'normal'
    const w = /font-weight:\s*(\d+)(?:\s+(\d+))?/.exec(body)
    const weight = w ? (w[2] ? `${w[1]} ${w[2]}` : w[1]) : '400'
    const unicodeRange = /unicode-range:\s*([^;]+)/.exec(body)?.[1].trim()
    faces.push({ style, weight, unicodeRange, url })
  }
  return faces
}

/** Spanish needs latin (and latin-ext for a few letters); skip cyrillic, greek, cjk… subsets to keep the download small. */
const isLatin = (f: ParsedFace) => !f.unicodeRange || /U\+0000-00FF|U\+0100/.test(f.unicodeRange)

export async function importGoogleFont(input: string): Promise<StoredFont> {
  const family = parseGoogleFamily(input)
  if (!family) throw new Error('Escribí el nombre de la fuente.')

  const query = async (q: string): Promise<ParsedFace[]> => {
    try {
      const res = await fetch(`${API}${encodeURIComponent(family).replace(/%20/g, '+')}${q ? `:${q}` : ''}&display=swap`)
      return res.ok ? parseCss(await res.text()) : []
    } catch {
      return []
    }
  }
  const span = (faces: ParsedFace[]) => {
    const w = faces.flatMap((f) => f.weight.split(' ').map(Number))
    return Math.max(...w) - Math.min(...w)
  }

  // Prefer variable families with italics, then the widest weight range.
  let variable: ParsedFace[][] = []
  for (const round of RANGES) {
    variable = (await Promise.all(variableQueries(round).map(query))).filter((f) => f.length)
    if (variable.length) break
  }
  variable.sort((a, b) => Number(b.some((f) => f.style === 'italic')) - Number(a.some((f) => f.style === 'italic')) || span(b) - span(a))
  let parsed = variable[0] ?? []
  for (const q of STATIC_QUERIES) {
    if (parsed.length) break
    parsed = await query(q)
  }
  if (!parsed.length) throw new Error(navigator.onLine ? `Google Fonts no tiene “${family}”. Revisá el nombre.` : 'Sin conexión: no se pudo consultar Google Fonts.')

  const latin = parsed.filter(isLatin)
  const chosen = latin.length ? latin : parsed.slice(0, 2)
  let faces: StoredFace[]
  try {
    faces = await Promise.all(
      chosen.map(async (f) => {
        const res = await fetch(f.url)
        if (!res.ok) throw new Error(String(res.status))
        return { style: f.style, weight: f.weight, unicodeRange: f.unicodeRange, format: 'woff2' as const, data: await res.blob() }
      }),
    )
  } catch {
    throw new Error('No se pudieron descargar los archivos de la fuente.')
  }

  const weights = chosen.flatMap((f) => f.weight.split(' ').map(Number))
  const font: StoredFont = {
    id: idFor(family),
    label: family,
    source: 'google',
    kind: 'sans',
    min: Math.min(...weights),
    max: Math.max(...weights),
    faces,
    createdAt: Date.now(),
  }
  await save(font)
  return font
}

// ---------- local files ----------

const FORMATS: Record<string, StoredFace['format']> = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' }

export const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''
export const isFontFile = (name: string) => extOf(name) in FORMATS

export const labelFromFile = (name: string) =>
  name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s*(variable|regular|\[.*\])\s*$/i, '')
    .trim()

export async function importFontFile(file: File, opts: { label: string; variable: boolean; weight: number }): Promise<StoredFont> {
  const format = FORMATS[extOf(file.name)]
  if (!format) throw new Error('Usá un archivo .woff2, .woff, .ttf u .otf.')
  if (file.size > MAX_FILE_BYTES) throw new Error('El archivo pesa más de 8 MB.')
  const label = opts.label.trim() || labelFromFile(file.name) || 'Mi fuente'
  const bytes = await file.arrayBuffer()

  // Parse check: the browser must accept the file as a font before it is stored.
  try {
    await new FontFace('mdsf-check', bytes.slice(0)).load()
  } catch {
    throw new Error('No se pudo leer la fuente: el archivo está dañado o no es una fuente.')
  }

  const min = opts.variable ? 100 : opts.weight
  const max = opts.variable ? 900 : opts.weight
  const font: StoredFont = {
    id: idFor(label),
    label,
    source: 'file',
    kind: 'sans',
    min,
    max,
    faces: [{ style: 'normal', weight: opts.variable ? '100 900' : String(opts.weight), format, data: new Blob([bytes], { type: MIME[format] }) }],
    createdAt: Date.now(),
  }
  await save(font)
  return font
}
