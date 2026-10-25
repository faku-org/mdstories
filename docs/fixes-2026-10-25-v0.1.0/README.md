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
- [x] Paneles redimensionables (editor / preview / ajustes), con el tamaño guardado.
  Dos separadores (`role=separator`): arrastrar, ← → (Shift = pasos grandes), Home/End, doble clic o Enter para restablecer. Anchos en `localStorage` (`mds:layout`); el preview nunca baja de 320 px y la preferencia vuelve cuando la ventana crece. Verificado: teclado y eventos de puntero sintéticos, persistencia tras recargar, 1440 px. No pude probar un arrastre real con el mouse (la herramienta de arrastre del browser no dispara los eventos de puntero).
- [x] Atajos de teclado (registro único + ayuda con `?`). Hoy: ← →, Ctrl+S, Ctrl+Shift+E.
  Registro único en `src/shortcuts.ts` (un solo listener; la ayuda se dibuja desde la misma lista). Atajos: ← → Inicio Fin, Ctrl+S, Ctrl+E (esta historia), Ctrl+Shift+E, Z (zonas seguras), `?` (ayuda, también botón con ícono de teclado). Las teclas sueltas se ignoran al escribir, en sliders/separadores y con un diálogo abierto; las de Ctrl siempre andan. Verificado con eventos de teclado reales en el DOM.
- [x] Modo preview: se ve solo lo que se exporta (sin editor, sin ajustes, sin zonas seguras).
  Botón "Preview" en la barra del preview y atajo `P` (Esc o `P` salen). Muestra solo la historia a tamaño máximo, sin editor, ajustes, barra ni zonas seguras; queda un control flotante (← n/N → Salir). Los paneles siguen montados (la pestaña y el scroll se conservan) y las miniaturas siguen maquetadas fuera de pantalla, así que Ctrl+E / Ctrl+Shift+E exportan igual (verificado: PNG de 1080×1920 con contenido desde el modo preview).

## Features

- [ ] Export animado a MP4 (fades, slides, loading, etc.). Largo plazo: va como issue en el ROADMAP cuando el repo tenga remoto en GitHub.
  **No implementado: plan para que decidas.**

  Objetivo: un MP4 9:16 (1080×1920, H.264, 30 fps) por historia o uno solo con todas, con animaciones simples: fade, slide de bloques, barra de progreso ("loading") y revelado del texto por línea o palabra.

  Costo medido: `html-to-image` renderiza una historia de 1080×1920 en ~75–95 ms (medido en esta app, fuentes ya cargadas). Una historia de 5 s a 30 fps son 150 frames (~12–14 s); 26 historias son ~3.900 frames, unos 5–6 minutos. Es factible, pero lento, y hoy el export se frena si la ventana está oculta (`requestAnimationFrame`).

  Dos formas de generar los frames:
  - (A) Capas + compositor en canvas: ~100 veces más rápido (≈2–5 ms/frame) y determinista, pero solo anima capas (fade, slide, escala, revelado por línea/palabra).
  - (A2) Avanzar animaciones CSS reales con la Web Animations API (`animation.currentTime = t`) y rasterizar cada frame con `html-to-image`: permite cualquier animación de CSS, a costa de los 5–6 minutos de arriba y de depender del render del DOM.

  Recomendación: (A), y dejar (A2) como plan B si hace falta animación CSS arbitraria. Pipeline:
  1. Rasterizar cada historia una sola vez en capas (fondo, encabezado, pie, y un bitmap por bloque/línea/palabra según el efecto), con el mismo `html-to-image` y las mismas fuentes embebidas que hoy. Las líneas se obtienen con `Range.getClientRects()` sobre el layout ya paginado.
  2. Un compositor `canvas 2D` dibuja cada frame transformando esas capas (opacity, translate, clip), sin depender de `requestAnimationFrame` (hoy el export se frena con la ventana oculta; acá no).
  3. `VideoEncoder` (WebCodecs, `avc1.640028`) + `mp4-muxer` (o `mediabunny`, su sucesor) para armar el `.mp4` en memoria; sin audio o con una pista silenciosa AAC. Backpressure con `encodeQueueSize` y cancelación desde la UI.
  4. El mismo compositor alimenta un reproductor en el modo preview, así se ve la animación antes de exportar.

  Otras alternativas, descartadas:
  - ffmpeg.wasm (B): acepta cualquier filtro y códec, pero el core pesa ~30 MB, es lento (single thread salvo COOP/COEP), x264 es GPL y hay que renderizar igual todos los frames a PNG antes. Solo conviene si hiciera falta audio mezclado o un códec que WebCodecs no tiene.
  - `MediaRecorder` sobre `canvas.captureStream` (C): es el más corto de escribir, pero graba en tiempo real, no es determinista, el navegador decide el contenedor (WebM en Chrome) y se frena con la ventana en segundo plano.
  - Servidor con Playwright + ffmpeg (D): máxima fidelidad, pero rompe que la app sea 100 % local y sumaría infraestructura al VPS.

  Compromisos de (A): las animaciones quedan limitadas a lo que se puede hacer moviendo capas (no anima propiedades de CSS dentro del texto); más capas = más memoria (cada bitmap 1080×1920 son ~8 MB, hay que liberar por historia); WebCodecs de video necesita Chrome/Edge 94+ o Safari 16.4+, en Firefox recién desde la 130 (a verificar); y hay que verificar emojis y fuentes custom en las capas (las data URLs ya funcionan para el PNG).

  Esfuerzo estimado: 4–5 días. Día 1: capas por línea/palabra + compositor + reproductor en preview. Día 2: pipeline de encode + muxer + progreso y cancelación + límites de memoria. Día 3: presets de animación (fade, slide, loading, typewriter) y UI (duración por historia según palabras, fps, preset). Día 4–5: pruebas en Chrome/Safari/Firefox, fuentes y emojis, rendimiento con 26 historias y subir un MP4 real a Instagram.

  Para decidir: (1) ¿alcanza con animar capas (A) o querés animación de CSS arbitraria (A2, más lento)?; (2) ¿hace falta audio?; (3) ¿qué efectos entran en la primera versión?; (4) ¿un MP4 por historia, uno con todas, o ambos?; (5) navegadores objetivo (¿Firefox cuenta?).
