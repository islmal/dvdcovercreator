# DVD Cover Creator

Desktop app (Tauri v2 + React + Fabric.js) for designing print-ready DVD covers (Back | Spine | Front) and exporting them as PDF or PNG at 300 DPI.

## Features
- Standard and Slim case templates, optional 3 mm bleed with trim guides
- Express Wizard: generates back/spine/front layout with title, synopsis and badges in one click
- Image auto-fill, spine text rotated and snapped to center
- PNG and PDF export at 300 DPI with exact pixel/mm dimensions

## Prerequisites
Node 24+, Rust (MSVC toolchain: `rustup override set stable-x86_64-pc-windows-msvc`), Visual Studio C++ Build Tools, WebView2.

## Build / Run / Test
```
npm install
npm run tauri dev      # run the app
npm run tauri build    # production bundle
npm test               # vitest (layout)
cd src-tauri && cargo test
```

## Project structure
- `src/lib/layout.ts` – pure layout math (templates in mm → zones in px)
- `src/lib/editor.ts` – all Fabric canvas operations
- `src/components/` – React UI (Sidebar, PropertiesPanel)
- `src-tauri/src/` – Rust export (PNG with DPI metadata, PDF)

## Manual smoke checklist
- [ ] Spine text is rotated 90°, centered; snaps to center when dragged within the spine
- [ ] Auto-Fill fills the image exactly into the zone (no overflow)
- [ ] Switching to Slim moves zones/guides/objects and refits auto-fill images
- [ ] Bleed toggle grows the canvas, red trim line visible
- [ ] PNG export: 3213×2161 px (3283×2231 with bleed), 300 DPI in file properties
- [ ] PDF export: page 272×183 mm (278×189 mm with bleed)

## Trademark notice
The "DVD" badge is a generic placeholder, not the official DVD-Video logo. DVD-Video is a trademark of its respective owner.

## License
[MIT](LICENSE)
