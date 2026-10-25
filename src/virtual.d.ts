declare module 'virtual:brands' {
  /** [slug, title, svg path d, ...aliases] */
  const rows: [string, string, string, ...string[]][]
  export default rows
}

// One named export per icon (PascalCase). Imported through this file, not the package barrel, so the full set stays in a lazy chunk.
declare module 'lucide-react/dist/esm/icons/index.mjs'
