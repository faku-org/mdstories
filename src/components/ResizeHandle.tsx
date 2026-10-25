import { useRef, useState, type CSSProperties } from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  /** +1: dragging right grows the panel (panel on the left of the handle). -1: dragging right shrinks it. */
  direction: 1 | -1
  onChange: (v: number) => void
  onReset: () => void
  style?: CSSProperties
  className?: string
}

const STEP = 16

/** Vertical separator between panels: drag, arrow keys (Shift for bigger steps) or double click to reset. */
export function ResizeHandle({ label, value, min, max, direction, onChange, onReset, style, className = '' }: Props) {
  const [dragging, setDragging] = useState(false)
  // A ref, not state: move events can arrive before React re-renders after pointerdown.
  const drag = useRef<{ x: number; v: number } | null>(null)
  const stop = () => {
    drag.current = null
    setDragging(false)
    document.body.style.cursor = ''
  }
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)))

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      title={`${label} · arrastrá, o usá ← → · doble clic para restablecer`}
      data-active={dragging || undefined}
      style={style}
      className={`group absolute inset-y-0 z-20 w-3 cursor-col-resize touch-none select-none ${className}`}
      onPointerDown={(e) => {
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // no active pointer to capture (synthetic events); the drag still works while the pointer stays over the handle
        }
        drag.current = { x: e.clientX, v: value }
        setDragging(true)
        document.body.style.cursor = 'col-resize'
      }}
      onPointerMove={(e) => {
        if (drag.current) onChange(clamp(drag.current.v + (e.clientX - drag.current.x) * direction))
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        const step = (e.shiftKey ? STEP * 4 : STEP) * direction
        if (e.key === 'ArrowRight') onChange(clamp(value + step))
        else if (e.key === 'ArrowLeft') onChange(clamp(value - step))
        else if (e.key === 'Home') onChange(min)
        else if (e.key === 'End') onChange(max)
        else if (e.key === 'Enter') onReset()
        else return
        e.preventDefault()
      }}
    >
      <span className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-accent opacity-0 transition-opacity duration-150 group-hover:opacity-50 group-focus-visible:opacity-100 group-data-[active]:opacity-100" />
    </div>
  )
}
