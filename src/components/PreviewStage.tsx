import { ChevronLeft, ChevronRight, Eye, EyeOff, Keyboard, ScanEye, TriangleAlert } from 'lucide-react'
import { useSize } from '../hooks'
import type { Page } from '../paginate'
import { STORY_H, STORY_W, type StoryStyle } from '../types'
import { Button } from './controls'
import { SafeZoneOverlay } from './SafeZoneOverlay'
import { StoryPage } from './StoryPage'

interface Props {
  style: StoryStyle
  page: Page
  current: number
  total: number
  showSafe: boolean
  onToggleSafe: () => void
  onHelp: () => void
  /** Preview mode: only the story as exported, no toolbar and no safe-zone overlay. */
  bare: boolean
  onTogglePreview: () => void
  onGo: (i: number) => void
}

/** The selected story, scaled to fit, with the optional Instagram UI overlay. */
export function PreviewStage({ style, page, current, total, showSafe, onToggleSafe, onHelp, bare, onTogglePreview, onGo }: Props) {
  const [stageRef, stage] = useSize<HTMLDivElement>()
  const scale = stage.w && stage.h ? Math.min((stage.h - 24) / STORY_H, (stage.w - 24) / STORY_W) : 0.3
  const box = { width: STORY_W * scale, height: STORY_H * scale }

  return (
    <>
      {!bare && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <Button onClick={onToggleSafe} aria-pressed={showSafe} title="Zonas seguras (Z)" className={showSafe ? 'ring-1 ring-accent/60' : ''}>
            <ScanEye className="size-4" /> Zonas seguras
          </Button>
          <Button onClick={onHelp} title="Atajos de teclado (?)">
            <Keyboard className="size-4" />
            <span className="sr-only">Atajos de teclado</span>
          </Button>
          <Button onClick={onTogglePreview} title="Modo preview: solo lo que se exporta (P)">
            <Eye className="size-4" /> Preview
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button onClick={() => onGo(current - 1)} disabled={current === 0} title="Historia anterior (←)">
              <ChevronLeft className="size-4" />
              <span className="sr-only">Anterior</span>
            </Button>
            <span className="w-16 text-center text-sm tabular-nums">
              {current + 1} / {total}
            </span>
            <Button onClick={() => onGo(current + 1)} disabled={current >= total - 1} title="Historia siguiente (→)">
              <ChevronRight className="size-4" />
              <span className="sr-only">Siguiente</span>
            </Button>
          </div>
        </div>
      )}

      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute top-1/2 left-1/2" style={{ ...box, transform: 'translate(-50%, -50%)' }}>
          <div className={`overflow-hidden shadow-2xl shadow-black/50 ${bare ? '' : 'rounded-[10px] ring-1 ring-line'}`} style={box}>
            <div className="relative origin-top-left" style={{ width: STORY_W, height: STORY_H, transform: `scale(${scale})` }}>
              <StoryPage style={style} html={page.html} vars={page.vars} index={current} total={total} />
              {showSafe && !bare && <SafeZoneOverlay style={style} index={current} total={total} />}
            </div>
          </div>
          {page.overflow && !bare && (
            <p className="absolute inset-x-0 -bottom-7 flex items-center justify-center gap-1 text-xs text-danger">
              <TriangleAlert className="size-3.5" /> Un bloque no entra ni solo: achicá la letra o partilo.
            </p>
          )}
        </div>
        {bare && (
          <div role="toolbar" aria-label="Modo preview" className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-surface/90 p-1 opacity-70 shadow-lg transition-opacity hover:opacity-100 focus-within:opacity-100">
            <Button onClick={() => onGo(current - 1)} disabled={current === 0} title="Historia anterior (←)" className="rounded-full">
              <ChevronLeft className="size-4" />
              <span className="sr-only">Anterior</span>
            </Button>
            <span className="w-14 text-center text-sm tabular-nums">
              {current + 1} / {total}
            </span>
            <Button onClick={() => onGo(current + 1)} disabled={current >= total - 1} title="Historia siguiente (→)" className="rounded-full">
              <ChevronRight className="size-4" />
              <span className="sr-only">Siguiente</span>
            </Button>
            <Button onClick={onTogglePreview} title="Salir del modo preview (Esc o P)" className="rounded-full">
              <EyeOff className="size-4" /> Salir
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
