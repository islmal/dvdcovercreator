# Plan: DVD Cover Creator (Tauri v2 + React + Fabric.js)

Freigegeben: 2026-10-28

## Ausgangslage
- Projektordner leer (nur `SYSTEM_STATE.txt`), kein Git.
- Vorhanden: Node 24.20, npm 11.19, Rust 1.99, VS 2026 Community mit C++ Tools, WebView2.
- Rust nur `stable-x86_64-pc-windows-gnu` → Tauri braucht MSVC-Toolchain.

## Ziel & Architektur-Ansatz
Desktop-App zum Gestalten eines DVD-Covers (Back | Spine | Front) mit Export als 300-DPI-PDF/PNG.

- **Ein Fabric-Canvas in voller Druckauflösung.** Objekte leben in echten 300-DPI-Pixeln; Anzeige nur via `setZoom` + `setDimensions` auf Fenstergröße skaliert.
- **Layout = reine Funktion** `computeLayout(template, bleedOn)` → Zonen in px. Templates als JSON in **mm**; px = mm / 25.4 × 300 (gerundet). Fabric-frei → testbar.
- **Fabric.js v6 direkt**, kein React-Wrapper. Ein Modul `editor.ts` kapselt alle Canvas-Operationen; React macht nur UI/State.
- **Export:** Frontend rendert PNG in voller Auflösung (Guides ausgeblendet), schickt base64 an Rust-Command `export_cover`. Rust zeigt nativen Save-Dialog (`tauri-plugin-dialog`) und schreibt:
  - **PNG:** mit eingefügtem `pHYs`-Chunk (300 DPI = 11811 px/m), sonst öffnen Druckprogramme es mit 72 DPI.
  - **PDF:** via `printpdf` 0.7, eine Seite exakt in mm-Größe, Bild bei 300 DPI eingebettet.
- **Maße:** mm-Werte sind Quelle der Wahrheit. 129 + 14 + 129 mm = 272 mm → 3213 px (nicht 3240); 183 mm → 2161 px (nicht 2175). Werte im JSON änderbar.
- **Bleed an:** Canvas wird rundum um 3 mm (35 px) größer. Back/Front-Zonen reichen in den Anschnitt (außen + oben/unten), Spine nur oben/unten. Rot gestrichelte Beschnittlinie (Trim) sichtbar.

## Dateien (alle neu)
| Datei | Inhalt |
|---|---|
| Scaffold (`package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src-tauri/*`) | `npm create tauri-app@latest . -- --template react-ts --manager npm -y`; danach Tailwind v4 (`tailwindcss` + `@tailwindcss/vite`), `fabric@6`, `vitest` |
| `src/templates/standard-dvd.json`, `src/templates/slim-dvd.json` | `{ "id", "name", "dpi": 300, "heightMm": 183, "backMm": 129, "spineMm": 14 / 7, "frontMm": 129, "bleedMm": 3 }` |
| `src/templates/index.ts` | Template-Liste (Import der JSONs) |
| `src/lib/layout.ts` | `mmToPx`, `computeLayout(t, bleedOn)` → `{ width, height, bleedPx, trim: Rect, zones: { back, spine, front } }`, `zoneAt(x, layout)`, `coverFit(imgW, imgH, zone)` → `{ scale, left, top }` |
| `src/lib/layout.test.ts` | Vitest (siehe Verifizierung) |
| `src/lib/editor.ts` | `initCanvas`, `fitToViewport`, `drawGuides` (Spine-Linien + Trim-Linie, `selectable:false`, `evented:false`, immer oben), `addText(zone)`, `addImage(file, zone \| dropPoint)`, `setBackground(file)`, `autoFill(obj)`, `applyLayout(newLayout)`, `exportPng()` |
| `src/App.tsx` | Layout: Sidebar \| Canvas-Bereich \| Properties-Panel; State: Template, Bleed, aktive Auswahl, Zielzone |
| `src/components/Sidebar.tsx` | Add Text, Add Image, Upload Background, Select Template (Dropdown), Zielzone (Back/Spine/Front), Bleed-Toggle, Export PDF / Export PNG |
| `src/components/PropertiesPanel.tsx` | Text: Font Size, Farbe, Alignment, Outline-Farbe/-Breite (`paintFirst: 'stroke'`). Bild: Auto-Fill-Button |
| `src/index.css` | `@import "tailwindcss";` |
| `src-tauri/src/export.rs` | Reine Funktionen `png_with_dpi(bytes, dpi) -> Result<Vec<u8>>`, `build_pdf(png, w_mm, h_mm) -> Result<Vec<u8>>` + `#[cfg(test)]` |
| `src-tauri/src/lib.rs` | `#[tauri::command] async fn export_cover(app, data_b64: String, kind: String, width_mm: f32, height_mm: f32) -> Result<Option<String>, String>`; Plugin `tauri_plugin_dialog::init()` registrieren |
| `src-tauri/Cargo.toml` | + `tauri-plugin-dialog = "2"`, `base64 = "0.22"`, `crc32fast = "1"`, `printpdf = { version = "0.7", features = ["embedded_images"] }`; dev: `png` |
| `src-tauri/tauri.conf.json` | Fenster 1400×900, Titel „DVD Cover Creator“ |
| `README.md` | Voraussetzungen + Run-Anleitung + manuelle Smoke-Checkliste |
| `STATUS.md` | aktualisieren nach Abschluss |

## Implementierungs-Reihenfolge
1. **Umgebung:** `rustup toolchain install stable-msvc`; im Projekt `rustup override set stable-msvc`. `git init` + `.gitignore` (node_modules, dist, src-tauri/target).
2. **Scaffold:** create-tauri-app (react-ts, npm) im Projektordner; Tailwind v4, `fabric@6`, `vitest` installieren. Check: `npm run tauri dev` zeigt das Default-Fenster.
3. **Layout:** Templates + `layout.ts` + `layout.test.ts`. Check: `npx vitest run` grün.
4. **Canvas:** `editor.ts`: Init mit voller Größe, Zoom auf Viewport (ResizeObserver), Guides, Bleed-Toggle (Canvas neu dimensionieren, Objekte um ±bleedPx verschieben).
5. **Tools:**
   - Add Text: `IText` in Zielzone. Zielzone Spine → `angle: 90`, `originX/originY: 'center'`, `left` = Spine-Mitte, `top` = Canvas-Mitte. `object:moving`-Handler: Text, dessen Mitte im Spine liegt, rastet horizontal auf Spine-Mitte ein.
   - Add Image: Dateiauswahl (`<input type=file>`) → in Zielzone mittig eingefügt; zusätzlich Drag&Drop von Dateien auf den Canvas → Zone per `zoneAt(dropX)`.
   - Upload Background: Bild auf gesamten Canvas (inkl. Bleed) per `coverFit`, ganz nach hinten (`sendObjectToBack`).
6. **Auto-Fill:** Zone über Objektmitte (`zoneAt`) bestimmen; `coverFit` → skalieren + zentrieren; `clipPath = new Rect({...zone, absolutePositioned: true})`; `obj.autofillZone = zoneName` merken.
7. **Template-Wechsel:** `applyLayout(newLayout)`: Canvasgröße setzen; Objekte nach alter Zone verschieben (Front um Δ Spine-Breite, Spine-Objekte auf neue Spine-Mitte); Objekte mit `autofillZone` erneut auto-fillen; Guides neu zeichnen.
8. **Rust-Export:** `export.rs` + Tests; `export_cover`: base64 dekodieren → bei `png` `png_with_dpi`, bei `pdf` `build_pdf` → `app.dialog().file().add_filter(...).set_file_name(...).blocking_save_file()` → schreiben → Pfad zurückgeben. Dialog abgebrochen → `Ok(None)`, kein Fehler. Frontend: Guides ausblenden → `canvas.toDataURL({ format: 'png', multiplier: 1 / zoom })` → Guides einblenden → `invoke('export_cover', {...})`; `widthMm/heightMm` = Trim (+ 2×Bleed wenn an). Fehler als Alert anzeigen.
9. **Abschluss:** README, Verifizierung komplett, `/status`.

## Verifizierung (Pflicht)
1. **`npx vitest run`** – `src/lib/layout.test.ts`:
   - Standard: back = {x:0, w:1524}, spine = {x:1524, w:165}, front = {x:1689, w:1524}, width 3213, height 2161.
   - Slim: spine.w = `Math.round(7/25.4*300)` = 83 (Rundungsregel festgeschrieben), front.x = 1607.
   - Bleed an: width/height +70, alle Trim-/Zonen-x um 35 verschoben, back/front erweitert bis Canvasrand.
   - `zoneAt`: korrekte Zone an den Grenzen (x=1523 → back, 1524 → spine, 1689 → front).
   - `coverFit(1000, 500, {w:1524, h:2161})` → scale ≈ 4.322, Bild deckt Zone vollständig, zentriert.
2. **`cargo test`** in `src-tauri`:
   - `png_with_dpi`: Ergebnis enthält `pHYs` mit 11811 px/m (beide Achsen, Unit=1) und dekodiert fehlerfrei mit dem `png`-Crate (CRC korrekt).
   - `build_pdf`: Output beginnt mit `%PDF`; MediaBox ≈ mm→pt (272 mm → 771.0 pt, ±1).
3. **Build:** `npm run build` (tsc + vite fehlerfrei) und `cargo build` in `src-tauri`.
4. **Manueller Smoke-Test** (`npm run tauri dev`, Checkliste in README):
   - Text im Spine → 90° gedreht und zentriert; beim Verschieben im Spine rastet er mittig ein.
   - Auto-Fill füllt Bild exakt in die Zone (kein Überstand sichtbar).
   - Wechsel auf Slim → Zonen/Guides/Objekte korrekt verschoben, Auto-Fill-Bilder neu eingepasst.
   - Bleed-Toggle → Canvas wächst, Trim-Linie sichtbar.
   - PNG-Export: 3213×2161 px (mit Bleed 3283×2231), 300 DPI in Dateieigenschaften.
   - PDF-Export: Seite 272×183 mm (mit Bleed 278×189 mm).

## Out of Scope
Undo/Redo, Projekt speichern/laden, echte Lineale (nur gestrichelte Guides), Custom Fonts, CMYK (Export ist RGB), Template-Galerie über die zwei JSONs hinaus.

## Risiken
- `printpdf` 0.7 API mit Rust 1.99 ungeprüft → Fallback: minimaler handgeschriebener PDF-Writer (Bild als FlateDecode-RGB via `image` + `flate2`).
- Fabric v6 `toDataURL` mit `multiplier` bei sehr großen Canvas: Speicher; bei Problemen Zoom temporär auf 1 setzen statt multiplier.
