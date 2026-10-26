/**
 * Renders MD Stories headlessly.
 *
 * The app is client-only: pagination measures real layout in a hidden unscaled
 * page, and the PNG export is html-to-image over the story nodes. Reimplementing
 * that on the server would drift from the browser output, so instead we drive
 * the real app in Chromium: seed the draft in localStorage, load `?render=1`
 * (which exposes the export pipeline on `window.__MDS_RENDER__`), and read the
 * PNGs back as data URLs.
 */
import { chromium, type Browser } from 'playwright'
import JSZip from 'jszip'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface RenderInput {
  md: string
  title?: string
}

export interface RenderResult {
  pages: number
  files: string[]
  zipBytes: number
  ms: number
}

const READY_TIMEOUT_MS = 60_000
const EXPORT_TIMEOUT_MS = 180_000

interface PageApi {
  ready: () => boolean
  pages: () => number
  render: () => Promise<{ pages: number; pngs: string[] }>
}

let browser: Browser | undefined

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    })
  }
  return browser
}

export async function closeBrowser(): Promise<void> {
  if (browser?.isConnected()) await browser.close()
  browser = undefined
}

/** A story draft shaped the way the editor persists it. */
function draft({ md, title }: RenderInput) {
  return { docId: crypto.randomUUID(), title: title ?? '', md }
}

export async function renderStories(
  input: RenderInput,
  opts: { baseUrl: string; outDir: string; id: string },
): Promise<RenderResult> {
  const started = performance.now()
  const instance = await getBrowser()
  const context = await instance.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  })

  const page = await context.newPage()
  page.setDefaultTimeout(EXPORT_TIMEOUT_MS)
  try {
    await page.addInitScript((value) => {
      localStorage.setItem('mds:draft', JSON.stringify(value))
    }, draft(input))

    const url = new URL('?render=1', opts.baseUrl).toString()
    await page.goto(url, { waitUntil: 'load', timeout: READY_TIMEOUT_MS })

    // Pagination is debounced (128 ms) and reruns when fonts land, so waiting for
    // a non-zero count is not enough: the count must be stable before we export.
    await page.waitForFunction(
      () => {
        const api = (window as unknown as { __MDS_RENDER__?: PageApi }).__MDS_RENDER__
        return api ? api.ready() : false
      },
      undefined,
      { timeout: READY_TIMEOUT_MS, polling: 100 },
    )

    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(
      () => {
        const api = (window as unknown as { __MDS_RENDER__?: PageApi }).__MDS_RENDER__
        if (!api) return false
        const globals = window as unknown as { __MDS_LAST__?: number; __MDS_SAME__?: number }
        const current = api.pages()
        globals.__MDS_SAME__ = globals.__MDS_LAST__ === current ? (globals.__MDS_SAME__ ?? 0) + 1 : 0
        globals.__MDS_LAST__ = current
        return globals.__MDS_SAME__ >= 3
      },
      undefined,
      { timeout: READY_TIMEOUT_MS, polling: 150 },
    )

    const rendered = await page.evaluate(async () => {
      const api = (window as unknown as { __MDS_RENDER__?: PageApi }).__MDS_RENDER__
      if (!api) throw new Error('window.__MDS_RENDER__ no existe')
      return await api.render()
    })

    if (!rendered.pages || !rendered.pngs.length) throw new Error('no se renderizó ninguna historia')

    const dir = join(opts.outDir, opts.id)
    await mkdir(dir, { recursive: true })

    const zip = new JSZip()
    const files: string[] = []
    const pad = Math.max(2, String(rendered.pngs.length).length)

    for (const [index, dataUrl] of rendered.pngs.entries()) {
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
      const bytes = Buffer.from(base64, 'base64')
      const name = `historia-${String(index + 1).padStart(pad, '0')}.png`
      await writeFile(join(dir, name), bytes)
      zip.file(name, bytes)
      files.push(name)
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    await writeFile(join(opts.outDir, `${opts.id}.zip`), zipBuffer)

    return {
      pages: files.length,
      files,
      zipBytes: zipBuffer.byteLength,
      ms: Math.round(performance.now() - started),
    }
  } finally {
    await context.close()
  }
}
