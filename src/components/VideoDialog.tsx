import { Player } from '@remotion/player'
import { Film, Loader2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { download, slug, zipFiles } from '../export'
import type { Page } from '../paginate'
import { STORY_H, STORY_W, type StoryStyle } from '../types'
import { ANIMATIONS, FPS, MAX_SECONDS, MIN_SECONDS, storySeconds, totalFrames, type AnimationKind, type VideoStory } from '../video/animation'
import { StoryVideo, type StoryVideoProps } from '../video/StoryVideo'
import { renderStoryVideo, type VideoQuality } from '../video/render'
import { Button, Segmented, Slider, Toggle } from './controls'
import { Dialog } from './Dialog'

type Scope = 'one' | 'all' | 'each'
/** How the per-story videos reach the disk: one .zip, or one download per MP4. */
type Delivery = 'zip' | 'files'

const QUALITIES: { value: VideoQuality; label: string }[] = [
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'very-high', label: 'Muy alta' },
]

interface Props {
  open: boolean
  onClose: () => void
  style: StoryStyle
  pages: Page[]
  current: number
  title: string
}

export function VideoDialog(props: Props) {
  return (
    <Dialog open={props.open} onClose={props.onClose} title="Exportar video (MP4)" className="w-[min(680px,94vw)]">
      <Body {...props} />
    </Dialog>
  )
}

const RATE_KEY = 'mds:video-fps'
const DEFAULT_RATE = 8
// Word by word wraps every word in a span, which makes each frame several times slower to draw.
const rateKey = (a: AnimationKind) => `${RATE_KEY}:${a}`

/** Frames per second this machine rendered last time (the DOM-to-canvas drawing is the bottleneck, not the encoder). */
function readRate(animation: AnimationKind): number {
  try {
    const v = Number(localStorage.getItem(rateKey(animation)))
    return v > 0 ? v : DEFAULT_RATE
  } catch {
    return DEFAULT_RATE
  }
}

const fmtTime = (s: number) => (s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`)

function Body({ style, pages, current, title }: Props) {
  const [scope, setScope] = useState<Scope>('one')
  const [delivery, setDelivery] = useState<Delivery>('zip')
  const [animation, setAnimation] = useState<AnimationKind>('slide')
  const [progressBar, setProgressBar] = useState(true)
  const [auto, setAuto] = useState(true)
  const [seconds, setSeconds] = useState(8)
  const [quality, setQuality] = useState<VideoQuality>('high')
  const [gpu, setGpu] = useState(true)
  const [status, setStatus] = useState<{ text: string; progress: number; remaining: number | null } | null>(null)
  const [rates, setRates] = useState<Partial<Record<AnimationKind, number>>>({})
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const abort = useRef<AbortController | null>(null)

  const stories = useMemo<VideoStory[]>(() => {
    const pick = scope === 'one' ? [current] : pages.map((_, i) => i)
    return pick.map((i) => ({ html: pages[i].html, vars: pages[i].vars, index: i, frames: Math.round(storySeconds(pages[i].html, auto ? null : seconds) * FPS) }))
  }, [scope, current, pages, auto, seconds])

  const props: StoryVideoProps = { style, stories, total: pages.length, animation, progressBar }
  const frames = totalFrames(stories)
  const rate = rates[animation] ?? readRate(animation)
  const rendering = status !== null

  async function generate() {
    let done = false
    const ctl = new AbortController()
    abort.current = ctl
    setMessage(null)
    const base = slug(title)
    const t0 = performance.now()
    const report = (text: string, progress: number) => {
      const elapsed = (performance.now() - t0) / 1000
      setStatus({ text, progress, remaining: progress > 0.03 ? (elapsed * (1 - progress)) / progress : null })
    }
    const opts = { quality, gpu, signal: ctl.signal }
    try {
      if (scope === 'each' && delivery === 'files') {
        // One render per story, same config, each MP4 downloaded as soon as it is ready.
        for (const [i, s] of stories.entries()) {
          ctl.signal.throwIfAborted()
          const blob = await renderStoryVideo(
            { ...props, stories: [s] },
            { ...opts, onProgress: (p) => report(`Historia ${i + 1} de ${stories.length}`, (i + p.progress) / stories.length) },
          )
          const href = URL.createObjectURL(blob)
          download(href, `${base}-${String(i + 1).padStart(2, '0')}.mp4`)
          setTimeout(() => URL.revokeObjectURL(href), 10_000)
          // Browsers drop downloads that start in the same tick.
          await new Promise((r) => setTimeout(r, 300))
        }
        setMessage({ ok: true, text: `${stories.length} videos MP4 descargados (${base}-01 a ${String(stories.length).padStart(2, '0')}).` })
        done = true
      } else if (scope === 'each') {
        const files: { name: string; blob: Blob }[] = []
        for (const [i, s] of stories.entries()) {
          const blob = await renderStoryVideo(
            { ...props, stories: [s] },
            { ...opts, onProgress: (p) => report(`Historia ${i + 1} de ${stories.length}`, (i + p.progress) / stories.length) },
          )
          files.push({ name: `${base}-${String(i + 1).padStart(2, '0')}.mp4`, blob })
        }
        setStatus({ text: 'Armando el .zip…', progress: 1, remaining: null })
        const zip = await zipFiles(files)
        const href = URL.createObjectURL(zip)
        download(href, `${base}-videos.zip`)
        setTimeout(() => URL.revokeObjectURL(href), 10_000)
        setMessage({ ok: true, text: `${files.length} videos en ${base}-videos.zip.` })
        done = true
      } else {
        const blob = await renderStoryVideo(props, { ...opts, onProgress: (p) => report('Generando el video', p.progress) })
        const href = URL.createObjectURL(blob)
        const name = scope === 'one' ? `${base}-${String(current + 1).padStart(2, '0')}.mp4` : `${base}.mp4`
        download(href, name)
        setTimeout(() => URL.revokeObjectURL(href), 10_000)
        setMessage({ ok: true, text: `${name} (${(blob.size / 1e6).toFixed(1)} MB).` })
        done = true
      }
    } catch (err) {
      setMessage(ctl.signal.aborted ? { ok: false, text: 'Cancelado.' } : { ok: false, text: `No se pudo generar el video (${(err as Error).message}).` })
    } finally {
      abort.current = null
      setStatus(null)
    }
    if (!ctl.signal.aborted && done) {
      const measured = frames / ((performance.now() - t0) / 1000)
      setRates((r) => ({ ...r, [animation]: measured }))
      try {
        localStorage.setItem(rateKey(animation), String(measured))
      } catch {
        // the estimate just stays at its default
      }
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex-none space-y-2 self-start">
          <div className="overflow-hidden rounded-lg ring-1 ring-line" style={{ width: 216, height: 384 }}>
            <Player
              component={StoryVideo}
              inputProps={props}
              durationInFrames={Math.max(frames, 1)}
              fps={FPS}
              compositionWidth={STORY_W}
              compositionHeight={STORY_H}
              style={{ width: 216, height: 384 }}
              controls
              loop
              clickToPlay
              acknowledgeRemotionLicense
            />
          </div>
          <p className="w-54 text-xs text-ink-muted tabular-nums">
            {stories.length} {stories.length === 1 ? 'historia' : 'historias'} · {fmtTime(frames / FPS)} de video
            <br />
            Tarda ≈ {fmtTime(frames / rate)} en tu equipo
          </p>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <Segmented
            label="Qué exportar"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'one', label: 'Esta historia' },
              { value: 'all', label: 'Todas en uno' },
              { value: 'each', label: 'Una por historia' },
            ]}
          />
          {scope === 'each' && (
            <Segmented
              label="Entrega"
              value={delivery}
              onChange={setDelivery}
              options={[
                { value: 'zip', label: 'Un .zip' },
                { value: 'files', label: 'Archivos sueltos' },
              ]}
            />
          )}
          <div className="space-y-1">
            <Segmented label="Animación" value={animation} onChange={setAnimation} options={ANIMATIONS.map((a) => ({ value: a.value, label: a.label }))} />
            <p className="text-xs text-ink-muted">{ANIMATIONS.find((a) => a.value === animation)?.hint}</p>
          </div>
          <Toggle label="Barra de carga" hint="Una línea fina arriba que se llena durante la historia." checked={progressBar} onChange={setProgressBar} />
          <Toggle label="Duración automática" hint={`Según las palabras (de ${MIN_SECONDS} a ${MAX_SECONDS} s).`} checked={auto} onChange={setAuto} />
          {!auto && <Slider label="Segundos por historia" value={seconds} min={MIN_SECONDS} max={MAX_SECONDS} unit=" s" onChange={setSeconds} />}
          <Segmented label="Calidad" value={quality} onChange={setQuality} options={QUALITIES} />
          <Toggle label="Usar la GPU para codificar" hint="Más rápido. Si tu equipo no la puede usar, sigue con la CPU." checked={gpu} onChange={setGpu} />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div aria-live="polite" className={`min-h-4 text-xs ${message?.ok ? 'text-accent' : 'text-danger'}`}>
          {message?.text}
        </div>
        {rendering ? (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(status.progress * 100)}>
              <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${status.progress * 100}%` }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 text-xs text-ink-muted tabular-nums">
                <Loader2 className="size-3.5 animate-spin" /> {status.text} · {Math.round(status.progress * 100)} %{status.remaining !== null && ` · faltan ≈ ${fmtTime(status.remaining)}`}
              </span>
              <Button variant="danger" className="ml-auto" onClick={() => abort.current?.abort()}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="primary" className="w-full" onClick={generate}>
            <Film className="size-4" /> Generar {scope === 'each' ? (delivery === 'zip' ? 'videos (.zip)' : `${stories.length} MP4`) : 'MP4'}
          </Button>
        )}
        <p className="text-xs text-ink-muted">
          Se genera en tu computadora, sin subir nada. Remotion suma un evento anónimo de uso por cada render. Mantené esta pestaña a la vista: si queda en segundo plano, va más lento.
        </p>
      </div>
    </div>
  )
}
