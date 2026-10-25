import { Camera, Ellipsis, Heart, Send, X } from 'lucide-react'
import { STORY_H, STORY_W, type StoryStyle } from '../types'

const stripes = 'repeating-linear-gradient(135deg, rgb(255 64 64 / 0.28) 0 14px, rgb(255 64 64 / 0.12) 14px 28px)'

/** Mock of the Instagram Stories UI plus the bands that UI covers. Preview only, never exported. */
export function SafeZoneOverlay({ style, index, total }: { style: StoryStyle; index: number; total: number }) {
  const { top, bottom, side } = style.safe
  const handle = style.brand.handle.replace(/^@/, '') || 'usuario'
  const label = 'absolute font-sans text-[26px] font-semibold tracking-wide text-white/90 uppercase'

  return (
    <div className="pointer-events-none absolute inset-0" style={{ width: STORY_W, height: STORY_H }} aria-hidden>
      <div className="absolute inset-x-0 top-0" style={{ height: top, background: stripes }} />
      <div className="absolute inset-x-0 bottom-0" style={{ height: bottom, background: stripes }} />
      <div className="absolute left-0" style={{ top, bottom, width: side, background: stripes }} />
      <div className="absolute right-0" style={{ top, bottom, width: side, background: stripes }} />
      <div className="absolute border-4 border-dashed border-white/70" style={{ top, bottom, left: side, right: side }} />

      <div className="absolute inset-x-0 top-0 h-[260px] bg-linear-to-b from-black/45 to-transparent" />
      <div className="absolute inset-x-[16px] top-[20px] flex gap-[8px]">
        {Array.from({ length: Math.max(1, total) }, (_, i) => (
          <div key={i} className={`h-[6px] flex-1 rounded-full ${i <= index ? 'bg-white' : 'bg-white/40'}`} />
        ))}
      </div>
      <div className="absolute inset-x-[32px] top-[52px] flex items-center gap-[20px] font-sans text-white">
        <div className="size-[80px] rounded-full bg-white/30 ring-4 ring-white/60" />
        <span className="text-[34px] font-semibold">{handle}</span>
        <span className="text-[32px] text-white/70">2 h</span>
        <Ellipsis className="ml-auto size-[52px]" />
        <X className="size-[56px]" />
      </div>
      <span className={label} style={{ top: top - 52, left: side }}>
        Perfil · {top}px
      </span>

      <div className="absolute inset-x-0 bottom-0 h-[300px] bg-linear-to-t from-black/45 to-transparent" />
      <div className="absolute inset-x-[32px] bottom-[60px] flex items-center gap-[28px] font-sans text-white">
        <Camera className="size-[56px]" />
        <div className="flex h-[96px] flex-1 items-center rounded-full border-[3px] border-white/80 px-[36px] text-[32px]">
          Enviar mensaje
        </div>
        <Heart className="size-[56px]" />
        <Send className="size-[56px]" />
      </div>
      <span className={label} style={{ bottom: bottom - 52, left: side }}>
        Respuesta · {bottom}px
      </span>
    </div>
  )
}
