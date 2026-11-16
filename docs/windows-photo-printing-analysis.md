# Reverse Engineering Analyse: Windows 11 „Drucken“-Pipeline (`photowiz.dll`)

Diese Dokumentation hält die durch **REA (Reverse Engineering Anything / Ghidra)** gewonnenen Erkenntnisse fest, wie Windows 11 die Shell-Aktion **Rechtsklick → „Drucken“** auf Bilddateien (wie `.png`) ausführt und wie diese in **DVD Cover Creator** implementiert wurde.

---

## 1. Shell-Verknüpfung & Routing

Wenn im Windows Explorer mit der rechten Maustaste auf eine `.png`-Datei geklickt und der Menüpunkt **„Drucken“** gewählt wird, wird kein eigenständiges Programm aufgerufen, sondern ein COM-`DropTarget`:

* **Registry-Schlüssel:**
  `HKLM\SOFTWARE\Classes\SystemFileAssociations\image\shell\print\DropTarget`
* **CLSID:** `{60fd46de-f830-4894-a628-6fa81bc0190d}`  
  *Name:* `DropTarget Object for Photo Printing Wizard`
* **InProcServer32:** `C:\Windows\System32\photowiz.dll`
* **Export-Funktion:** `UsePPWForPrintTo` (Photo Printing Wizard for PrintTo)

Der Explorer instanziiert das COM-Objekt und übergibt die selektierte Datei über die Schnittstelle `IDataObject` an `IDropTarget::Drop()`.

---

## 2. Layouts & Templates (`TMPLDATA.XML`)

`photowiz.dll` liest seine Layout-Definitionen aus einer eingebetteten XML-Ressource (`TMPLDATA.XML` in `photowiz.dll.mui`):

* **Maßeinheiten:**  
  Alle Koordinaten (`x`, `y`, `w`, `h`) in `TMPLDATA.XML` sind in **1/10.000 Zoll (0,1 mil)** definiert (z. B. $40.000 \times 60.000$ für $4 \times 6$ Zoll).
* **Standard-Vorlage (Ganzseitiges Foto):**
  ```xml
  <template-def guid="{742276BF-20D0-4648-8813-A1E0C57247A9}" 
                group="Foto" 
                title="Ganzseitiges Foto" 
                description="Zugeschnitten und gedreht" 
                repeat-photos="no" 
                use-thumbnails-for-printing="no" 
                print-filename="no" 
                can-crop="yes" 
                can-rotate="yes">
     <layout>
        <imageable-area x="-1" y="-1" w="-1" h="-1"/>
        <image-def x="-1" y="-1" w="-1" h="-1"/>
     </layout>
  </template-def>
  ```
* **Dynamische Ränder `(-1, -1, -1, -1)`:**  
  Bedeutet, dass der Assistent die tatsächlich bedruckbare Fläche (`imageable area`) der gewählten Papiergröße abzüglich der gerätespezifischen Hardwareränder des Druckers ermittelt.

---

## 3. Skalierungs- & Zuschnitt-Algorithmus

Der Foto-Druckassistent steuert die Darstellung über zwei Attribute:

### A. Automatische Drehung (`can-rotate="yes"`)
* Vergleicht das Seitenverhältnis des Bildes ($W_{img} / H_{img}$) mit der Ausrichtung des Papiers ($W_{page} / H_{page}$).
* Liegt ein Querformat-Bild (wie ein DVD-Cover mit ca. $273 \times 183\text{ mm}$, Aspekt $\approx 1,49$) vor und ist das Druckerpapier im Hochformat (z. B. DIN A4), dreht Windows das Bild automatisch um **90°**, damit die längste Bildkante auf die längste Papierkante fällt.

### B. Zuschnitt über „Bild an Rahmen anpassen“ (`can-crop="yes"`)
1. **Aktiviert (Default):**
   * Verhält sich wie `object-fit: cover` bzw. `UniformToFill`.
   * Das Bild wird proportional so weit skaliert, bis der gesamte bedruckbare Seitenbereich bedeckt ist.
   * Überstehende Ränder, die nicht zum Seitenverhältnis des Papiers passen, werden **mittig beschnitten (gecroppt)**.
2. **Deaktiviert:**
   * Verhält sich wie `object-fit: contain` bzw. `Uniform`.
   * Das Bild wird vollständig dargestellt, es entstehen jedoch sichtbare weiße Seitenränder (Letterboxing/Pillarboxing).

### C. DPI-Ignoranz
* Der Windows-Fotoassistent skaliert Pixelgrafiken immer auf das gewählte Layout/Papierformat hoch und ignoriert physische DPI-Metadaten (z. B. 300 DPI) für die Zentimetermaße. Für randlose, passgenaue Cover sorgt die manuelle oder native Einpassung.

---

## 4. Druckausgabe (XPS Print Pipeline)

Unter der Haube nutzt `photowiz.dll` moderne XPS-Markup-Strukturen:
* **WIC-Integration:** Decodiert und streamt das Bild via `CLSID_WICImagingFactory` (`{317d06e8-5f24-433d-bdf7-79ce68d8abc2}`).
* **XPS-Elemente:**
  * `<Canvas RenderOptions.EdgeMode="Aliased">`
  * `<Path.Fill>` mit `<ImageBrush>`
  * `Viewport`: Platzierung und Größe auf der gedruckten Seite.
  * `Viewbox`: Berechneter Pixel-Ausschnitt für Zuschnitt und Skalierung.

---

## 5. Implementierung in DVD Cover Creator

Um exakt dieses native Betriebssystem-Verhalten aus der App heraus auszulösen:

1. **Rust Backend (`src-tauri/src/lib.rs`):**
   * Befehl `print_cover`:
     1. Base64-PNG decodieren.
     2. 300-DPI-Chunk einbetten (`export::png_with_dpi`).
     3. Im temporären Verzeichnis als `%TEMP%\dvd-cover-print.png` ablegen.
     4. Über `ShellExecuteW(NULL, L"print", path, NULL, NULL, SW_SHOWNORMAL)` das registrierte Windows-Verb `print` aufrufen.
2. **Frontend (`src/App.tsx`):**
   * Beim Klick auf **„Drucken (Print)“** wird `invoke("print_cover", ...)` ausgeführt.
   * Für Ausführungen außerhalb von Windows/Tauri (z. B. lokaler Web-Browser) existiert ein robuster `window.print()`-Iframe-Fallback.
