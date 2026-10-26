# Mobile UI (v0.5.0)

Below `768px` (`useMediaQuery('(max-width: 767px)')`) the three-column layout becomes one area at a time with a bottom tab bar (`MobileNav`).

| Tab | Shows |
|---|---|
| Editor | Title, open/new file, Markdown textarea, word and story count |
| Historias | Story preview (swipe left/right to change story), safe-zone and preview toggles, story strip, save / PNG / video, export all |
| Ajustes | The same settings tabs as desktop, full width |

Rules:

- Panels stay mounted (caret, scroll and settings tab survive a tab change). Only the active one is displayed.
- The story strip holds the export sources, so when "Historias" is not the active tab the preview column is moved off-screen (like preview mode), never `display: none`.
- Touch targets are 44px (`max-md:h-11`, `max-md:size-11`); inputs use 16px text so iOS does not zoom on focus.
- Resize handles and the keyboard-shortcuts button are not rendered on phones. Preview mode (eye button) still works; exit with "Salir".
- `viewport-fit=cover` + `env(safe-area-inset-bottom)` keep the tab bar clear of the home indicator; `#root` uses `100dvh`.
