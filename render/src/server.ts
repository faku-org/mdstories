/**
 * mdstories-render — headless render service. API only: the UI is built
 * separately and consumes these endpoints.
 *
 * Routes:
 *   POST /render            { md, title? }  -> { ok, id, pages, files, zipUrl, urls }
 *   GET  /f/:id/:file                        -> the file (PNG or the zip)
 *   POST /codemode/execute  { op, input }    -> bearer-protected, same render
 *   GET  /codemode/search                    -> bearer-protected, the op catalog
 *   GET  /health
 *   *                                        -> the app (built dist); playwright loads it
 */
import { join, extname } from 'node:path'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { renderStories, closeBrowser } from './render'

const PORT = Number(process.env.PORT ?? 4173)
const OUT_DIR = process.env.OUT_DIR ?? '/srv/mdstories-render/out'
const DIST_DIR = process.env.DIST_DIR ?? new URL('../dist', import.meta.url).pathname
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}/`
const TOKEN = process.env.WCM_TOKEN ?? ''
const TTL_MS = 24 * 60 * 60 * 1000
const MAX_CONCURRENT = 2
const MAX_MD_BYTES = 200_000

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8' } })

// Chromium holds ~400 MB per render; two at a time keeps the VPS predictable.
let active = 0
const waiting: (() => void)[] = []

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve))
  active++
  try {
    return await fn()
  } finally {
    active--
    waiting.shift()?.()
  }
}

function authorized(req: Request): boolean {
  if (!TOKEN) return false
  const header = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${TOKEN}`
  if (header.length !== expected.length) return false
  // Constant-time-ish compare; the token is short-lived and low value, but avoid the easy timing leak.
  let diff = 0
  for (let i = 0; i < header.length; i++) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

interface RenderBody {
  md?: unknown
  title?: unknown
}

async function runRender(body: RenderBody, origin: string) {
  const md = typeof body.md === 'string' ? body.md.trim() : ''
  const title = typeof body.title === 'string' ? body.title.slice(0, 120) : ''
  if (!md) return json({ error: 'md es obligatorio' }, 400)
  if (md.length > MAX_MD_BYTES) return json({ error: `md supera ${MAX_MD_BYTES} caracteres` }, 413)

  const id = crypto.randomUUID()
  try {
    const result = await withSlot(() =>
      renderStories({ md, title }, { baseUrl: BASE_URL, outDir: OUT_DIR, id }),
    )
    return json({
      ok: true,
      id,
      pages: result.pages,
      files: result.files,
      zipUrl: `/f/${id}/${id}.zip`,
      listUrl: `/r/${id}`,
      ms: result.ms,
      urls: result.files.map((f) => `${origin}/f/${id}/${f}`),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[render]', id, message)
    return json({ ok: false, error: message }, 500)
  }
}

async function serveStatic(pathname: string): Promise<Response> {
  const rel = pathname === '/' ? '/index.html' : pathname
  const file = Bun.file(join(DIST_DIR, rel))
  if (await file.exists()) {
    const type = MIME[extname(rel)] ?? 'application/octet-stream'
    return new Response(file, { headers: { 'content-type': type } })
  }
  const index = Bun.file(join(DIST_DIR, 'index.html'))
  if (await index.exists()) {
    return new Response(index, { headers: { 'content-type': MIME['.html']! } })
  }
  return html('<p>Falta el build de la app: corré <code>bun run build</code>.</p>', 500)
}

const server = Bun.serve({
  port: PORT,
  maxRequestBodySize: MAX_MD_BYTES * 4,
  async fetch(req) {
    const url = new URL(req.url)
    // Behind nginx the connection is http; the public scheme comes from the proxy.
    const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')
    const host = req.headers.get('host') ?? url.host
    const origin = `${proto}://${host}`

    if (url.pathname === '/health') return json({ ok: true, active, queued: waiting.length })

    if (url.pathname === '/render' && req.method === 'POST') {
      if (!authorized(req)) return json({ error: 'unauthorized' }, 401)
      const body = (await req.json().catch(() => ({}))) as RenderBody
      return runRender(body, origin)
    }

    if (url.pathname.startsWith('/codemode/')) {
      if (!authorized(req)) return json({ error: 'unauthorized' }, 401)
      if (url.pathname === '/codemode/search') {
        return json({
          version: '0.1.0',
          product: 'mdstories',
          ops: [
            {
              id: 'stories.render',
              scope: 'mdstories:write',
              summary: 'Renderiza Markdown a historias 1080x1920 PNG. Devuelve URLs descargables.',
              input: { md: 'string', title: 'string?' },
              output: { id: 'string', pages: 'number', urls: 'string[]' },
            },
          ],
        })
      }
      if (url.pathname === '/codemode/execute' && req.method === 'POST') {
        const body = (await req.json().catch(() => ({}))) as { op?: string; input?: RenderBody }
        if (body.op !== 'stories.render') return json({ error: 'op desconocida' }, 400)
        return runRender(body.input ?? {}, origin)
      }
      return json({ error: 'not found' }, 404)
    }

    if (url.pathname.startsWith('/f/')) {
      const [, , id, name] = url.pathname.split('/')
      if (!id || !name || name.includes('..')) return new Response('bad request', { status: 400 })
      const file = Bun.file(join(OUT_DIR, id, name))
      if (!(await file.exists())) return new Response('not found', { status: 404 })
      const type = MIME[extname(name)] ?? 'application/octet-stream'
      return new Response(file, {
        headers: { 'content-type': type, 'content-disposition': `inline; filename="${name}"` },
      })
    }

    return serveStatic(url.pathname)
  },
})

// Renders are disposable: keep them for a day, then drop them.
async function sweep() {
  try {
    const entries = await readdir(OUT_DIR)
    const now = Date.now()
    for (const entry of entries) {
      const path = join(OUT_DIR, entry)
      const info = await stat(path).catch(() => undefined)
      if (info && now - info.mtimeMs > TTL_MS) await rm(path, { recursive: true, force: true })
    }
  } catch {
    // OUT_DIR may not exist yet on a cold start.
  }
}

await mkdir(OUT_DIR, { recursive: true })
void sweep()
setInterval(() => void sweep(), 60 * 60 * 1000)

console.log(`mdstories-render on :${server.port} (dist: ${DIST_DIR}, out: ${OUT_DIR})`)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void closeBrowser().finally(() => process.exit(0))
  })
}
