import { getFontEmbedCSS, toJpeg, toPng } from 'html-to-image'
import JSZip from 'jszip'
import { STORY_H, STORY_W } from './types'

const base = { width: STORY_W, height: STORY_H, cacheBust: false, style: { transform: 'none', margin: '0' } }

/** Font CSS is the slow part (fetch + base64 of every face); compute once per export. */
export const fontCss = (node: HTMLElement) => getFontEmbedCSS(node)

export const renderPng = (node: HTMLElement, fontEmbedCSS: string) => toPng(node, { ...base, pixelRatio: 1, fontEmbedCSS })

/** Sequential on purpose: each render holds a full 1080x1920 canvas; parallel runs spike memory. */
export async function renderAll(nodes: HTMLElement[], fontEmbedCSS: string, onProgress: (i: number) => void): Promise<string[]> {
  const urls: string[] = []
  for (const [i, node] of nodes.entries()) {
    onProgress(i)
    urls.push(await renderPng(node, fontEmbedCSS))
  }
  return urls
}

export const renderThumb = (node: HTMLElement, fontEmbedCSS: string) =>
  toJpeg(node, { ...base, pixelRatio: 0.16, quality: 0.75, fontEmbedCSS })

export function slug(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'historia'
  )
}

export function download(href: string, name: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
}

export async function zipPngs(dataUrls: string[], name: string): Promise<Blob> {
  const zip = new JSZip()
  const pad = String(dataUrls.length).length
  dataUrls.forEach((url, i) => {
    zip.file(`${name}-${String(i + 1).padStart(Math.max(2, pad), '0')}.png`, url.split(',')[1], { base64: true })
  })
  return zip.generateAsync({ type: 'blob' })
}

export async function zipFiles(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const zip = new JSZip()
  for (const f of files) zip.file(f.name, f.blob)
  // MP4s are already compressed: store them as they are.
  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}
