import { PenLine, SlidersHorizontal, Smartphone, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

export type MobileTab = 'editor' | 'stories' | 'settings'

const TABS: { id: MobileTab; label: string; icon: ReactNode }[] = [
  { id: 'editor', label: 'Editor', icon: <PenLine className="size-5" /> },
  { id: 'stories', label: 'Historias', icon: <Smartphone className="size-5" /> },
  { id: 'settings', label: 'Ajustes', icon: <SlidersHorizontal className="size-5" /> },
]

/** Phone navigation: one area at a time, thumb-reachable at the bottom. */
export function MobileNav({ tab, onTab, overflowCount }: { tab: MobileTab; onTab: (t: MobileTab) => void; overflowCount: number }) {
  return (
    <nav aria-label="Secciones" className="flex flex-none border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul role="tablist" className="flex w-full">
        {TABS.map((t) => {
          const on = tab === t.id
          return (
            <li key={t.id} className="flex-1">
              <button
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onTab(t.id)}
                className={`relative flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${on ? 'text-accent' : 'text-ink-muted'}`}
              >
                <span className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors ${on ? 'bg-accent/15' : ''}`}>{t.icon}</span>
                {t.label}
                {t.id === 'stories' && overflowCount > 0 && (
                  <span className="absolute top-1.5 left-1/2 ml-3 flex size-4 items-center justify-center rounded-full bg-danger text-on-accent">
                    <TriangleAlert className="size-3" />
                    <span className="sr-only">{overflowCount} desbordan</span>
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
