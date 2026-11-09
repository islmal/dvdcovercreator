import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FabricObject } from "fabric";
import Sidebar from "./components/Sidebar";
import PropertiesPanel from "./components/PropertiesPanel";
import LayersPanel from "./components/LayersPanel";
import { createEditor, type BadgeType, type Editor } from "./lib/editor";
import { computeLayout, type ZoneName } from "./lib/layout";
import { templates } from "./templates";

export default function App() {
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [badgeType, setBadgeType] = useState<BadgeType>(() =>
    templates[0].id.includes("bluray") ? "bluray-blue" : "dvd",
  );
  const [bleed, setBleed] = useState(false);
  const [zone, setZone] = useState<ZoneName>("front");
  const [selected, setSelected] = useState<FabricObject | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    if (id.includes("bluray")) {
      setBadgeType("bluray-blue");
    } else {
      setBadgeType("dvd");
    }
  };

  const template = templates.find((t) => t.id === templateId)!;
  const layout = useMemo(() => computeLayout(template, bleed), [template, bleed]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    const ed = createEditor(canvasRef.current!, hostRef.current!, layoutRef.current, setSelected);
    setEditor(ed);
    return () => ed.dispose();
  }, []);

  useEffect(() => editor?.setLayout(layout), [editor, layout]);
  useEffect(() => editor?.setTargetZone(zone), [editor, zone]);

  const run = (p: Promise<unknown>) => p.catch((e) => alert(String(e)));

  const exportCover = (kind: "pdf" | "png") => {
    if (!editor) return;
    const extra = bleed ? 2 * template.bleedMm : 0;
    run(
      invoke("export_cover", {
        dataB64: editor.exportPng().split(",")[1],
        kind,
        widthMm: template.backMm + template.spineMm + template.frontMm + extra,
        heightMm: template.heightMm + extra,
      }),
    );
  };

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar
        templateId={templateId}
        onTemplate={handleTemplateChange}
        badgeType={badgeType}
        onBadgeType={setBadgeType}
        zone={zone}
        onZone={setZone}
        bleed={bleed}
        onBleed={setBleed}
        onAddText={() => editor?.addText(zone)}
        onAddBadge={(b) => editor?.addBadge(zone, b)}
        onAddImage={(f) => editor && run(editor.addImage(f, zone))}
        onBackground={(f) => editor && run(editor.setBackground(f))}
        onAutoGenerate={(t, f, b) => editor && run(editor.autoGenerate(t, f, b))}
        onExport={exportCover}
      />
      <div ref={hostRef} className="flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-slate-300">
        <canvas ref={canvasRef} />
      </div>
      <aside className="flex w-64 shrink-0 flex-col bg-slate-800 border-l border-slate-700">
        <PropertiesPanel editor={editor} obj={selected} />
        <LayersPanel
          editor={editor}
          selected={selected}
          onSelect={setSelected}
          onAddText={() => editor?.addText(zone)}
        />
      </aside>
    </div>
  );
}
