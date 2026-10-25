import { Download, Loader2, Save } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from './components/controls'
import { EditorPane } from './components/EditorPane'
import type { SetStyle } from './components/panels'
import { PreviewStage } from './components/PreviewStage'
import { SettingsAside } from './components/SettingsAside'
import { StoryStrip } from './components/StoryStrip'
import { StoryPage } from './components/StoryPage'
import { Toast, type ToastData } from './components/Toast'
import { download, fontCss, renderAll, renderPng, renderThumb, slug, zipPngs } from './export'
import { usePagination } from './hooks'
import { titleFromMd } from './markdown'
import { SAMPLE_MD } from './sample'
import { deleteHistory, listHistory, loadDraft, loadTemplates, saveDraft, saveHistory, saveTemplates, uid, type HistoryEntry } from './storage'
import { DEFAULT_STYLE, type StoryStyle, type Template } from './types'

const initial = loadDraft()

export default function App() {
  const [docId, setDocId] = useState(initial?.docId ?? uid())
  const [title, setTitle] = useState(initial?.title ?? '')
  const [md, setMd] = useState(initial?.md ?? SAMPLE_MD)
  const [style, setStyleState] = useState<StoryStyle>(initial?.style ?? DEFAULT_STYLE)
  const setStyle: SetStyle = useCallback((fn) => setStyleState(fn), [])

  const [currentRaw, setCurrent] = useState(0)
  const [showSafe, setShowSafe] = useState(true)
  const [templates, setTemplates] = useState<Template[]>(loadTemplates)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastData | null>(null)

  const nodesRef = useRef<(HTMLDivElement | null)[]>([])
  const fontCssCache = useRef(new Map<string, string>())
  const { pages, measureRef, areaRef } = usePagination(md, style)
  const registerNode = useCallback((i: number, el: HTMLDivElement | null) => {
    nodesRef.current[i] = el
  }, [])

  const current = Math.min(currentRaw, pages.length - 1)

  // ---------- persistence ----------
  useEffect(() => {
    const t = setTimeout(() => saveDraft({ docId, title, md, style }), 400)
    return () => clearTimeout(t)
  }, [docId, title, md, style])

  useEffect(() => {
    saveTemplates(templates)
  }, [templates])

  const refreshHistory = useCallback(() => listHistory().then(setHistory), [])
  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  // ---------- actions ----------
  const docTitle = title.trim() || titleFromMd(md) || 'Sin título'

  async function getFontCss(node: HTMLElement) {
    const key = `${style.bodyFont}|${style.headingFont}`
    let css = fontCssCache.current.get(key)
    if (css === undefined) {
      css = await fontCss(node)
      fontCssCache.current.set(key, css)
    }
    return css
  }

  async function saveToHistory(quiet = false) {
    const node = nodesRef.current[0]
    let thumb: string | undefined
    // A thumbnail is nice to have; never let it block the save (rendering stalls while the window is hidden).
    if (node) thumb = await Promise.race([renderThumb(node, await getFontCss(node)).catch(() => undefined), new Promise<undefined>((r) => setTimeout(r, 4000))])
    const now = Date.now()
    const prev = history.find((h) => h.id === docId)
    await saveHistory({ id: docId, title: docTitle, md, style, pages: pages.length, createdAt: prev?.createdAt ?? now, updatedAt: now, thumb })
    await refreshHistory()
    if (!quiet) setToast({ text: 'Guardado en el historial.' })
  }

  async function exportCurrent() {
    const node = nodesRef.current[current]
    if (!node) return
    setBusy('Generando PNG…')
    try {
      const png = await renderPng(node, await getFontCss(node))
      download(png, `${slug(docTitle)}-${String(current + 1).padStart(2, '0')}.png`)
      await saveToHistory(true)
    } catch (err) {
      setToast({ text: `No se pudo generar el PNG (${(err as Error).message}).` })
    } finally {
      setBusy(null)
    }
  }

  async function exportAll() {
    const nodes = nodesRef.current.slice(0, pages.length).filter((n): n is HTMLDivElement => !!n)
    if (!nodes.length) return
    try {
      const css = await getFontCss(nodes[0])
      const urls = await renderAll(nodes, css, (i) => setBusy(`Generando ${i + 1} de ${nodes.length}…`))
      if (urls.length === 1) download(urls[0], `${slug(docTitle)}.png`)
      else {
        setBusy('Armando el .zip…')
        const blob = await zipPngs(urls, slug(docTitle))
        const href = URL.createObjectURL(blob)
        download(href, `${slug(docTitle)}.zip`)
        setTimeout(() => URL.revokeObjectURL(href), 10_000)
      }
      await saveToHistory(true)
      setToast({ text: `${urls.length} ${urls.length === 1 ? 'historia exportada' : 'historias exportadas'}. Guardado en el historial.` })
    } catch (err) {
      setToast({ text: `No se pudo exportar (${(err as Error).message}).` })
    } finally {
      setBusy(null)
    }
  }

  function newDoc() {
    setDocId(uid())
    setTitle('')
    setMd('')
    setCurrent(0)
  }

  async function openFile(file: File) {
    const text = await file.text()
    setDocId(uid())
    setTitle(file.name.replace(/\.(md|markdown|txt)$/i, ''))
    setMd(text)
    setCurrent(0)
  }

  function openEntry(e: HistoryEntry) {
    setDocId(e.id)
    setTitle(e.title)
    setMd(e.md)
    setStyleState(e.style)
    setCurrent(0)
  }

  function removeEntry(e: HistoryEntry) {
    deleteHistory(e.id).then(refreshHistory)
    setToast({ text: `“${e.title}” borrado del historial.`, action: { label: 'Deshacer', run: () => saveHistory(e).then(refreshHistory) } })
  }

  function saveTemplate(name: string) {
    const next = [{ id: uid(), name, style }, ...templates]
    if (!saveTemplates(next)) {
      setToast({ text: 'No hay espacio en el navegador para guardar el template (probá sin logo).' })
      return
    }
    setTemplates(next)
    setToast({ text: `Template “${name}” guardado.` })
  }

  function removeTemplate(t: Template) {
    setTemplates((list) => list.filter((x) => x.id !== t.id))
    setToast({
      text: `Template “${t.name}” borrado.`,
      action: { label: 'Deshacer', run: () => setTemplates((list) => [t, ...list]) },
    })
  }

  // ---------- keyboard ----------
  const actions = useRef({ exportAll, saveToHistory })
  useEffect(() => {
    actions.current = { exportAll, saveToHistory }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        actions.current.saveToHistory()
        return
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        actions.current.exportAll()
        return
      }
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'ArrowRight') setCurrent((c) => Math.min(c + 1, pages.length - 1))
      if (e.key === 'ArrowLeft') setCurrent((c) => Math.max(c - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pages.length])

  // ---------- render ----------
  const overflowCount = pages.filter((p) => p.overflow).length
  const page = pages[current] ?? pages[0]

  return (
    <div className="grid h-full grid-cols-[minmax(300px,1fr)_minmax(380px,1.15fr)_360px] overflow-hidden">
      <EditorPane
        title={title}
        md={md}
        pageCount={pages.length}
        overflowCount={overflowCount}
        onTitle={setTitle}
        onMd={setMd}
        onOpenFile={openFile}
        onNew={newDoc}
      />

      {/* ---------- Preview ---------- */}
      <main className="flex min-h-0 flex-col">
        <PreviewStage
          style={style}
          page={page}
          current={current}
          total={pages.length}
          showSafe={showSafe}
          onToggleSafe={() => setShowSafe((v) => !v)}
          onGo={(i) => setCurrent(Math.max(0, Math.min(pages.length - 1, i)))}
        />

        <div className="border-t border-line p-3">
          <StoryStrip style={style} pages={pages} current={current} onSelect={setCurrent} register={registerNode} />
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={() => saveToHistory()} title="Guardar en el historial (Ctrl+S)">
              <Save className="size-4" /> Guardar
            </Button>
            <Button onClick={exportCurrent} disabled={!!busy} title="Descargar la historia actual como PNG">
              <Download className="size-4" /> Esta historia
            </Button>
            <Button variant="primary" className="ml-auto" onClick={exportAll} disabled={!!busy} title="Descargar todas (Ctrl+Shift+E)">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {busy ?? `Exportar ${pages.length > 1 ? `${pages.length} historias (.zip)` : 'PNG'}`}
            </Button>
          </div>
        </div>
      </main>

      <SettingsAside
        style={style}
        setStyle={setStyle}
        templates={templates}
        onApplyTemplate={(t) => {
          setStyleState(t.style)
          setToast({ text: `Template “${t.name}” aplicado.` })
        }}
        onSaveTemplate={saveTemplate}
        onDeleteTemplate={removeTemplate}
        history={history}
        docId={docId}
        onOpenEntry={openEntry}
        onDeleteEntry={removeEntry}
      />

      {/* Hidden, unscaled measurement page: same structure as a real story. */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-[-20000px] invisible">
        <StoryPage style={style} html={null} index={0} total={2} areaRef={areaRef} contentRef={measureRef} />
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
