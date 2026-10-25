import { Ban } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { ICON_IDS, ICONS } from '../icons'

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-b border-line pb-5 last:border-0">
      <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{title}</h3>
      {children}
    </section>
  )
}

export function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  digits?: number
  onChange: (v: number) => void
}) {
  const id = useId()
  const { label, value, min, max, step = 1, unit = '', digits = 0, onChange } = props
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <label htmlFor={id}>{label}</label>
        <span className="font-mono text-xs text-ink-muted tabular-nums">
          {value.toFixed(digits)}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="text-sm">
        {label}
        {hint && <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 flex-none rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-white/15'}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full transition-transform ${checked ? 'translate-x-4 bg-on-accent' : 'translate-x-0.5 bg-ink'}`}
        />
      </button>
    </div>
  )
}

export function Segmented<T extends string>(props: {
  label: string
  value: T
  options: { value: T; label: string; icon?: ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="space-y-1">
      <span className="text-sm">{props.label}</span>
      <div role="radiogroup" aria-label={props.label} className="flex rounded-lg bg-white/[0.06] p-0.5">
        {props.options.map((o) => {
          const on = o.value === props.value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              title={o.label}
              onClick={() => props.onChange(o.value)}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-xs transition-colors ${
                on ? 'bg-surface-2 text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {o.icon ?? o.label}
              {o.icon && <span className="sr-only">{o.label}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Select(props: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm">
        {props.label}
      </label>
      <select
        id={id}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-line bg-surface-2 px-2 text-sm"
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-8 flex-none cursor-pointer rounded-md border border-line bg-transparent p-0.5"
      />
      <label htmlFor={id} className="min-w-0 flex-1 truncate text-sm">
        {label}
      </label>
      <input
        aria-label={`${label} (hex)`}
        value={value}
        onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && onChange(e.target.value)}
        className="w-20 rounded-md border border-line bg-surface-2 px-1.5 py-1 font-mono text-xs uppercase"
        maxLength={7}
      />
    </div>
  )
}

export function TextField(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId()
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm">
        {props.label}
      </label>
      <input
        id={id}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-line bg-surface-2 px-2.5 text-sm placeholder:text-ink-muted/60"
      />
    </div>
  )
}

/** Icon grid. `extra` adds non-lucide choices (dot, dash) at the start. */
export function IconPicker(props: {
  label: string
  value: string | null
  onChange: (v: string | null) => void
  allowNone?: boolean
  extra?: { value: string; label: string; node: ReactNode }[]
}) {
  const cell = (on: boolean) =>
    `flex size-9 items-center justify-center rounded-md transition-colors ${on ? 'bg-accent text-on-accent' : 'bg-white/[0.06] text-ink hover:bg-white/[0.12]'}`
  return (
    <div className="space-y-1.5">
      <span className="text-sm">{props.label}</span>
      <div role="radiogroup" aria-label={props.label} className="grid grid-cols-8 gap-1">
        {props.allowNone && (
          <button type="button" role="radio" aria-checked={props.value === null} title="Ninguno" className={cell(props.value === null)} onClick={() => props.onChange(null)}>
            <Ban className="size-4" />
            <span className="sr-only">Ninguno</span>
          </button>
        )}
        {props.extra?.map((x) => (
          <button key={x.value} type="button" role="radio" aria-checked={props.value === x.value} title={x.label} className={cell(props.value === x.value)} onClick={() => props.onChange(x.value)}>
            {x.node}
            <span className="sr-only">{x.label}</span>
          </button>
        ))}
        {ICON_IDS.map((id) => {
          const Icon = ICONS[id]
          return (
            <button key={id} type="button" role="radio" aria-checked={props.value === id} title={id} className={cell(props.value === id)} onClick={() => props.onChange(id)}>
              <Icon className="size-4" />
              <span className="sr-only">{id}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Button({
  children,
  variant = 'ghost',
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const v =
    variant === 'primary'
      ? 'bg-accent text-on-accent hover:brightness-110'
      : variant === 'danger'
        ? 'text-danger hover:bg-danger/10'
        : 'bg-white/[0.06] text-ink hover:bg-white/[0.12]'
  return (
    <button
      type="button"
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition disabled:opacity-50 ${v} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
