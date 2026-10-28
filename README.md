# DVD Cover Creator

Tauri v2 + React + Fabric.js. Gestaltet ein DVD-Cover (Back | Spine | Front) und exportiert PDF/PNG mit 300 DPI.

## Voraussetzungen
Node 24+, Rust (MSVC-Toolchain: `rustup override set stable-x86_64-pc-windows-msvc`), VS C++ Build Tools, WebView2.

## Run
```
npm install
npm run tauri dev      # App starten
npm test               # vitest (Layout)
cd src-tauri && cargo test
```

## Manuelle Smoke-Checkliste
- [ ] Text im Spine → 90° gedreht, zentriert; beim Verschieben im Spine rastet er mittig ein
- [ ] Auto-Fill füllt das Bild exakt in die Zone (kein Überstand)
- [ ] Wechsel auf Slim → Zonen/Guides/Objekte verschoben, Auto-Fill-Bilder neu eingepasst
- [ ] Bleed-Toggle → Canvas wächst, rote Trim-Linie sichtbar
- [ ] PNG-Export: 3213×2161 px (mit Bleed 3283×2231), 300 DPI in Dateieigenschaften
- [ ] PDF-Export: Seite 272×183 mm (mit Bleed 278×189 mm)
