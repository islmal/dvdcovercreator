import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FabricObject } from "fabric";
import Sidebar from "./components/Sidebar";
import PropertiesPanel from "./components/PropertiesPanel";
import { createEditor, type Editor } from "./lib/editor";
import { computeLayout, type ZoneName } from "./lib/layout";
import { templates } from "./templates";

export default function App() {
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [bleed, setBleed] = useState(false);
  const [zone, setZone] = useState<ZoneName>("front");
  const [selected, setSelected] = useState<FabricObject | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

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
    <div className="flex h-screen">
      <Sidebar
        templateId={templateId}
        onTemplate={setTemplateId}
        zone={zone}
        onZone={setZone}
        bleed={bleed}
        onBleed={setBleed}
        onAddText={() => editor?.addText(zone)}
        onAddImage={(f) => editor && run(editor.addImage(f, zone))}
        onBackground={(f) => editor && run(editor.setBackground(f))}
        onAutoGenerate={(t, f) => editor && run(editor.autoGenerate(t, f))}
        onExport={exportCover}
      />
      <div ref={hostRef} className="flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-slate-300">
        <canvas ref={canvasRef} />
      </div>
      <PropertiesPanel editor={editor} obj={selected} />
    </div>
  );
}
