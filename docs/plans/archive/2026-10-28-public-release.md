# Plan: Repo öffentlich machen (README + Aufräumen)

**Ziel:** Repo rechtlich sauber, ohne Generat-Dateien und mit echten Metadaten + englischer README veröffentlichen.

## Audit-Ergebnis (2026-10-28)
- ✅ Keine Secrets/.env/Keys/lokalen Pfade in getrackten Dateien. History: 1 Commit, Autor `islmal <malikislamov@outlook.com>` (E-Mail wird öffentlich sichtbar).
- ❌ `src/assets/dvd-video-logo.webp` = echtes, markengeschütztes DVD-Video-Logo, genutzt in `src/lib/editor.ts` (Import Zeile 2, `logo()` ~Zeile 325). STATUS.md behauptet fälschlich „eigene Pfad-SVG“.
- ❌ Keine `LICENSE`.
- ❌ `src-tauri/Cargo.toml`: `authors = ["you"]`, `description = "A Tauri App"`.
- ❌ npm-Dep `@tauri-apps/plugin-opener` ungenutzt (Rust nutzt nur `tauri-plugin-dialog`).
- ❌ `SYSTEM_STATE.txt` getrackt (Generat).
- ⚠️ STATUS.md Encoding kaputt (`Fl�chen`, `gr�n`).
- ⚠️ README deutsch/knapp.

## Entscheidungen (User)
MIT-Lizenz · Logo durch eigenes ersetzen (History NICHT umschreiben) · nur SYSTEM_STATE.txt untracken · README Englisch.

## Schritte (je Schritt kompilierbar → Micro-Commit)
1. **Logo ersetzen** (`src/lib/editor.ts`): `logo()` liefert synchron eine weiße `Group` aus abgerundetem `Rect` (Rahmen, stroke weiß, fill transparent) + fettem `FabricText("DVD")`. Import `dvdLogoUrl`, `filters.Invert`, `FabricImage.fromURL` dort entfernen (Imports nur löschen, wenn nirgends sonst genutzt). Skalierung via `.width` bleibt. `src/assets/dvd-video-logo.webp` löschen (`git rm`).
2. **Metadaten:** `src-tauri/Cargo.toml` → `authors = ["islmal"]`, echte `description`, `license = "MIT"`. `package.json` → `"license": "MIT"`; `npm uninstall @tauri-apps/plugin-opener`.
3. **`LICENSE`** neu: MIT, `Copyright (c) 2026 islmal`.
4. **SYSTEM_STATE.txt:** `git rm --cached SYSTEM_STATE.txt` + Eintrag in `.gitignore`.
5. **README.md** neu (Englisch): Beschreibung, Features (Standard/Slim-Templates, 3 mm Bleed, Express Wizard, PNG/PDF 300 DPI), Prerequisites (Node 24+, Rust MSVC-Toolchain, VS C++ Build Tools, WebView2), Build/Run/Test, Projektstruktur (≤5 Zeilen), manuelle Smoke-Checkliste (aus alter README übernehmen), Trademark-Hinweis („DVD“-Badge ist generischer Platzhalter, kein offizielles Logo), License.
6. **STATUS.md:** Encoding reparieren, Logo-Zeile korrigieren — im abschließenden `/status`.

## Verifizierung
- `npm test` (8/8), `npm run build`, `cd src-tauri && cargo build` grün.
- `git grep -n "dvd-video-logo\|plugin-opener"` → keine Treffer.
- `git ls-files | grep SYSTEM_STATE` → leer.
- Browser-Pane: Express Wizard → beide Logos sichtbar (weiß), 3× Klick ohne Duplikate.

## Manuell durch User (nicht Code)
Auf GitHub Repo-Description/Topics setzen und auf Public stellen.
