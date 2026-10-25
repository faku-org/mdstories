# Graph Report - mdstories  (2026-10-25)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 259 nodes · 503 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.81)
- Token cost: 789 input · 1,769 output

## Graph Freshness
- Built from commit: `8a30b8e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App UI Controls
- Story Preview & History
- Package Metadata & Fonts
- Local Document Storage
- Export & Documentation
- TypeScript App Config
- Runtime Dependencies & Fonts
- Build & Dev Tooling
- Node TypeScript Config
- Markdown Pagination Logic
- Markdown Editor & Parsing
- Lint Rules Config
- Root TypeScript Config

## God Nodes (most connected - your core abstractions)
1. `App()` - 19 edges
2. `compilerOptions` - 19 edges
3. `StoryStyle` - 16 edges
4. `compilerOptions` - 15 edges
5. `react` - 11 edges
6. `lucide-react` - 10 edges
7. `getFont()` - 8 edges
8. `exportAll()` - 7 edges
9. `scripts` - 7 edges
10. `HistoryEntry` - 6 edges

## Surprising Connections (you probably didn't know these)
- `index.html entry document` --references--> `App favicon (SVG)`  [EXTRACTED]
  index.html → public/favicon.svg
- `Fixes 2026-10-25 · v0.1.0 fix list` --conceptually_related_to--> `MD Stories README`  [INFERRED]
  docs/fixes-2026-10-25-v0.1.0/README.md → README.md
- `Props` --references--> `StoryStyle`  [EXTRACTED]
  src/components/StoryPage.tsx → src/types.ts
- `Draft` --references--> `StoryStyle`  [EXTRACTED]
  src/storage.ts → src/types.ts
- `App()` --calls--> `titleFromMd()`  [EXTRACTED]
  src/App.tsx → src/markdown.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Markdown → paginate → PNG export pipeline** — src_markdown, src_paginate, src_export, marked, html_to_image [EXTRACTED 0.90]
- **Post-v0.1.0 UI/UX/feature fixes** — docs_fixes_2026_10_25_v0_1_0_readme, lucide_react, google_fonts [INFERRED 0.70]

## Communities (13 total, 1 thin omitted)

### Community 0 - "App UI Controls"
Cohesion: 0.10
Nodes (30): index.html entry document, App favicon (SVG), react, Button(), ColorField(), Group(), IconPicker(), Segmented() (+22 more)

### Community 1 - "Story Preview & History"
Cohesion: 0.12
Nodes (27): lucide-react, initial, HistoryPanel(), SetStyle, PreviewStage(), Props, SafeZoneOverlay(), Props (+19 more)

### Community 2 - "Package Metadata & Fonts"
Cohesion: 0.09
Nodes (27): name, private, type, version, @fontsource-variable/bricolage-grotesque, @fontsource-variable/dm-sans, @fontsource-variable/fraunces, @fontsource-variable/inter (+19 more)

### Community 3 - "Local Document Storage"
Cohesion: 0.14
Nodes (21): IndexedDB, localStorage, idb-keyval, App(), newDoc(), openFile(), removeEntry(), saveTemplate() (+13 more)

### Community 4 - "Export & Documentation"
Cohesion: 0.15
Nodes (20): Fixes 2026-10-25 · v0.1.0 fix list, docs index, Google Fonts / custom font files, html-to-image (DOM → raster), lucide-react icon set, MD Stories README, html-to-image, jszip (+12 more)

### Community 5 - "TypeScript App Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+12 more)

### Community 6 - "Runtime Dependencies & Fonts"
Cohesion: 0.11
Nodes (19): dependencies, dompurify, @fontsource-variable/bricolage-grotesque, @fontsource-variable/dm-sans, @fontsource-variable/fraunces, @fontsource-variable/inter, @fontsource-variable/jetbrains-mono, @fontsource-variable/lora (+11 more)

### Community 7 - "Build & Dev Tooling"
Cohesion: 0.11
Nodes (17): devDependencies, oxlint, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom, typescript (+9 more)

### Community 8 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 9 - "Markdown Pagination Logic"
Cohesion: 0.26
Nodes (12): ensureFonts(), usePagination(), mdToSections(), cut(), inBullet(), paginate(), Pos, prune() (+4 more)

### Community 10 - "Markdown Editor & Parsing"
Cohesion: 0.26
Nodes (10): marked (Markdown parser), dompurify, marked, EditorPane(), Props, iconSvg(), countWords(), decorateLists() (+2 more)

### Community 11 - "Lint Rules Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

## Knowledge Gaps
- **103 isolated node(s):** `Tab`, `Align`, `Props`, `FontDef`, `Pos` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 109 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies & Fonts` to `Package Metadata & Fonts`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `react` connect `App UI Controls` to `Story Preview & History`, `Package Metadata & Fonts`, `Markdown Editor & Parsing`, `Markdown Pagination Logic`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `Story Preview & History` to `App UI Controls`, `Package Metadata & Fonts`, `Markdown Editor & Parsing`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `App()` (e.g. with `exportAll()` and `saveToHistory()`) actually correct?**
  _`App()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Tab`, `Align`, `Props` to the rest of the system?**
  _103 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App UI Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.09957325746799431 - nodes in this community are weakly interconnected._
- **Should `Story Preview & History` be split into smaller, more focused modules?**
  _Cohesion score 0.12063492063492064 - nodes in this community are weakly interconnected._