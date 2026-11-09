# STATUS â€“ DVD Cover Creator

## Mission & Out-of-Scope
Desktop-App (Tauri v2 + React/TS + Tailwind v4 + Fabric.js v6) zum Gestalten und Exportieren druckfertiger DVD-Cover (300 DPI, Back | Spine | Front, optional 3 mm Bleed) als PDF/PNG.
Out of Scope: Undo/Redo, Projekt speichern/laden, Custom Fonts, CMYK, Lineale, weitere Templates.

## System Architecture & Data Flow
- Ein Fabric-Canvas in voller DruckauflÃ¶sung (px = mm/25.4*300, gerundet); Anzeige nur per `setZoom`/`setDimensions` (ResizeObserver).
- `lib/layout.ts` ist reine Funktion `computeLayout(template, bleedOn)` â†’ Zonen in px (Templates = JSON in mm). Fabric-frei, per Vitest getestet.
- `lib/editor.ts` kapselt alle Canvas-Operationen; React (App/Sidebar/PropertiesPanel) hÃ¤lt nur UI-State. Layoutwechsel (Template/Bleed) = `editor.setLayout(new)`: Objekte werden je nach alter Zone verschoben, Auto-Fill-Bilder/Background neu eingepasst.
- Guides (Spine-Linien, Trim) werden in `after:render` gezeichnet, keine Objekte â†’ nie selektier-/exportierbar.
- Export: Frontend rendert PNG bei Zoom 1 (nicht via `multiplier`, sonst Rundungsfehler bei PixelmaÃŸen) â†’ base64 â†’ Rust `export_cover` â†’ nativer Save-Dialog â†’ `png_with_dpi` (pHYs 11811 px/m) bzw. `build_pdf` (printpdf 0.7, 300 DPI).
- Express Wizard: `wizardSlots(layout)` (layout.ts, rein, 6 % Rand in Trim-Flächen) liefert Positionen; `editor.autoGenerate` entfernt zuerst alle `wizard:true`-Objekte (Re-Run ohne Duplikate) und baut dunkle Back/Spine-Flächen, Front-Bild, 3 Titel, Synopsis, 2 DVD-Badges (generische Fabric-`Group` aus Rect + Text, kein Original-Logo; pro Aufruf neue Instanz).
- Fallen: Canvas-Hintergrund ist explizit weiÃŸ (sonst transparenter Export); `dragDropEnabled:false` in tauri.conf nÃ¶tig, sonst feuern HTML5-Drop-Events nicht; Rust lÃ¤uft nur mit MSVC-Toolchain (`rustup override`); Spine-Text hat origin center + 90Â°, Snap nur fÃ¼r `IText`.

## Roadmap & Known Issues
- [planned] Repo public machen (README, LICENSE, Logo-Ersatz, Cleanup) – docs/plans/2026-10-28-public-release.md
- Nativer Smoke-Test in `npm run tauri dev` noch offen (Save-Dialog, DPI in Dateieigenschaften, PDF-Seitenmaß) – Checkliste in README.
- Drag&Drop von Dateien nur im Browser-Pane geprüft, nicht im Tauri-Fenster.
- `cargo test` meldet aktuell 0 Tests (frühere „3/3“ nicht reproduziert).

## Milestone Changelog
- 2026-11-09: Interaktiver Hintergrund-Generator ("Generate Background"): Farbauswahl für Verläufe (Linear vertikal/horizontal), Radial (Spotlight/Vignette) und einfarbig (Solid), 8 1-Klick-Presets (Cinematic Dark, Deep Midnight, Action Crimson, etc.), Live-Vorschau und automatische Anpassung ans Cover-Layout. Verifiziert: vitest 13/13, tsc+vite build grün, tauri release executable gebaut & Desktop-Shortcut verifiziert.
- 2026-11-09: Express-Text-Styling als Default für "Add Text" (Titel-Übernahme, weiße Schrift, schwarze Kontur, zonengerechte Größe/Winkel), Schriftart-Auswahl (Font Family dropdown & Fett/Kursiv-Toggles in PropertiesPanel), Druck-Funktion ("Drucken" Button mit nativer Print-Vorschau) und Schneidelinien-Option für PNG/PDF-Export. Verifiziert: vitest 13/13, tsc+vite build grün, tauri release executable gebaut & Desktop-Shortcut verifiziert.
- 2026-11-09: Blu-ray Logos (Blau & Weiß) und Format-Switch hinzugefügt: BD Blau, BD Weiß oder DVD wählbar für alle Templates (auch Standard 14/15mm DVD), automatischer Default bei Blu-ray 11mm, Farbanpassung bestehender Badges in PropertiesPanel, manueller Button "Add Logo". Verifiziert: vitest 13/13, tsc+vite build grün, tauri release executable gebaut & Desktop-Shortcut verifiziert.
- 2026-11-09: Photoshop-inspiriertes Ebenen-Panel (LayersPanel): Sichtbarkeit (Eye-Toggle), Deckkraft (Opacity-Slider/Input 0-100%), Z-Index-Verschiebung (Bring Forward / Backward / Front / Back), Layer-Auswahl per Klick und Löschen. Verifiziert: vitest 13/13, tsc+vite build grün, tauri release executable gebaut & Desktop-Shortcut verifiziert.
- 2026-11-09: Clipboard-Paste (Ctrl+V) für Bilder, Tastatur-Delete (Del-Taste) für Cover-Elemente und text-only Express Generation (Cover-Generierung mit nur Titel). Verifiziert: `vitest` 10/10, `tsc`+`vite build` grün.
- 2026-10-28: Public-Release-Vorbereitung: eigenes DVD-Badge statt Original-Logo (Asset gelöscht), MIT-LICENSE, Cargo/package-Metadaten, `plugin-opener` entfernt, SYSTEM_STATE.txt untracked, englische README. Verifiziert: `vitest` 10/10, `tsc`+`vite build`, `cargo build` grün; Browser-Pane: beide Badges sichtbar, 3× Auto-Generate ohne Duplikate.
- 2026-10-28: Express Wizard (`wizardSlots`, `autoGenerate`, Sidebar-Abschnitt). Verifiziert: `vitest` 8/8, `tsc`+`vite build` grün; im Browser-Pane per Pixelprüfung: alle Wizard-Objekte inkl. beider Logos sichtbar, 3× Klick ohne Duplikate, Slim/Bleed korrekt verschoben, Canvas-Seitenverhältnisse stimmen.
- 2026-10-28: Plan dvd-cover-creator umgesetzt (Scaffold, Layout, Editor, Rust-Export). Verifiziert: `vitest` 5/5, `cargo test` 3/3, `npm run build` + `cargo build` grün; Canvas-Verhalten (Spine-Text 90°, Auto-Fill, Slim/Bleed-Verschiebung, PNG-Maße 3213×2161 / 3283×2231 / 3131×2161 / 3201×2231) im Browser-Pane geprüft.

## Dead Ends & Anti-Patterns
- Auto-Generate ohne Cover-Bilder: ✗ Bilder zwingend vorausgesetzt → ✓ Titel allein genügt, Express Wizard platziert zentrierten Front-Titel mit Dark-Gradient.
