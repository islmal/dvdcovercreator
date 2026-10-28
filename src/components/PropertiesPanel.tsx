import { useReducer } from "react";
import { FabricImage, IText, type FabricObject } from "fabric";
import type { Editor } from "../lib/editor";

const field = "mt-1 block w-full rounded border border-slate-300 p-1 text-sm";

export default function PropertiesPanel({ editor, obj }: { editor: Editor | null; obj: FabricObject | null }) {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  if (!editor || !obj) {
    return <aside className="w-60 shrink-0 bg-slate-100 p-3 text-sm text-slate-500">Nothing selected</aside>;
  }
  const set = (props: Partial<IText>) => {
    obj.set(props);
    editor.canvas.requestRenderAll();
    refresh();
  };
  const t = obj instanceof IText ? obj : null;
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-3 bg-slate-100 p-3 text-sm">
      {t && (
        <>
          <label>
            Font size
            <input
              className={field}
              type="number"
              min={1}
              value={t.fontSize}
              onChange={(e) => set({ fontSize: Math.max(1, +e.target.value) })}
            />
          </label>
          <label>
            Color
            <input className={field} type="color" value={String(t.fill)} onChange={(e) => set({ fill: e.target.value })} />
          </label>
          <label>
            Alignment
            <select className={field} value={t.textAlign} onChange={(e) => set({ textAlign: e.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label>
            Outline color
            <input className={field} type="color" value={String(t.stroke)} onChange={(e) => set({ stroke: e.target.value })} />
          </label>
          <label>
            Outline width
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
        <button className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-500" onClick={() => editor.autoFill(obj)}>
          Auto-Fill zone
        </button>
      )}
      <button
        className="rounded bg-red-600 px-3 py-2 text-white hover:bg-red-500"
        onClick={() => {
          editor.canvas.remove(obj);
          editor.canvas.discardActiveObject();
          editor.canvas.requestRenderAll();
        }}
      >
        Delete
      </button>
    </aside>
  );
}
