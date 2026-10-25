# MD Stories

Markdown → Instagram Stories (1080×1920 PNG). Client-only: Vite + React 19 + Tailwind v4.

```bash
bun install
bun run dev
```

## How it works

- `src/markdown.ts` — `marked` → top-level blocks; `---` starts a new story; list bullets become explicit spans.
- `src/paginate.ts` — fills each story inside the safe area by measuring real layout in a hidden, unscaled page.
  Blocks that overflow are split at the last word that fits (`Range.cloneContents`, inline markup preserved).
  Headings never end a story.
- `src/export.ts` — `html-to-image` PNG at 1080×1920 with embedded variable fonts; several stories go into a `.zip`.
- `src/storage.ts` — templates and the current draft in `localStorage`, file history in IndexedDB.

Shortcuts: `←` `→` change story · `Ctrl+S` save to history · `Ctrl+Shift+E` export all.

Export needs the window visible: `html-to-image` waits for an animation frame per image.
