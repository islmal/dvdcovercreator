# STATUS – DVD Cover Creator

## Mission & Out-of-Scope
Desktop-App (Tauri v2 + React/TS + Tailwind v4 + Fabric.js v6) zum Gestalten und Exportieren druckfertiger DVD-Cover (300 DPI, Back | Spine | Front, optional 3 mm Bleed) als PDF/PNG.
Out of Scope: Undo/Redo, Projekt speichern/laden, Custom Fonts, CMYK, Lineale, weitere Templates.

## System Architecture & Data Flow
- Ein Fabric-Canvas in voller Druckauflösung (px = mm/25.4*300, gerundet); Anzeige nur per `setZoom`/`setDimensions` (ResizeObserver).
- `lib/layout.ts` ist reine Funktion `computeLayout(template, bleedOn)` → Zonen in px (Templates = JSON in mm). Fabric-frei, per Vitest getestet.
- `lib/editor.ts` kapselt alle Canvas-Operationen; React (App/Sidebar/PropertiesPanel) hält nur UI-State. Layoutwechsel (Template/Bleed) = `editor.setLayout(new)`: Objekte werden je nach alter Zone verschoben, Auto-Fill-Bilder/Background neu eingepasst.
- Guides (Spine-Linien, Trim) werden in `after:render` gezeichnet, keine Objekte → nie selektier-/exportierbar.
- Export: Frontend rendert PNG bei Zoom 1 (nicht via `multiplier`, sonst Rundungsfehler bei Pixelmaßen) → base64 → Rust `export_cover` → nativer Save-Dialog → `png_with_dpi` (pHYs 11811 px/m) bzw. `build_pdf` (printpdf 0.7, 300 DPI).
- Express Wizard: `wizardSlots(layout)` (layout.ts, rein, 6 % Rand in Trim-Fl�chen) liefert Positionen; `editor.autoGenerate` entfernt zuerst alle `wizard:true`-Objekte (Re-Run ohne Duplikate) und baut dunkle Back/Spine-Fl�chen, Front-Bild, 3 Titel, Synopsis, 2 DVD-Logos (eigene Pfad-SVG, kein Original-Logo). Pro Logo SVG neu parsen (`groupSVGElements` �bernimmt die Objekte).
- Fallen: Canvas-Hintergrund ist explizit weiß (sonst transparenter Export); `dragDropEnabled:false` in tauri.conf nötig, sonst feuern HTML5-Drop-Events nicht; Rust läuft nur mit MSVC-Toolchain (`rustup override`); Spine-Text hat origin center + 90°, Snap nur für `IText`.

## Roadmap & Known Issues
- [planned] One-Click Express Wizard → docs/plans/2026-10-28-express-wizard.md
- Nativer Smoke-Test in `npm run tauri dev` noch offen (Save-Dialog, DPI in Dateieigenschaften, PDF-Seitenmaß) – Checkliste in README.
- Drag&Drop von Dateien nur im Browser-Pane geprüft, nicht im Tauri-Fenster.
- Kein Delete per Taste (nur Button), kein Git-Commit angelegt.

## Milestone Changelog
- 2026-10-28: Plan dvd-cover-creator umgesetzt (Scaffold, Layout, Editor, Rust-Export). Verifiziert: `vitest` 5/5, `cargo test` 3/3, `npm run build` + `cargo build` grün; Canvas-Verhalten (Spine-Text 90°, Auto-Fill, Slim/Bleed-Verschiebung, PNG-Maße 3213×2161 / 3283×2231 / 3131×2161 / 3201×2231) im Browser-Pane geprüft.
- 2026-10-28: Express Wizard (`wizardSlots`, `autoGenerate`, Sidebar-Abschnitt). Verifiziert: `vitest` 8/8, `tsc`+`vite build` gr�n; im Browser-Pane per Pixelpr�fung: alle Wizard-Objekte inkl. beider Logos sichtbar, 3� Klick ohne Duplikate, Slim/Bleed korrekt verschoben, Canvas-Seitenverh�ltnisse stimmen.
