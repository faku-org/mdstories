import { History, LayoutTemplate, Palette, Stamp, Type } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { HistoryEntry } from '../storage'
import { PRESETS, type StoryStyle, type Template } from '../types'
import { BrandPanel, HistoryPanel, LayoutPanel, TemplatesPanel, TypographyPanel, type SetStyle } from './panels'

type Tab = 'type' | 'layout' | 'brand' | 'templates' | 'history'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'type', label: 'Tipografía', icon: <Type className="size-4" /> },
  { id: 'layout', label: 'Diseño', icon: <Palette className="size-4" /> },
  { id: 'brand', label: 'Marca', icon: <Stamp className="size-4" /> },
  { id: 'templates', label: 'Templates', icon: <LayoutTemplate className="size-4" /> },
  { id: 'history', label: 'Historial', icon: <History className="size-4" /> },
]

interface Props {
  style: StoryStyle
  setStyle: SetStyle
  templates: Template[]
  onApplyTemplate: (t: Template) => void
  onSaveTemplate: (name: string) => void
  onDeleteTemplate: (t: Template) => void
  history: HistoryEntry[]
  docId: string
  onOpenEntry: (e: HistoryEntry) => void
  onDeleteEntry: (e: HistoryEntry) => void
}

export function SettingsAside(props: Props) {
  const { style, setStyle } = props
  const [tab, setTab] = useState<Tab>('type')
  return (
      <aside aria-label="Ajustes" className="flex min-h-0 flex-col border-l border-line bg-surface max-md:border-l-0">
        <nav className="flex gap-1 overflow-x-auto border-b border-line p-2" role="tablist" aria-label="Secciones de ajustes">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              title={t.label}
              className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs max-md:h-11 max-md:px-2 max-md:text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-white/[0.1] text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t.icon}
              <span className={tab === t.id ? '' : 'sr-only'}>{t.label}</span>
            </button>
          ))}
        </nav>
        <div key={tab} className="min-h-0 flex-1 overflow-y-auto p-4 animate-[fade_200ms_ease-out]" role="tabpanel">
          {tab === 'type' && <TypographyPanel style={style} set={setStyle} />}
          {tab === 'layout' && <LayoutPanel style={style} set={setStyle} />}
          {tab === 'brand' && <BrandPanel style={style} set={setStyle} />}
          {tab === 'templates' && (
            <TemplatesPanel
              user={props.templates}
              builtIn={PRESETS}
              onApply={props.onApplyTemplate}
              onSave={props.onSaveTemplate}
              onDelete={props.onDeleteTemplate}
            />
          )}
          {tab === 'history' && <HistoryPanel entries={props.history} currentId={props.docId} onOpen={props.onOpenEntry} onDelete={props.onDeleteEntry} />}
        </div>
      </aside>
  )
}
