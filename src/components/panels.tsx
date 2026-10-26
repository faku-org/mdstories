import { AlignCenter, AlignJustify, AlignLeft, AlignRight, FileText, ImagePlus, Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react'
import { useRef, useState, useSyncExternalStore } from 'react'
import { clampWeight, fontStack, FONTS, getCustomFonts, getFont, subscribeFonts } from '../fonts'
import type { HistoryEntry } from '../storage'
import { IG_SAFE, type StoryStyle, type Template } from '../types'
import { Button, ColorField, Group, IconPicker, Segmented, Select, Slider, TextField, Toggle } from './controls'
import { FontsDialog } from './FontsDialog'

export type SetStyle = (fn: (s: StoryStyle) => StoryStyle) => void

const builtInOptions = FONTS.map((f) => ({ value: f.id, label: f.label }))

function helpers(set: SetStyle) {
  return {
    patch: (p: Partial<StoryStyle>) => set((s) => ({ ...s, ...p })),
    color: (k: keyof StoryStyle['colors'], v: string) => set((s) => ({ ...s, colors: { ...s.colors, [k]: v } })),
    brand: (p: Partial<StoryStyle['brand']>) => set((s) => ({ ...s, brand: { ...s.brand, ...p } })),
    safe: (p: Partial<StoryStyle['safe']>) => set((s) => ({ ...s, safe: { ...s.safe, ...p } })),
  }
}

export function TypographyPanel({ style, set }: { style: StoryStyle; set: SetStyle }) {
  const { patch } = helpers(set)
  const custom = useSyncExternalStore(subscribeFonts, getCustomFonts)
  const [managing, setManaging] = useState(false)
  const body = getFont(style.bodyFont)
  const head = getFont(style.headingFont)
  const fontOptions = [...builtInOptions, ...custom.map((f) => ({ value: f.id, label: f.label, group: 'Mis fuentes' }))]
  return (
    <div className="space-y-5">
      <Group title="Fuentes">
        <Select label="Texto" value={body.id} options={fontOptions} onChange={(v) => patch({ bodyFont: v })} />
        <Select label="Títulos" value={head.id} options={fontOptions} onChange={(v) => patch({ headingFont: v })} />
        <Button className="w-full" onClick={() => setManaging(true)}>
          <Plus className="size-4" /> Agregar o importar fuente
        </Button>
        <FontsDialog
          open={managing}
          onClose={() => setManaging(false)}
          bodyFont={body.id}
          headingFont={head.id}
          onUse={(role, id) => patch({ [role]: id })}
        />
      </Group>
      <Group title="Tamaño y peso">
        <Slider label="Tamaño del texto" value={style.baseSize} min={24} max={80} unit="px" onChange={(v) => patch({ baseSize: v })} />
        <Slider label="Escala de títulos" value={style.headingScale} min={1.05} max={1.7} step={0.01} digits={2} unit="×" onChange={(v) => patch({ headingScale: v })} />
        <Slider
          label={`Peso del texto (${body.min}–${body.max})`}
          value={clampWeight(body, style.bodyWeight)}
          min={body.min}
          max={body.max}
          step={10}
          onChange={(v) => patch({ bodyWeight: v })}
        />
        <Slider
          label={`Peso de títulos (${head.min}–${head.max})`}
          value={clampWeight(head, style.headingWeight)}
          min={head.min}
          max={head.max}
          step={10}
          onChange={(v) => patch({ headingWeight: v })}
        />
      </Group>
      <Group title="Espaciado">
        <Slider label="Interlineado" value={style.lineHeight} min={1} max={2.2} step={0.01} digits={2} onChange={(v) => patch({ lineHeight: v })} />
        <Slider label="Espacio entre párrafos" value={style.paragraphSpacing} min={0} max={2.5} step={0.05} digits={2} unit="em" onChange={(v) => patch({ paragraphSpacing: v })} />
        <Slider label="Espaciado de letras" value={style.letterSpacing} min={-0.06} max={0.15} step={0.005} digits={3} unit="em" onChange={(v) => patch({ letterSpacing: v })} />
        <Slider
          label="Espaciado de títulos"
          value={style.headingLetterSpacing}
          min={-0.08}
          max={0.2}
          step={0.005}
          digits={3}
          unit="em"
          onChange={(v) => patch({ headingLetterSpacing: v })}
        />
      </Group>
      <Group title="Estilo">
        <Toggle label="Títulos en mayúsculas" checked={style.headingUppercase} onChange={(v) => patch({ headingUppercase: v })} />
        <Toggle label="Negritas con color de acento" checked={style.highlightStrong} onChange={(v) => patch({ highlightStrong: v })} />
      </Group>
    </div>
  )
}

export function LayoutPanel({ style, set }: { style: StoryStyle; set: SetStyle }) {
  const { patch, color, safe } = helpers(set)
  const ico = 'size-4'
  return (
    <div className="space-y-5">
      <Group title="Alineación">
        <Segmented
          label="Horizontal"
          value={style.align}
          onChange={(v) => patch({ align: v })}
          options={[
            { value: 'left', label: 'Izquierda', icon: <AlignLeft className={ico} /> },
            { value: 'center', label: 'Centro', icon: <AlignCenter className={ico} /> },
            { value: 'right', label: 'Derecha', icon: <AlignRight className={ico} /> },
            { value: 'justify', label: 'Justificado', icon: <AlignJustify className={ico} /> },
          ]}
        />
        <Segmented
          label="Títulos"
          value={style.headingAlign}
          onChange={(v) => patch({ headingAlign: v })}
          options={[
            { value: 'left', label: 'Izquierda', icon: <AlignLeft className={ico} /> },
            { value: 'right', label: 'Derecha', icon: <AlignRight className={ico} /> },
          ]}
        />
        <Segmented
          label="Vertical"
          value={style.verticalAlign}
          onChange={(v) => patch({ verticalAlign: v })}
          options={[
            { value: 'start', label: 'Arriba' },
            { value: 'center', label: 'Centrado' },
          ]}
        />
      </Group>
      <Group title="Colores">
        <Segmented
          label="Fondo"
          value={style.bgMode}
          onChange={(v) => patch({ bgMode: v })}
          options={[
            { value: 'solid', label: 'Sólido' },
            { value: 'gradient', label: 'Degradado' },
          ]}
        />
        <ColorField label={style.bgMode === 'gradient' ? 'Fondo (inicio)' : 'Fondo'} value={style.colors.bg} onChange={(v) => color('bg', v)} />
        {style.bgMode === 'gradient' && (
          <>
            <ColorField label="Fondo (fin)" value={style.colors.bg2} onChange={(v) => color('bg2', v)} />
            <Slider label="Ángulo" value={style.gradientAngle} min={0} max={360} unit="°" onChange={(v) => patch({ gradientAngle: v })} />
          </>
        )}
        <ColorField label="Texto" value={style.colors.text} onChange={(v) => color('text', v)} />
        <ColorField label="Títulos" value={style.colors.heading} onChange={(v) => color('heading', v)} />
        <ColorField label="Acento" value={style.colors.accent} onChange={(v) => color('accent', v)} />
        <ColorField label="Secundario (citas, número)" value={style.colors.muted} onChange={(v) => color('muted', v)} />
      </Group>
      <Group title="Viñetas">
        <IconPicker
          label="Ícono de lista"
          value={style.bullet}
          onChange={(v) => v && patch({ bullet: v })}
          extra={[
            { value: 'dot', label: 'Punto', node: <span className="size-1.5 rounded-full bg-current" /> },
            { value: 'dash', label: 'Guion', node: <span className="h-0.5 w-3 rounded-full bg-current" /> },
          ]}
        />
      </Group>
      <Group title="Área segura">
        <p className="text-xs text-ink-muted">Instagram tapa ~250 px arriba (perfil) y ~340 px abajo (respuesta). El texto nunca sale de este marco.</p>
        <Slider label="Arriba" value={style.safe.top} min={120} max={500} step={2} unit="px" onChange={(v) => safe({ top: v })} />
        <Slider label="Abajo" value={style.safe.bottom} min={160} max={600} step={2} unit="px" onChange={(v) => safe({ bottom: v })} />
        <Slider label="Laterales" value={style.safe.side} min={40} max={220} step={2} unit="px" onChange={(v) => safe({ side: v })} />
        <Button onClick={() => safe({ ...IG_SAFE })}>
          <RotateCcw className="size-4" /> Valores de Instagram
        </Button>
      </Group>
      <Group title="Cortes">
        <Toggle label="--- empieza una historia nueva" hint="Usá una línea con --- en el Markdown para forzar el corte." checked={style.hrBreak} onChange={(v) => patch({ hrBreak: v })} />
      </Group>
    </div>
  )
}

async function fileToLogo(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const s = Math.max(size / bmp.width, size / bmp.height)
  const w = bmp.width * s
  const h = bmp.height * s
  ctx.drawImage(bmp, (size - w) / 2, (size - h) / 2, w, h)
  return canvas.toDataURL('image/png')
}

export function BrandPanel({ style, set }: { style: StoryStyle; set: SetStyle }) {
  const { brand } = helpers(set)
  const b = style.brand
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-5">
      <Group title="Encabezado">
        <Toggle label="Mostrar encabezado" checked={b.showHeader} onChange={(v) => brand({ showHeader: v })} />
        <TextField label="Usuario o marca" value={b.handle} placeholder="@usuario" onChange={(v) => brand({ handle: v })} />
        <div className="space-y-1.5">
          <span className="text-sm">Logo</span>
          <div className="flex items-center gap-3">
            {b.logo ? (
              <img src={b.logo} alt="Logo actual" className="size-12 rounded-full object-cover" />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-full border border-dashed border-line text-ink-muted">
                <ImagePlus className="size-5" />
              </div>
            )}
            <Button onClick={() => fileRef.current?.click()}>{b.logo ? 'Cambiar' : 'Subir logo'}</Button>
            {b.logo && (
              <Button variant="danger" onClick={() => brand({ logo: null })}>
                Quitar
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) brand({ logo: await fileToLogo(f) })
                e.target.value = ''
              }}
            />
          </div>
          <p className="text-xs text-ink-muted">Se recorta a 256 px y se guarda solo en este navegador.</p>
        </div>
        {!b.logo && <IconPicker label="Ícono de marca (si no hay logo)" value={b.icon} allowNone onChange={(v) => brand({ icon: v })} />}
      </Group>
      <Group title="Pie">
        <Toggle label="Número de historia (02 / 07)" checked={b.showPageNumber} onChange={(v) => brand({ showPageNumber: v })} />
        <Toggle label="Indicador de continuación" hint="Se oculta en la última historia." checked={b.showContinue} onChange={(v) => brand({ showContinue: v })} />
        {b.showContinue && (
          <>
            <TextField label="Texto del indicador" value={b.continueLabel} placeholder="Seguí" onChange={(v) => brand({ continueLabel: v })} />
            <IconPicker label="Ícono del indicador" value={b.continueIcon} onChange={(v) => v && brand({ continueIcon: v })} />
          </>
        )}
      </Group>
    </div>
  )
}

function Swatch({ style }: { style: StoryStyle }) {
  const bg = style.bgMode === 'gradient' ? `linear-gradient(${style.gradientAngle}deg, ${style.colors.bg}, ${style.colors.bg2})` : style.colors.bg
  return (
    <div className="flex h-12 w-9 flex-none flex-col items-center justify-center gap-1 rounded-md ring-1 ring-line" style={{ background: bg }} aria-hidden>
      <span style={{ fontFamily: fontStack(getFont(style.headingFont)), color: style.colors.heading, fontWeight: 700 }} className="text-sm leading-none">
        Aa
      </span>
      <span className="h-0.5 w-4 rounded-full" style={{ background: style.colors.accent }} />
    </div>
  )
}

export function TemplatesPanel(props: {
  user: Template[]
  builtIn: Template[]
  onApply: (t: Template) => void
  onSave: (name: string) => void
  onDelete: (t: Template) => void
}) {
  const [name, setName] = useState('')
  const row = (t: Template) => (
    <li key={t.id} className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-white/[0.04]">
      <Swatch style={t.style} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{t.name}</div>
        <div className="truncate text-xs text-ink-muted">
          {getFont(t.style.headingFont).label} + {getFont(t.style.bodyFont).label}
        </div>
      </div>
      <Button onClick={() => props.onApply(t)}>Aplicar</Button>
      {!t.builtIn && (
        <button type="button" title={`Borrar ${t.name}`} onClick={() => props.onDelete(t)} className="rounded-md p-2 text-ink-muted hover:bg-danger/10 hover:text-danger">
          <Trash2 className="size-4" />
          <span className="sr-only">Borrar {t.name}</span>
        </button>
      )}
    </li>
  )
  return (
    <div className="space-y-5">
      <Group title="Guardar estilo actual">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            props.onSave(name.trim() || 'Mi template')
            setName('')
          }}
        >
          <input
            aria-label="Nombre del template"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del template"
            className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-2.5 text-sm placeholder:text-ink-muted/60"
          />
          <Button type="submit" variant="primary">
            <Save className="size-4" /> Guardar
          </Button>
        </form>
        <p className="text-xs text-ink-muted">Guarda tipografía, colores, alineación, área segura y marca (incluido el logo).</p>
      </Group>
      <Group title="Mis templates">
        {props.user.length ? (
          <ul className="space-y-1">{props.user.map(row)}</ul>
        ) : (
          <div className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-ink-muted">Ajustá el estilo y guardalo con un nombre arriba.</div>
        )}
      </Group>
      <Group title="Incluidos">
        <ul className="space-y-1">{props.builtIn.map(row)}</ul>
      </Group>
    </div>
  )
}

const fmt = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export function HistoryPanel(props: { entries: HistoryEntry[]; currentId: string; onOpen: (e: HistoryEntry) => void; onDelete: (e: HistoryEntry) => void }) {
  const [q, setQ] = useState('')
  const list = props.entries.filter((e) => (e.title + ' ' + e.md).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-ink-muted" />
        <input
          aria-label="Buscar en el historial"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar"
          className="h-9 w-full rounded-lg border border-line bg-surface-2 pr-2.5 pl-8 text-sm placeholder:text-ink-muted/60"
        />
      </div>
      <p className="text-xs text-ink-muted">
        {list.length} {list.length === 1 ? 'archivo' : 'archivos'} · se guarda solo en este navegador (IndexedDB)
      </p>
      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-ink-muted">
          {props.entries.length ? 'Nada coincide con la búsqueda.' : 'Guardá con Ctrl+S o exportá para que el archivo aparezca acá.'}
        </div>
      ) : (
        <ul className="space-y-1">
          {list.map((e) => (
            <li key={e.id} className={`flex items-center gap-3 rounded-lg p-1.5 ${e.id === props.currentId ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}`}>
              {e.thumb ? (
                <img src={e.thumb} alt="" className="h-16 w-9 flex-none rounded object-cover ring-1 ring-line" />
              ) : (
                <div className="flex h-16 w-9 flex-none items-center justify-center rounded bg-white/[0.06]">
                  <FileText className="size-4 text-ink-muted" />
                </div>
              )}
              <button type="button" onClick={() => props.onOpen(e)} className="min-w-0 flex-1 text-left">
                <div className="truncate text-sm font-medium">{e.title}</div>
                <div className="text-xs text-ink-muted">
                  {fmt.format(e.updatedAt)} · {e.pages} {e.pages === 1 ? 'historia' : 'historias'}
                </div>
              </button>
              <button type="button" title={`Borrar ${e.title}`} onClick={() => props.onDelete(e)} className="rounded-md p-2 text-ink-muted hover:bg-danger/10 hover:text-danger">
                <Trash2 className="size-4" />
                <span className="sr-only">Borrar {e.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
