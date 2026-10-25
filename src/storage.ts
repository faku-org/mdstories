import { createStore, del, set, values } from 'idb-keyval'
import { normalizeStyle, type StoryStyle, type Template } from './types'

export interface HistoryEntry {
  id: string
  title: string
  md: string
  style: StoryStyle
  pages: number
  createdAt: number
  updatedAt: number
  thumb?: string
}

export interface Draft {
  docId: string
  title: string
  md: string
  style: StoryStyle
}

const historyStore = createStore('md-stories', 'history')
const TEMPLATES_KEY = 'mds:templates'
const DRAFT_KEY = 'mds:draft'

export const uid = () => crypto.randomUUID()

export async function listHistory(): Promise<HistoryEntry[]> {
  const all = await values<HistoryEntry>(historyStore)
  return all.map((e) => ({ ...e, style: normalizeStyle(e.style) })).sort((a, b) => b.updatedAt - a.updatedAt)
}

export const saveHistory = (e: HistoryEntry) => set(e.id, e, historyStore)
export const deleteHistory = (id: string) => del(id, historyStore)

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadTemplates(): Template[] {
  return readJson<Template[]>(TEMPLATES_KEY, []).map((t) => ({ ...t, style: normalizeStyle(t.style) }))
}

export const saveTemplates = (list: Template[]) => writeJson(TEMPLATES_KEY, list)

export function loadDraft(): Draft | null {
  const d = readJson<Draft | null>(DRAFT_KEY, null)
  return d ? { ...d, style: normalizeStyle(d.style) } : null
}

export const saveDraft = (d: Draft) => writeJson(DRAFT_KEY, d)
