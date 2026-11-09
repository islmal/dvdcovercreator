import { useEffect, useReducer } from "react";
import { FabricImage, FabricObject, Group, IText, Rect, Textbox } from "fabric";
import type { Editor, EditorObject } from "../lib/editor";

interface Props {
  editor: Editor | null;
  selected: FabricObject | null;
  onSelect: (obj: FabricObject | null) => void;
  onAddText?: () => void;
}

function getLayerInfo(obj: FabricObject): { title: string; typeIcon: string; badgeColor: string } {
  const o = obj as EditorObject;
  if (o.isBackground) {
    return { title: "Hintergrund (Background)", typeIcon: "🖼", badgeColor: "bg-emerald-600" };
  }
  if (obj instanceof IText || obj instanceof Textbox) {
    const raw = obj.text?.trim() || "Text";
    const snippet = raw.length > 22 ? raw.slice(0, 22) + "…" : raw;
    return { title: `T: ${snippet}`, typeIcon: "T", badgeColor: "bg-blue-600" };
  }
  if (obj instanceof FabricImage) {
    const zone = o.autofillZone ? ` (${o.autofillZone})` : "";
    return { title: `Bild${zone}`, typeIcon: "🖼", badgeColor: "bg-amber-600" };
  }
  if (obj instanceof Group) {
    return { title: "DVD Logo Badge", typeIcon: "❖", badgeColor: "bg-purple-600" };
  }
  if (obj instanceof Rect) {
    return { title: "Backdrop Gradient", typeIcon: "▭", badgeColor: "bg-slate-600" };
  }
  return { title: (obj.type || "Ebene"), typeIcon: "▪", badgeColor: "bg-slate-600" };
}

export default function LayersPanel({ editor, selected, onSelect, onAddText }: Props) {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    if (!editor) return;
    const unsub = editor.onLayersChange(() => forceUpdate());
    return unsub;
  }, [editor]);

  if (!editor) return null;

  const rawLayers = editor.getLayers();
  // Reverse so visual top layer is on top of the list, just like Photoshop
  const layers = [...rawLayers].reverse();
  const selectedOpacity = selected ? Math.round((selected.opacity ?? 1) * 100) : 100;

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-slate-800 text-white text-xs border-t border-slate-700">
      {/* Photoshop Header */}
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2 bg-slate-850">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <span>Ebenen</span>
          <span className="rounded-full bg-slate-700 px-1.5 py-0.2 text-[10px] text-slate-300">
            {layers.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">Deckkraft:</span>
          <input
            type="number"
            min={0}
            max={100}
            disabled={!selected}
            value={selected ? selectedOpacity : 100}
            onChange={(e) => {
              if (selected) {
                const val = Math.max(0, Math.min(100, Number(e.target.value)));
                editor.setOpacity(selected, val / 100);
              }
            }}
            className="w-12 rounded bg-slate-700 px-1 py-0.5 text-right text-[11px] text-white disabled:opacity-40"
          />
          <span className="text-[11px] text-slate-400">%</span>
        </div>
      </div>

      {/* Opacity Slider for fine control */}
      {selected && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-750 border-b border-slate-700/60">
          <input
            type="range"
            min={0}
            max={100}
            value={selectedOpacity}
            onChange={(e) => {
              const val = Number(e.target.value);
              editor.setOpacity(selected, val / 100);
            }}
            className="w-full accent-blue-500 h-1 cursor-pointer"
          />
        </div>
      )}

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-700/50">
        {layers.length === 0 ? (
          <div className="p-4 text-center text-slate-400 italic">Keine Ebenen vorhanden</div>
        ) : (
          layers.map((layer, index) => {
            const isSelected = selected === layer;
            const isVisible = layer.visible !== false;
            const info = getLayerInfo(layer);
            const isTop = index === 0;
            const isBottom = index === layers.length - 1;

            return (
              <div
                key={(layer as EditorObject & { id?: string }).id || `${layer.type}-${index}`}
                onClick={() => {
                  editor.selectObject(layer);
                  onSelect(layer);
                }}
                className={`group flex items-center gap-2 px-2.5 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-600 text-white font-medium"
                    : isVisible
                    ? "hover:bg-slate-700/70 text-slate-200"
                    : "bg-slate-800/40 text-slate-500 hover:bg-slate-700/40 opacity-60"
                }`}
              >
                {/* Visibility Toggle Eye (Photoshop 👁️) */}
                <button
                  type="button"
                  title={isVisible ? "Ebene ausblenden" : "Ebene einblenden"}
                  onClick={(e) => {
                    e.stopPropagation();
                    editor.toggleVisibility(layer);
                  }}
                  className={`w-5 h-5 flex items-center justify-center rounded transition-opacity ${
                    isVisible
                      ? "text-slate-300 hover:text-white"
                      : "text-slate-500 hover:text-slate-300 opacity-40 hover:opacity-100"
                  }`}
                >
                  {isVisible ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                      <path
                        fillRule="evenodd"
                        d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.375l1.091 1.092a4 4 0 00-5.557-5.56z"
                        clipRule="evenodd"
                      />
                      <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 014.168 5.7L6.4 7.933a4 4 0 004.348 5.996z" />
                    </svg>
                  )}
                </button>

                {/* Layer Type Badge (T / Image / Icon) */}
                <div
                  className={`w-5 h-5 flex shrink-0 items-center justify-center rounded text-[10px] font-bold text-white shadow-xs ${info.badgeColor}`}
                >
                  {info.typeIcon}
                </div>

                {/* Layer Title */}
                <span className="flex-1 truncate select-none" title={info.title}>
                  {info.title}
                </span>

                {/* Per-row reorder & delete buttons */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    disabled={isTop}
                    title="Nach oben (Vordergrund)"
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.bringForward(layer);
                    }}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={isBottom}
                    title="Nach unten (Hintergrund)"
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.sendBackward(layer);
                    }}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    title="Ebene löschen"
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.removeObject(layer);
                    }}
                    className="p-1 text-red-400 hover:text-red-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Photoshop Bottom Toolbar */}
      <div className="flex items-center justify-between border-t border-slate-700 bg-slate-850 px-2 py-1.5 text-slate-300">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!selected}
            title="Ganz nach vorne bringen (Top)"
            onClick={() => selected && editor.bringToFront(selected)}
            className="rounded p-1 hover:bg-slate-700 hover:text-white disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            type="button"
            disabled={!selected}
            title="Eine Ebene nach oben"
            onClick={() => selected && editor.bringForward(selected)}
            className="rounded p-1 hover:bg-slate-700 hover:text-white disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={!selected}
            title="Eine Ebene nach unten"
            onClick={() => selected && editor.sendBackward(selected)}
            className="rounded p-1 hover:bg-slate-700 hover:text-white disabled:opacity-30"
          >
            ▼
          </button>
          <button
            type="button"
            disabled={!selected}
            title="Ganz nach hinten senden (Bottom)"
            onClick={() => selected && editor.sendToBack(selected)}
            className="rounded p-1 hover:bg-slate-700 hover:text-white disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {onAddText && (
            <button
              type="button"
              title="Neue Textebene hinzufügen"
              onClick={onAddText}
              className="rounded p-1 hover:bg-slate-700 hover:text-white font-bold"
            >
              ＋
            </button>
          )}
          <button
            type="button"
            disabled={!selected}
            title="Ausgewählte Ebene löschen"
            onClick={() => editor.deleteSelected()}
            className="rounded p-1 text-red-400 hover:bg-slate-700 hover:text-red-200 disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
