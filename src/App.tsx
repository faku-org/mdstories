import { Download, Film, Loader2, Save } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from './components/controls'
import { ShortcutsHelp } from './components/ShortcutsHelp'
import { EditorPane } from './components/EditorPane'
import { MobileNav, type MobileTab } from './components/MobileNav'
import type { SetStyle } from './components/panels'
import { PreviewStage } from './components/PreviewStage'
import { ResizeHandle } from './components/ResizeHandle'
import { SettingsAside } from './components/SettingsAside'
import { StoryStrip } from './components/StoryStrip'
import { StoryPage } from './components/StoryPage'
import { Toast, type ToastData } from './components/Toast'
import { initCustomFonts } from './customFonts'
import { download, fontCss, renderAll, renderPng, renderThumb, slug, zipPngs } from './export'
import { getCustomFonts, subscribeFonts } from './fonts'
import { PANELS, useMediaQuery, usePagination, usePanelSizes, useSize } from './hooks'
import { titleFromMd } from './markdown'
import { SAMPLE_MD } from './sample'
import { useShortcuts } from './shortcuts'
import { deleteHistory, listHistory, loadDraft, loadTemplates, saveDraft, saveHistory, saveTemplates, uid, type HistoryEntry } from './storage'
import { DEFAULT_STYLE, type StoryStyle, type Template } from './types'

// Remotion and the video encoder are only needed once someone exports a video.
const VideoDialog = lazy(() => import('./components/VideoDialog').then((m) => ({ default: m.VideoDialog })))

const initial = loadDraft()
void initCustomFonts()

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
  const [help, setHelp] = useState(false)
  const [preview, setPreview] = useState(false)
  const [video, setVideo] = useState(false)
  // Phones show one area at a time (bottom tabs) instead of the three-column desktop layout.
  const mobile = useMediaQuery('(max-width: 767px)')
  const [tab, setTab] = useState<MobileTab>('editor')

  // Imported fonts load after startup: re-render so every story picks up the real family.
  const customFonts = useSyncExternalStore(subscribeFonts, getCustomFonts)
  const [rootRef, root] = useSize<HTMLDivElement>()
  const panels = usePanelSizes(root.w)
  const nodesRef = useRef<(HTMLDivElement | null)[]>([])
  const fontCssCache = useRef(new Map<string, string>())
  const { pages, measureRef, areaRef } = usePagination(md, style)
  const registerNode = useCallback((i: number, el: HTMLDivElement | null) => {
    nodesRef.current[i] = el
  }, [])

  const current = Math.min(currentRaw, pages.length - 1)

  // An imported font can be replaced under the same id: drop the embedded-CSS cache when the list changes.
  useEffect(() => {
    fontCssCache.current.clear()
  }, [customFonts])

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
  useShortcuts({
    prev: () => setCurrent((c) => Math.max(Math.min(c, pages.length - 1) - 1, 0)),
    next: () => setCurrent((c) => Math.min(c + 1, pages.length - 1)),
    first: () => setCurrent(0),
    last: () => setCurrent(pages.length - 1),
    save: () => saveToHistory(),
    exportOne: () => (busy ? undefined : exportCurrent()),
    exportAll: () => (busy ? undefined : exportAll()),
    safeZones: () => setShowSafe((v) => !v),
    help: () => setHelp((v) => !v),
    preview: () => setPreview((v) => !v),
    exitPreview: preview ? () => setPreview(false) : undefined,
  })

  // ---------- render ----------
  const overflowCount = pages.filter((p) => p.overflow).length
  const page = pages[current] ?? pages[0]

  // Panels stay mounted (state, scroll and caret survive); only the active one is shown on phones.
  const slot = (id: Exclude<MobileTab, 'stories'>) =>
    mobile ? (!preview && tab === id ? 'grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]' : 'hidden') : preview ? 'hidden' : 'contents'
  // Off-screen, not display:none: the story strip holds the export sources and must keep its layout.
  const mainClass = !mobile
    ? 'flex min-h-0 flex-col'
    : preview || tab === 'stories'
      ? 'flex min-h-0 flex-1 flex-col'
      : 'pointer-events-none invisible fixed top-0 left-[-20000px] flex h-dvh w-screen flex-col'

  return (
    <div
      ref={rootRef}
      className={`relative h-full overflow-hidden ${mobile ? 'flex flex-col' : 'grid'}`}
      style={mobile ? undefined : { gridTemplateColumns: preview ? 'minmax(0, 1fr)' : `${panels.editor}px minmax(0, 1fr) ${panels.settings}px` }}
    >
      {/* Preview mode hides the panels but keeps them mounted, so their state (tab, scroll, caret) survives. */}
      <div className={slot('editor')}>
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
      </div>

      {/* ---------- Preview ---------- */}
      <main className={mainClass} inert={mobile && !preview && tab !== 'stories'}>
        <PreviewStage
          style={style}
          page={page}
          current={current}
          total={pages.length}
          showSafe={showSafe}
          onToggleSafe={() => setShowSafe((v) => !v)}
          onHelp={() => setHelp(true)}
          bare={preview}
          onTogglePreview={() => setPreview((v) => !v)}
          onGo={(i) => setCurrent(Math.max(0, Math.min(pages.length - 1, i)))}
        />

        {/* In preview mode the strip stays laid out off-screen: its nodes are the export sources. */}
        <div className={preview ? 'pointer-events-none fixed top-0 left-[-20000px] opacity-0' : 'border-t border-line p-3'} inert={preview}>
          <StoryStrip style={style} pages={pages} current={current} onSelect={setCurrent} register={registerNode} compact={mobile} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={() => saveToHistory()} title="Guardar en el historial (Ctrl+S)" className="max-md:flex-1">
              <Save className="size-4" /> Guardar
            </Button>
            <Button onClick={exportCurrent} disabled={!!busy} title="Descargar la historia actual como PNG (Ctrl+E)" className="max-md:flex-1">
              <Download className="size-4" /> <span className="max-md:hidden">Esta historia</span>
              <span className="md:hidden">PNG</span>
            </Button>
            <Button onClick={() => setVideo(true)} title="Exportar como video MP4 con animaciones" className="max-md:flex-1">
              <Film className="size-4" /> Video
            </Button>
            <Button variant="primary" className="ml-auto max-md:order-last max-md:w-full" onClick={exportAll} disabled={!!busy} title="Descargar todas (Ctrl+Shift+E)">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {busy ?? `Exportar ${pages.length > 1 ? `${pages.length} historias (.zip)` : 'PNG'}`}
            </Button>
          </div>
        </div>
      </main>

      <div className={slot('settings')}>
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
      </div>

      {/* Hidden, unscaled measurement page: same structure as a real story. */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-[-20000px] invisible">
        <StoryPage style={style} html={null} index={0} total={2} areaRef={areaRef} contentRef={measureRef} />
      </div>

      {!preview && !mobile && (
        <>
          <ResizeHandle
            label="Ancho del editor"
            value={panels.editor}
            min={PANELS.editor.min}
            max={panels.maxEditor}
            direction={1}
            onChange={panels.setEditor}
            onReset={() => panels.reset('editor')}
            style={{ left: panels.editor }}
            className="-translate-x-1/2"
          />
          <ResizeHandle
            label="Ancho de los ajustes"
            value={panels.settings}
            min={PANELS.settings.min}
            max={panels.maxSettings}
            direction={-1}
            onChange={panels.setSettings}
            onReset={() => panels.reset('settings')}
            style={{ right: panels.settings }}
            className="translate-x-1/2"
          />
        </>
      )}

      {mobile && !preview && <MobileNav tab={tab} onTab={setTab} overflowCount={overflowCount} />}

      {video && (
        <Suspense fallback={null}>
          <VideoDialog open onClose={() => setVideo(false)} style={style} pages={pages} current={current} title={docTitle} />
        </Suspense>
      )}
      <ShortcutsHelp open={help} onClose={() => setHelp(false)} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
