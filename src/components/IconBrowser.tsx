import { Loader2, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { isBrand, loadBrands, loadIcon, loadLucide, type IconEntry } from '../icons'
import { Dialog } from './Dialog'

type Source = 'lucide' | 'brands'

const SOURCES: { id: Source; label: string }[] = [
  { id: 'lucide', label: 'Íconos' },
  { id: 'brands', label: 'Marcas' },
]

const LIMIT = 150

function search(list: IconEntry[], q: string): IconEntry[] {
  const tokens = q.toLowerCase().split(/[\s-]+/).filter(Boolean)
  if (!tokens.length) return list
  const hits = list.filter((e) => {
    const hay = `${e.label} ${e.id} ${e.keywords ?? ''}`.toLowerCase()
    return tokens.every((t) => hay.includes(t))
  })
  // Names that start with the query first.
  const first = tokens[0]
  return hits.sort((a, b) => Number(b.label.toLowerCase().startsWith(first)) - Number(a.label.toLowerCase().startsWith(first)))
}

/** Searchable picker over the full Lucide set and the Simple Icons brands. Both catalogs load on first open. */
export function IconBrowser(props: { open: boolean; value: string | null; onClose: () => void; onPick: (id: string) => void }) {
  const { open, value, onClose, onPick } = props
  return (
    <Dialog open={open} onClose={onClose} title="Elegí un ícono">
      <Browser value={value} onPick={onPick} />
    </Dialog>
  )
}

function Browser({ value, onPick }: { value: string | null; onPick: (id: string) => void }) {
  const [source, setSource] = useState<Source>(value && isBrand(value) ? 'brands' : 'lucide')
  const [q, setQ] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [res, setRes] = useState<{ key: string; list?: IconEntry[] } | null>(null)

  const key = `${source}:${attempt}`
  useEffect(() => {
    let live = true
    ;(source === 'brands' ? loadBrands() : loadLucide()).then(
      (c) => live && setRes({ key, list: c.list }),
      () => live && setRes({ key }),
    )
    return () => {
      live = false
    }
  }, [source, key])

  const cur = res?.key === key ? res : null
  const list = cur?.list ?? null
  const error = !!cur && !cur.list
  const results = useMemo(() => (list ? search(list, q) : []), [list, q])
  const shown = results.slice(0, LIMIT)

  return (
    <>
      <div className="space-y-3 border-b border-line p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-ink-muted" />
          <input
            autoFocus
            aria-label="Buscar ícono"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={source === 'brands' ? 'Buscar marca: instagram, github…' : 'Buscar en inglés: heart, camera…'}
            className="h-9 w-full rounded-lg border border-line bg-surface-2 pr-2.5 pl-8 text-sm placeholder:text-ink-muted/60 max-md:h-11 max-md:text-base"
          />
        </div>
        <div role="tablist" aria-label="Origen" className="flex gap-1">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={source === s.id}
              onClick={() => setSource(s.id)}
              className={`h-8 rounded-full px-3 text-xs max-md:h-10 max-md:text-sm font-medium transition-colors ${source === s.id ? 'bg-white/[0.1] text-ink' : 'text-ink-muted hover:text-ink'}`}
            >
              {s.label}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-ink-muted tabular-nums" aria-live="polite">
            {list ? `${results.length.toLocaleString('es-AR')} ${results.length === 1 ? 'resultado' : 'resultados'}` : ''}
          </span>
        </div>
      </div>

      <div className="min-h-48 flex-1 overflow-y-auto p-4">
        {error ? (
          <div className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-ink-muted">
            No se pudieron cargar los íconos (sin conexión al servidor).{' '}
            <button type="button" className="text-accent underline" onClick={() => setAttempt((a) => a + 1)}>
              Reintentar
            </button>
          </div>
        ) : !list ? (
          <div className="flex items-center justify-center gap-2 p-6 text-xs text-ink-muted">
            <Loader2 className="size-4 animate-spin" /> Cargando íconos…
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-ink-muted">Nada coincide con “{q}”.</div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1" aria-label="Resultados">
            {shown.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  title={e.label}
                  aria-label={e.label}
                  aria-pressed={value === e.id}
                  onClick={() => {
                    void loadIcon(e.id)
                    onPick(e.id)
                  }}
                  className={`flex size-11 w-full items-center justify-center rounded-md transition-colors ${value === e.id ? 'bg-accent text-on-accent' : 'bg-white/[0.06] text-ink hover:bg-white/[0.12]'}`}
                >
                  <e.Icon className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {list && results.length > LIMIT && <p className="mt-3 text-center text-xs text-ink-muted">Mostrando {LIMIT}. Escribí más para acotar.</p>}
      </div>

      <footer className="border-t border-line px-4 py-2 text-xs text-ink-muted">
        {source === 'brands'
          ? 'Marcas: Simple Icons (CC0), incluidas en la app. Los logos son de sus dueños.'
          : 'Íconos: Lucide, incluidos en la app. Nada se pide a internet.'}
      </footer>
    </>
  )
}
