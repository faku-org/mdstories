# Fixes 2026-10-25 · v0.1.0

`[ ]` pendiente · `[~]` parcial (con nota) · `[x]` hecho y verificado en el browser.

## UI

- [x] Pills de la barra de ajustes (Tipografía, Diseño, Marca…): falta padding horizontal, el texto queda pegado al borde.
- [x] Botones sin `cursor-pointer` (Button, tabs, Segmented, IconPicker, Toggle, thumbnails).
- [x] Toggle (switch): estados mal. Apagado el knob queda pegado a la izquierda; encendido se sale del track (overflow).

## UX

- [x] Íconos de marca: permitir íconos de marcas (redes, etc.) o cualquier ícono de lucide-react, no solo la lista curada.
  Selector con buscador (diálogo) sobre los 1.903 íconos de Lucide y 3.467 marcas de Simple Icons (CC0, empaquetadas, sin CDN); sirve para el ícono del encabezado, las viñetas y el indicador de continuación. Ids: `nombre` = Lucide, `si:slug` = marca. Ambos catálogos son chunks lazy (Lucide ~163 kB gzip, marcas ~2 MB gzip, solo se bajan al abrir el buscador o si el estilo guardado usa un ícono así); el bundle principal bajó de 372 a 210 kB gzip. Lucide v1 ya no trae logos de redes: Instagram, GitHub, etc. están en la pestaña Marcas.
- [x] Fuentes custom: importar desde Google Fonts o subir un archivo (woff2/ttf/otf). Deben entrar en la paginación y en el PNG exportado.
  Botón "Agregar o importar fuente" en Tipografía: Google Fonts (nombre o link; se descarga una vez, solo subsets latin y latin-ext) o archivo .woff2/.woff/.ttf/.otf (hasta 8 MB). Se guardan en IndexedDB y se registran como `@font-face` con data URLs en un `<style>`, por eso entran en la paginación (`ensureFonts`) y `getFontEmbedCSS` las embebe en el PNG (verificado con Playfair Display: título e itálica en el PNG). Límites: en archivos subidos el rango de pesos lo elige el usuario (no se lee del archivo); las fuentes de Google se asumen sans para el fallback; una fuente borrada que usa un estilo cae a Inter.
- [ ] Paneles redimensionables (editor / preview / ajustes), con el tamaño guardado.
- [ ] Atajos de teclado (registro único + ayuda con `?`). Hoy: ← →, Ctrl+S, Ctrl+Shift+E.
- [ ] Modo preview: se ve solo lo que se exporta (sin editor, sin ajustes, sin zonas seguras).

## Features

- [ ] Export animado a MP4 (fades, slides, loading, etc.). Largo plazo: va como issue en el ROADMAP cuando el repo tenga remoto en GitHub.
