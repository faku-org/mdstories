# Render API (mdstories.wefaber.net)

Headless rendering of Markdown into stories. The app is client-only, so the service
drives the real built app in Chromium (Playwright) and returns the same PNGs the
export button produces — same pagination, same fonts, same html-to-image pipeline.

Live: `https://mdstories.wefaber.net`
Source: `render/` · Service: `mdstories-render.service` on `127.0.0.1:4181`

## Auth

`POST /render` and `/codemode/*` require `Authorization: Bearer <WCM_TOKEN>`.
The token lives in `/home/hermes/deploy/mdstories-render.env` on the VPS.
Files under `/f/` are open (the id is a UUID and they expire in 24 h) so they can be
shown in `<img>` tags and opened from a phone.

## POST /render

```bash
curl -X POST https://mdstories.wefaber.net/render \
  -H "Authorization: Bearer $WCM_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"md":"# Título\n\nTexto de la historia.\n\n---\n\n## Segunda","title":"Opcional"}'
```

```json
{
  "ok": true,
  "id": "896f1bc8-9ea8-4ff5-afd7-31aec4fad5f8",
  "pages": 5,
  "files": ["historia-01.png", "...", "historia-05.png"],
  "zipUrl": "/f/<id>/<id>.zip",
  "urls": ["https://mdstories.wefaber.net/f/<id>/historia-01.png", "..."],
  "ms": 2305
}
```

- `md` — Markdown. `---` starts a new story (when the style splits on `hr`).
  Anything that overflows the safe area is split at the last word that fits.
- `title` — optional, only used for history/naming.
- Errors: `400` empty md, `401` bad token, `413` over 200 000 characters, `500` render failure.

Each PNG is 1080×1920, RGBA, with fonts embedded. A four-story document takes about 2–3 s;
Chromium renders two documents at a time (`/health` reports `active` and `queued`).

## GET /f/:id/:name

Serves a PNG or the zip. `content-disposition: inline`, so a phone opens the image
and a long-press saves it to Photos.

## POST /codemode/execute

Same render, shaped for agents (one op, WCM single-tool exception):

```bash
curl -X POST https://mdstories.wefaber.net/codemode/execute \
  -H "Authorization: Bearer $WCM_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"op":"stories.render","input":{"md":"# Hola"}}'
```

`GET /codemode/search` returns the op catalog with input/output shapes.

## GET /health

```json
{ "ok": true, "active": 0, "queued": 0 }
```

## How the renderer talks to the app

`render/src/render.ts` seeds `localStorage['mds:draft']`, loads `/?render=1`, and waits for
`window.__MDS_RENDER__.ready()` (pagination writes real HTML into the first page) and then for
the page count to stay stable. It calls `.render()`, which runs the app's own `fontCss` +
`renderAll` and returns the PNG data URLs.

Two traps this exists to avoid:

1. **Exporting before pagination settles** returns one blank story (measured: ~1 400 content
   pixels out of 2 M, header and footer only). `ready()` is the guard.
2. **`display:none` on the strip** makes html-to-image produce blank nodes. The mobile layout
   keeps the strip mounted and off-screen on purpose; `?render=1` also forces the `stories` tab.

## Deploy

Push to `main` runs `.github/workflows/deploy.yml` on the `vps-faku-org` runner:
build, then `~/deploy/mdstories-render.sh` (new release dir, `current` symlink swap,
restart, health check, keep the last 5 releases). Manual run:

```bash
~/deploy/mdstories-render.sh ~/repos/mdstories
```
