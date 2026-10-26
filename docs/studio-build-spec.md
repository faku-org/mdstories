# MD Stories Studio — Build Spec

Hand this file to the coding agent as-is. It is self-contained: everything you need
to know about the backend is in §4.

## 1. Vision

A phone-first screen where Facundo pastes or picks a Markdown file, presses one button,
and gets the finished Instagram stories (1080×1920 PNGs) rendered on the server. He is
usually away from his laptop: the phone is the device, and the loop is paste → generate →
save to Photos.

It lives inside the existing editor app at `/studio`. It is not a new product and not a
new deploy target.

## 2. Stack (mandatory)

- Existing repo: `faku-org/mdstories`. Vite + React 19 + TypeScript strict + Tailwind v4.
- Reuse what is already installed: `react`, `lucide-react`.
- **No new dependencies.** No state library, no fetch wrapper, no component kit, no date
  library, no Toast library.
- The app is a **dark tool**: the studio must use the tokens from `src/index.css` (§7),
  never a new palette.

## 3. Scope & priorities

**P0 — must ship**
1. Route `/studio` rendering a self-contained screen.
2. Markdown input: paste in a textarea, or pick a `.md` / `.txt` file (read client-side).
3. Autosave the draft to `localStorage` (`mds:studio:md`), debounced 400 ms.
4. "Generar historias" → `POST /render` → show progress while it runs.
5. Result: story count, a tappable thumbnail per page, primary "Descargar .zip".
6. Errors shown inline with the server message and a retry that keeps the text.
7. Last result survives a refresh (`localStorage` key `mds:studio:last`, stores the API response).

**P1 — only if P0 is green**
8. Character counter with the 200 000 limit, warning past 150 000.
9. "Copiar link" per page.
10. Keyboard: `Ctrl/Cmd + Enter` submits.

## 4. Backend contract (already live, do not change it)

Base: same origin, `https://mdstories.wefaber.net`. No token, no headers: nginx
authenticates the browser with basic auth and the request arrives already authorized.
A `401` means the basic-auth session was lost — show "Volvé a entrar" and reload.

### POST /render

```json
// request
{ "md": "# Título\n\nTexto.\n\n---\n\n## Segunda historia", "title": "opcional" }
```

```json
// 200
{
  "ok": true,
  "id": "42fa6add-006e-4d5b-9da7-39dde4cb32c2",
  "pages": 5,
  "files": ["historia-01.png", "historia-02.png", "historia-03.png", "historia-04.png", "historia-05.png"],
  "zipUrl": "/f/42fa6add-006e-4d5b-9da7-39dde4cb32c2/42fa6add-006e-4d5b-9da7-39dde4cb32c2.zip",
  "urls": ["https://mdstories.wefaber.net/f/42fa6add-.../historia-01.png", "..."],
  "ms": 2338
}
```

Errors: `400` empty markdown · `401` no session · `413` over 200 000 characters ·
`500` render failed. Body: `{ "ok": false, "error": "mensaje en español" }`.

### GET /health

`{ "ok": true, "active": 0, "queued": 0 }` — `active` is renders in flight (max 2), `queued`
is waiting. Optional: show a quiet "1 en curso" when `active > 0`.

**Domain rules to enforce in the UI**
- `---` on its own line starts a new story. Say it in the placeholder; do not parse Markdown
  in the client — the server decides pagination.
- Renders use the app's **default style** (fonts, colors, safe areas). The API does not accept
  a style yet: do not add style controls.
- One render is 1–3 s for 3–5 stories; the endpoint has no streaming. Anything over ~8 s is
  worth a "sigue en el servidor, no cierres" note.

## 5. Screens and states

Single screen, three visible states. No modal, no wizard.

**A. Idle** — textarea (min 8 rows), row with `Elegir .md` and a status line showing the file
name, primary button `Generar historias`, disabled when the text is empty or whitespace.

**B. Generating** — button becomes `Generando…` with a spinner, disabled; the textarea stays
editable but the layout must not jump. Status: "Renderizando en el servidor. Tarda unos segundos."
If it passes 8 s, add: "Sigue en el servidor, no cierres la pestaña."

**C. Result** — replaces the form (keep the draft in `localStorage`). Story count as the
headline (`5 historias listas`), a 2-column grid of thumbnails (each `<a target="_blank">` to
its PNG, with the number and a `Maximize2` icon), primary `Descargar .zip`, secondary
`Volver a editar` (back to A with the text still there).

**Error** — inline above the button, `--color-danger`, the server's message, and the retry is
the same button. Never a toast that disappears.

## 6. Functional detail

- Autosave: `localStorage.setItem('mds:studio:md', text)` debounced 400 ms.
- On mount: restore `mds:studio:md`; if `mds:studio:last` exists, start in state C with that
  result, and offer `Volver a editar`.
- File input: `accept=".md,.markdown,.txt,text/markdown,text/plain"`, hidden, triggered by the
  button; on change read `await file.text()` into the textarea and show the name.
- Submit: `fetch('/render', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ md, title }) })`.
  Do not send credentials explicitly — same-origin cookies/basic auth are automatic.
- Thumbnails: use the `urls` array, `loading="lazy"`, `loading` skeleton while `img` decodes,
  `alt="Historia N"`, aspect ratio 9/16.
- Persist the whole last response object, not just the URLs, so `Volver a editar` and a refresh
  stay consistent.

## 7. UX & visual style

Dark tool, same family as the editor. Copy these variables from `src/index.css` — they are
already defined, so use the Tailwind classes built on them (`bg-canvas`, `bg-surface`,
`border-line`, `text-ink`, `text-ink-muted`, `bg-accent`, `text-on-accent`) or the CSS vars:

| token | value | use |
|---|---|---|
| `--color-canvas` | `#121215` | page background |
| `--color-surface` | `#1a1a1f` | cards, textarea |
| `--color-surface-2` | `#23232a` | thumbnails, hover |
| `--color-line` | `rgb(255 255 255 / 0.08)` | 1px borders |
| `--color-ink` | `#ececf1` | primary text |
| `--color-ink-muted` | `#a0a0ac` | secondary text |
| `--color-accent` | `#c5f26c` | the one primary button, focus ring |
| `--color-on-accent` | `#121215` | text on the accent |
| `--color-danger` | `#ff8f80` | errors |

Layout rules (these are the review checklist, not suggestions):
- Mobile first at **390 px**. `#root` is already `100dvh`; respect `safe-area-inset-bottom`
  on the sticky action bar.
- One primary action per screen. Secondary actions are ghost buttons.
- Every tap target ≥ **44 px**; every input/textarea **16 px** font (iOS zooms below that).
- Card radius 16 px, button radius 999 px, 1px `--color-line` borders. No shadows.
- Textarea: `font-mono` (the app already loads JetBrains Mono Variable), `line-height: 1.5`.
- Max content width 560 px, centered; the layout must not stretch on desktop.
- Numbers and counts in Spanish (`5 historias`), code and identifiers in English.

**Banlist — do not ship any of these.** They are this model's defaults, not design:
- no cream/off-white background, no light theme, no purple/cyan gradient, no glow, no
  glassmorphism blur behind cards;
- no italic serif accent words in the headline, no all-caps mono labels for UI chrome,
  no `01 / 02 / 03` step numbers, no decorative dotted grid or grain;
- no pill buttons for everything — only the primary action and the file picker are pills;
- no emoji anywhere; icons come from `lucide-react` (`Sparkles`, `Download`, `FileText`,
  `Maximize2`, `Loader2`, `ArrowLeft`, `RefreshCw` at 16–18 px, `stroke-width` 2);
- no hero copy, no marketing sentence, no "powered by" footer, no version badge;
- no `alert()`, no `confirm()`, no full-screen overlay.

## 8. Non-goals

- No auth UI, no login screen, no token input: nginx already holds the password.
- No style editor, no palette/font controls, no safe-zone preview.
- No MP4 export, no Remotion.
- No Instagram publishing, no scheduling.
- No history list beyond the last result.
- No changes to `render/`, `src/App.tsx`, `src/paginate.ts`, `src/export.ts`, or the CI
  workflows. If the API seems insufficient, stop and say what is missing — do not work around
  it by reimplementing the renderer in the browser.

## 9. Definition of done

Check each one and paste the evidence in the final message:

1. `bun run check` (oxlint + tsc -b) and `bun run build` are clean.
2. `git grep -nE "WCM_TOKEN|Bearer |STUDIO_PASS"` over `src/` returns nothing.
3. At 390×780 in the browser: no horizontal scrollbar anywhere, every button ≥44 px tall,
   textarea font-size 16 px.
4. Paste a 5-story Markdown (repeat a paragraph six times, no `---`): the result shows the real
   page count the server returned, and each thumbnail opens a 1080×1920 PNG in a new tab.
5. `Descargar .zip` downloads a file that unzips to the same number of PNGs.
6. Refresh on `/studio` with a previous result: the result screen is restored from
   `localStorage`, and `Volver a editar` returns the text intact.
7. Kill the network (offline) and submit: the error is inline, the text is not lost, and the
   retry works once online.
8. Screenshot at 390×780 of idle, generating and result, and look at them before declaring done.

## 10. Build order

1. `src/studio/Studio.tsx` + a branch in `src/main.tsx`:
   `location.pathname.replace(/\/$/, '') === '/studio' ? <Studio /> : <App />`.
2. Layout shell with the tokens and the 560 px column; verify the dark theme matches the editor.
3. Textarea + file picker + autosave/restore.
4. `useRender` hook: submit, pending, result, error. Types for the response.
5. Result screen: count, thumbnail grid, zip, back.
6. Persist/restore the last result.
7. Mobile sweep at 390 px: overflow, targets, keyboard, safe area. Fix, re-capture, look again.
8. Run the Definition of Done and report, marking anything you could not confirm and where
   you looked.

---

### Context the agent cannot infer

- The editor app is served by the same Bun service that renders (`render/src/server.ts`),
  and it falls back to `index.html` for unknown paths, so a client-side route works with no
  server change.
- `/f/` URLs are open and expire after 24 h: a saved link stops working, a downloaded file
  does not. Do not cache-bust them or add a proxy.
- The logo/branding in the stories comes from the app's default style, not from the Markdown.
- Facundo reads Spanish; write UI copy in Rioplatense Spanish ("Generá las historias",
  "Volver a editar"), not neutral Spanish.
