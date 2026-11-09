import { useReducer } from "react";
import { FabricImage, Group, IText, type FabricObject } from "fabric";
import type { Editor } from "../lib/editor";

const field = "mt-1 block w-full rounded bg-slate-700 border border-slate-600 p-1 text-xs text-white";

export default function PropertiesPanel({ editor, obj }: { editor: Editor | null; obj: FabricObject | null }) {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  if (!editor || !obj) {
    return (
      <div className="p-3 text-xs text-slate-400 bg-slate-800">
        Kein Element ausgewählt
      </div>
    );
  }
  const set = (props: Partial<IText>) => {
    obj.set(props);
    editor.canvas.requestRenderAll();
    refresh();
  };
  const t = obj instanceof IText ? obj : null;
  return (
    <div className="flex flex-col gap-2.5 bg-slate-800 p-3 text-xs text-slate-200">
      <div className="font-semibold text-slate-300 border-b border-slate-700 pb-1">
        Eigenschaften (Properties)
      </div>
      {t && (
        <>
          <label>
            Schriftgröße (Font size)
            <input
              className={field}
              type="number"
              min={1}
              value={t.fontSize}
              onChange={(e) => set({ fontSize: Math.max(1, +e.target.value) })}
            />
          </label>
          <label>
            Farbe (Color)
            <input className={field} type="color" value={String(t.fill)} onChange={(e) => set({ fill: e.target.value })} />
          </label>
          <label>
            Ausrichtung (Alignment)
            <select className={field} value={t.textAlign} onChange={(e) => set({ textAlign: e.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label>
            Konturfarbe (Outline color)
            <input className={field} type="color" value={String(t.stroke)} onChange={(e) => set({ stroke: e.target.value })} />
          </label>
          <label>
            Konturbreite (Outline width)
            <input
              className={field}
              type="number"
              min={0}
              value={t.strokeWidth}
              onChange={(e) => set({ strokeWidth: Math.max(0, +e.target.value) })}
            />
          </label>
        </>
      )}
      {obj instanceof FabricImage && (
        <button className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-500 font-medium cursor-pointer" onClick={() => editor.autoFill(obj)}>
          Auto-Fill zone
        </button>
      )}
      {obj instanceof Group && (
        <div className="flex flex-col gap-1.5">
          <label className="text-slate-300">Badge-Farbe (Logo Color)</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="rounded bg-cyan-600 px-2 py-1 text-white hover:bg-cyan-500 font-medium cursor-pointer text-xs"
              onClick={() => {
                obj.forEachObject((child) => {
                  if ("stroke" in child && child.stroke && child.stroke !== "transparent") {
                    child.set({ stroke: "#00a4e4" });
                  }
                  if ("fill" in child && child.fill && child.fill !== "transparent") {
                    child.set({ fill: "#00a4e4" });
                  }
                });
                editor.canvas.requestRenderAll();
                refresh();
              }}
            >
              BD Blau
            </button>
            <button
              type="button"
              className="rounded bg-slate-600 px-2 py-1 text-white hover:bg-slate-500 font-medium cursor-pointer text-xs border border-slate-500"
              onClick={() => {
                obj.forEachObject((child) => {
                  if ("stroke" in child && child.stroke && child.stroke !== "transparent") {
                    child.set({ stroke: "#ffffff" });
                  }
                  if ("fill" in child && child.fill && child.fill !== "transparent") {
                    child.set({ fill: "#ffffff" });
                  }
                });
                editor.canvas.requestRenderAll();
                refresh();
              }}
            >
              Weiß
            </button>
          </div>
        </div>
      )}
      <button
        className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-500 font-medium cursor-pointer"
        onClick={() => {
          editor.deleteSelected();
        }}
      >
        Löschen (Delete)
      </button>
    </div>
  );
}
