import { FilePlus2, FolderOpen, TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { countWords, titleFromMd } from '../markdown'
import { Button } from './controls'

interface Props {
  title: string
  md: string
  pageCount: number
  overflowCount: number
  onTitle: (v: string) => void
  onMd: (v: string) => void
  onOpenFile: (f: File) => void
  onNew: () => void
}

const PLACEHOLDER = 'Pegá tu Markdown acá o arrastrá un archivo .md\n\n# Título\n\nTexto con **negrita** y *cursiva*.\n\n---\n\nUna línea con --- empieza otra historia.'

export function EditorPane({ title, md, pageCount, overflowCount, onTitle, onMd, onOpenFile, onNew }: Props) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const words = useMemo(() => countWords(md), [md])

  return (
    <section
      aria-label="Editor de Markdown"
      className="relative flex min-h-0 flex-col border-r border-line"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) onOpenFile(f)
      }}
    >
      <div className="flex items-center gap-2 border-b border-line p-3">
        <input
          aria-label="Título del archivo"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder={titleFromMd(md) || 'Sin título'}
          className="h-9 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sm font-semibold placeholder:text-ink-muted hover:bg-white/[0.04] focus:bg-white/[0.06]"
        />
        <Button onClick={() => fileRef.current?.click()} title="Abrir archivo .md">
          <FolderOpen className="size-4" /> Abrir
        </Button>
        <Button onClick={onNew} title="Documento nuevo">
          <FilePlus2 className="size-4" />
          <span className="sr-only">Nuevo</span>
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onOpenFile(f)
            e.target.value = ''
          }}
        />
      </div>
      <textarea
        aria-label="Markdown"
        value={md}
        onChange={(e) => onMd(e.target.value)}
        spellCheck
        placeholder={PLACEHOLDER}
        className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none placeholder:text-ink-muted/60"
      />
      <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-xs text-ink-muted tabular-nums">
        <span>{words.toLocaleString('es-AR')} palabras</span>
        <span>·</span>
        <span>
          {pageCount} {pageCount === 1 ? 'historia' : 'historias'}
        </span>
        {overflowCount > 0 && (
          <span className="ml-auto flex items-center gap-1 text-danger">
            <TriangleAlert className="size-3.5" /> {overflowCount} desborda{overflowCount > 1 ? 'n' : ''}
          </span>
        )}
      </div>
      {dragging && (
        <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-canvas/85 text-sm font-medium">
          Soltá el archivo .md para abrirlo
        </div>
      )}
    </section>
  )
}
