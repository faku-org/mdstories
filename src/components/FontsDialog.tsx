import { Trash2, Upload } from 'lucide-react'
import { useId, useRef, useState, useSyncExternalStore } from 'react'
import { importFontFile, importGoogleFont, isFontFile, labelFromFile, MAX_FILE_BYTES, removeCustomFont } from '../customFonts'
import { fontStack, getCustomFonts, subscribeFonts } from '../fonts'
import { Button, Segmented, Select, TextField } from './controls'
import { Dialog } from './Dialog'

type Mode = 'google' | 'file'
type Role = 'bodyFont' | 'headingFont'

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => ({ value: String(w), label: String(w) }))

interface Props {
  open: boolean
  onClose: () => void
  bodyFont: string
  headingFont: string
  onUse: (role: Role, id: string) => void
}

export function FontsDialog({ open, onClose, bodyFont, headingFont, onUse }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="Mis fuentes">
      <Body bodyFont={bodyFont} headingFont={headingFont} onUse={onUse} />
    </Dialog>
  )
}

function Body({ bodyFont, headingFont, onUse }: Pick<Props, 'bodyFont' | 'headingFont' | 'onUse'>) {
  const fonts = useSyncExternalStore(subscribeFonts, getCustomFonts)
  const [mode, setMode] = useState<Mode>('google')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  // Google
  const [query, setQuery] = useState('')
  // File
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [variable, setVariable] = useState(false)
  const [weight, setWeight] = useState('400')
  const fileId = useId()

  async function run(job: () => Promise<{ label: string }>, reset: () => void) {
    setBusy(true)
    setMessage(null)
    try {
      const f = await job()
      setMessage({ ok: true, text: `“${f.label}” agregada. Elegila abajo para el texto o los títulos.` })
      reset()
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  function submit() {
    if (busy) return
    if (mode === 'google') {
      if (!query.trim()) return setMessage({ ok: false, text: 'Falta el nombre de la fuente o el link de Google Fonts.' })
      return run(() => importGoogleFont(query), () => setQuery(''))
    }
    if (!file) return setMessage({ ok: false, text: 'Falta elegir el archivo de la fuente.' })
    return run(
      () => importFontFile(file, { label, variable, weight: Number(weight) }),
      () => {
        setFile(null)
        setLabel('')
      },
    )
  }

  function pickFile(f: File | undefined) {
    if (!f) return
    if (!isFontFile(f.name)) return setMessage({ ok: false, text: 'Usá un archivo .woff2, .woff, .ttf u .otf.' })
    if (f.size > MAX_FILE_BYTES) return setMessage({ ok: false, text: 'El archivo pesa más de 8 MB.' })
    setMessage(null)
    setFile(f)
    setLabel(labelFromFile(f.name))
    setVariable(/variable|\[wght/i.test(f.name))
  }

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
      <section className="space-y-3">
        <div role="tablist" aria-label="Origen de la fuente" className="flex gap-1">
          {(
            [
              ['google', 'Google Fonts'],
              ['file', 'Desde un archivo'],
            ] as const
          ).map(([id, text]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => {
                setMode(id)
                setMessage(null)
              }}
              className={`h-8 rounded-full px-3 text-xs font-medium transition-colors ${mode === id ? 'bg-white/[0.1] text-ink' : 'text-ink-muted hover:text-ink'}`}
            >
              {text}
            </button>
          ))}
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          {mode === 'google' ? (
            <>
              <TextField label="Nombre o link" value={query} onChange={setQuery} placeholder="Playfair Display, o https://fonts.google.com/specimen/…" />
              <p className="text-xs text-ink-muted">Se descarga una sola vez (Google ve el nombre de la fuente y tu IP) y queda guardada en este navegador: después funciona sin conexión.</p>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label htmlFor={fileId} className="text-sm">
                  Archivo
                </label>
                <div className="flex items-center gap-2">
                  <Button onClick={() => fileRef.current?.click()}>
                    <Upload className="size-4" /> {file ? 'Cambiar' : 'Elegir archivo'}
                  </Button>
                  <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">{file ? file.name : '.woff2, .woff, .ttf u .otf (hasta 8 MB)'}</span>
                  <input id={fileId} ref={fileRef} type="file" accept=".woff2,.woff,.ttf,.otf" className="hidden" onChange={(e) => {
                      pickFile(e.target.files?.[0])
                      e.target.value = ''
                    }} />
                </div>
              </div>
              {file && (
                <>
                  <TextField label="Nombre" value={label} onChange={setLabel} placeholder="Mi fuente" />
                  <Segmented
                    label="Pesos del archivo"
                    value={variable ? 'variable' : 'fixed'}
                    onChange={(v) => setVariable(v === 'variable')}
                    options={[
                      { value: 'fixed', label: 'Un solo peso' },
                      { value: 'variable', label: 'Variable (100–900)' },
                    ]}
                  />
                  {!variable && <Select label="Peso de este archivo" value={weight} options={WEIGHTS} onChange={setWeight} />}
                </>
              )}
              <p className="text-xs text-ink-muted">El archivo no sale de tu computadora: se guarda en este navegador.</p>
            </>
          )}
          <div aria-live="polite" className={`min-h-4 text-xs ${message?.ok ? 'text-accent' : 'text-danger'}`}>
            {message?.text}
          </div>
          <Button type="submit" variant="primary" className="w-full">
            {busy ? 'Importando…' : mode === 'google' ? 'Importar de Google Fonts' : 'Agregar fuente'}
          </Button>
        </form>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Guardadas en este navegador</h3>
        {fonts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-ink-muted">Todavía no agregaste ninguna fuente.</div>
        ) : (
          <ul className="space-y-1">
            {fonts.map((f) => (
              <li key={f.id} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-white/[0.04]">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base" style={{ fontFamily: fontStack(f) }}>
                    {f.label}
                  </div>
                  <div className="text-xs text-ink-muted tabular-nums">{f.min === f.max ? `peso ${f.min}` : `pesos ${f.min}–${f.max}`}</div>
                </div>
                <Button aria-pressed={bodyFont === f.id} className={bodyFont === f.id ? 'ring-1 ring-accent' : ''} onClick={() => onUse('bodyFont', f.id)}>
                  Texto
                </Button>
                <Button aria-pressed={headingFont === f.id} className={headingFont === f.id ? 'ring-1 ring-accent' : ''} onClick={() => onUse('headingFont', f.id)}>
                  Títulos
                </Button>
                {confirming === f.id ? (
                  <Button
                    variant="danger"
                    onClick={() => {
                      setConfirming(null)
                      void removeCustomFont(f.id)
                    }}
                  >
                    Borrar
                  </Button>
                ) : (
                  <button type="button" title={`Borrar ${f.label}`} onClick={() => setConfirming(f.id)} className="rounded-md p-2 text-ink-muted hover:bg-danger/10 hover:text-danger">
                    <Trash2 className="size-4" />
                    <span className="sr-only">Borrar {f.label}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-ink-muted">Si borrás una fuente que usa un estilo, ese estilo pasa a Inter.</p>
      </section>
    </div>
  )
}
