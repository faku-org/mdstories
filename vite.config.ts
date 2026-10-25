import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * `virtual:brands`: compact [slug, title, svg path, aliases?] rows built from the Simple Icons package (CC0).
 * The package's own bundle also ships full SVG strings and metadata (5 MB); this keeps only what the picker needs.
 */
function brandsPlugin(): Plugin {
  const id = 'virtual:brands'
  return {
    name: 'md-stories:brands',
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load(resolved) {
      if (resolved !== `\0${id}`) return
      const root = path.dirname(createRequire(import.meta.url).resolve('simple-icons'))
      const meta = JSON.parse(readFileSync(path.join(root, 'data/simple-icons.json'), 'utf8')) as { title: string; slug: string; aliases?: { aka?: string[] } }[]
      const rows = meta.flatMap((m) => {
        const d = /<path d="([^"]+)"/.exec(readFileSync(path.join(root, 'icons', `${m.slug}.svg`), 'utf8'))?.[1]
        return d ? [[m.slug, m.title, d, ...(m.aliases?.aka ?? [])]] : []
      })
      return `export default ${JSON.stringify(rows)}`
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), brandsPlugin()],
})
