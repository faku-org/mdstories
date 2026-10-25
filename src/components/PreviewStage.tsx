import { ChevronLeft, ChevronRight, ScanEye, TriangleAlert } from 'lucide-react'
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
  onGo: (i: number) => void
}

/** The selected story, scaled to fit, with the optional Instagram UI overlay. */
export function PreviewStage({ style, page, current, total, showSafe, onToggleSafe, onGo }: Props) {
  const [stageRef, stage] = useSize<HTMLDivElement>()
  const scale = stage.w && stage.h ? Math.min((stage.h - 24) / STORY_H, (stage.w - 24) / STORY_W) : 0.3
  const box = { width: STORY_W * scale, height: STORY_H * scale }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-line p-3">
        <Button onClick={onToggleSafe} aria-pressed={showSafe} className={showSafe ? 'ring-1 ring-accent/60' : ''}>
          <ScanEye className="size-4" /> Zonas seguras
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

      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute top-1/2 left-1/2" style={{ ...box, transform: 'translate(-50%, -50%)' }}>
          <div className="overflow-hidden rounded-[10px] shadow-2xl shadow-black/50 ring-1 ring-line" style={box}>
            <div className="relative origin-top-left" style={{ width: STORY_W, height: STORY_H, transform: `scale(${scale})` }}>
              <StoryPage style={style} html={page.html} index={current} total={total} />
              {showSafe && <SafeZoneOverlay style={style} index={current} total={total} />}
            </div>
          </div>
          {page.overflow && (
            <p className="absolute inset-x-0 -bottom-7 flex items-center justify-center gap-1 text-xs text-danger">
              <TriangleAlert className="size-3.5" /> Un bloque no entra ni solo: achicá la letra o partilo.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
