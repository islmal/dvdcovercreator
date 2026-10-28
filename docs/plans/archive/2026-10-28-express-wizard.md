# Plan: One-Click Express Wizard (2026-10-28)

## Ziel & Ansatz
Ein Klick erzeugt ein komplettes Cover: Front-Bild (Auto-Fill), dunkle Back/Spine-Flächen, Titel ×3, Synopsis, DVD-Logo ×2.
- Positionen als reine Funktion `wizardSlots(layout)` in `layout.ts` (Fabric-frei, per Vitest testbar).
- Alle Canvas-Operationen ausschließlich in `editor.ts` (`autoGenerate`), Wiederverwendung von `loadImage`, `fill`, `setLayout`-Verschiebung.
- `computeLayout`, `mmToPx` und die 300-DPI-Rechnung bleiben UNVERÄNDERT.

## Dateien
- `src/lib/layout.ts` – nur neue Funktion `wizardSlots`
- `src/lib/layout.test.ts` – neue Tests
- `src/lib/editor.ts` – Flag, `DVD_LOGO_SVG`, `autoGenerate`
- `src/components/Sidebar.tsx` – Abschnitt „Express Wizard“
- `src/App.tsx` – Prop verdrahten

## Schritte

### 1. `layout.ts` & `layout.test.ts`
- `wizardSlots(layout: Layout)` liefert Koordinaten für `frontTitle`, `spineCenter` (exakte Mitte: `x = spine.x + spine.w/2`, `y = trim.y + trim.h/2`), `backTitle`, `synopsis` (inkl. berechneter `width`), `spineLogo`, `frontLogo`.
- 6 % Rand innerhalb der jeweiligen Trim-Fläche. Trim-Flächen: Back = `trim.x … spine.x`, Front = `front.x … trim.x + trim.w`, vertikal `trim.y … trim.y + trim.h` (Zonen selbst enthalten Bleed → nicht verwenden).
- Tests für Standard, Slim, Bleed:
  - `spineCenter` exakt Mitte Spine × Trim
  - `frontTitle.x` = Mitte Front-Trim, `y` im oberen Fünftel des Trims
  - `backTitle`/`synopsis` innerhalb Back-Trim mit 6 % Rand; `synopsis.x + synopsis.width <= spine.x`
  - `spineLogo.x` = Spine-Mitte, unten innerhalb Trim
  - `frontLogo` unten rechts innerhalb Front-Trim

### 2. `editor.ts`
- `EditorObject` erhält `wizard?: true`.
- `DVD_LOGO_SVG`: selbst gezeichnetes „DVD / VIDEO“-Abzeichen, NUR `<path>`-Elemente (kein `<text>`). Kein 1:1-Nachbau des geschützten Original-Logos (Marke der DVD FLLC).
- `autoGenerate(title: string, frontFile: File): Promise<void>` im Interface + Implementierung, Reihenfolge:
  a) Alle Objekte mit `wizard === true` entfernen (manuelle Objekte bleiben).
  b) `Rect` `#1A1A1A` für Back und Spine, eingepasst via bestehendem `fill(rect, zone)` (setzt `autofillZone` → `setLayout` passt sie automatisch an). `selectable:false, evented:false, wizard:true`. Mit **`canvas.sendObjectToBack`** (KORREKTUR: `sendToBack` existiert in Fabric v6 nicht) nach hinten; danach ein evtl. vorhandenes `isBackground`-Bild erneut `sendObjectToBack` (KORREKTUR: sonst verdeckt es die Flächen). Stapel: Hintergrund → dunkle Flächen → Rest.
  c) `frontFile` via `loadImage` laden, `fill(img, 'front')`, `wizard:true`.
  d) 3 weiße `IText`-Titel (`wizard:true`):
     - Front: zentriert bei `frontTitle`, schwarze Kontur (`stroke:"#000000"`, `strokeWidth` > 0, `paintFirst:"stroke"`).
     - Spine: `angle:90`, `originX/originY:"center"` exakt auf `spineCenter`, `fontSize = Math.min(90, spine.w * 0.6)`. Danach: wenn Textbreite > 85 % von **`trim.h`** (KORREKTUR: nicht Zonenhöhe, die Bleed enthält), `fontSize` proportional reduzieren.
     - Back: `originX:"left"`, `originY:"top"` bei `backTitle`.
  e) `Textbox` mit Lorem-ipsum-Synopsis bei `synopsis`, `width = synopsis.width`, kleinere Schrift (z. B. 40), weiß, `wizard:true`. (`Textbox` ist IText-Unterklasse → Snap/PropertiesPanel funktionieren.)
  f) `DVD_LOGO_SVG` zweimal via `loadSVGFromString` + `util.groupSVGElements`:
     - Spine: Breite ≈ 80 % `spine.w`, unten mittig bei `spineLogo`.
     - Front: unten rechts bei `frontLogo` (originX right, originY bottom).
     Beide `wizard:true`.
  g) `canvas.requestRenderAll()`.

### 3. `Sidebar.tsx` & `App.tsx`
- Sidebar-Abschnitt „Express Wizard“: Text-Input „Project Title“, bestehender `FileButton` für das Cover-Bild (zeigt Dateinamen als Label), Button „Auto-Generate“; disabled, wenn Titel (getrimmt) oder Bild fehlt. Lokaler State via `useState` in der Sidebar.
- Neue Prop `onAutoGenerate(title: string, file: File)`; App: `onAutoGenerate={(t, f) => editor && run(editor.autoGenerate(t, f))}`.

## Verifizierung (Pflicht)
1. `npm test`: bestehende 5 Tests grün (keine Layout-/DPI-Regression) + neue `wizardSlots`-Tests grün.
2. `npm run build` (tsc + vite) grün.
3. Browser-Pane (`npm run dev`): Testbild per `DataTransfer` ins File-Input setzen, Titel tippen, Auto-Generate klicken. Screenshot prüfen:
   - alle 8 Wizard-Objekte sichtbar, Logo-Pfade korrekt gerendert
   - zweiter Klick → keine Duplikate
   - Template Slim / Bleed an → Objekte verschoben bzw. neu eingepasst
   - PNG-Export-Maße weiterhin 3213×2161 / 3283×2231

## Bekannte Grenzen
- Nach Template-Wechsel werden Spine-Titel und -Logo nur verschoben, nicht neu skaliert → Wizard erneut ausführen.
- Tauri-Fenster nicht getestet (nur Browser-Pane).
