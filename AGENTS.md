# Agent Instructions - DVD Cover Creator

## Build & Release Requirements
Whenever code changes, bugfixes, or feature implementations are completed in this repository:
1. **Always build the release executable** using `npm run build:exe` (`npx tauri build --no-bundle`).
2. **Verify the Desktop shortcut**: Ensure the shortcut on `C:\Users\malik\Desktop` (e.g. `DVD Cover Creator.lnk` / `dvd-cover-creator.exe - Verknüpfung.lnk`) points to `C:\dvdcovercreator\src-tauri\target\release\dvd-cover-creator.exe` with working directory `C:\dvdcovercreator\src-tauri\target\release`.
