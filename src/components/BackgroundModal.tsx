import { useState } from "react";
import type { BackgroundOptions, BackgroundStyle } from "../lib/editor";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: (options: BackgroundOptions) => void;
}

interface Preset {
  name: string;
  options: BackgroundOptions;
  previewCss: string;
}

const PRESETS: Preset[] = [
  {
    name: "Cinematic Dark",
    options: { style: "gradient", color1: "#2b313b", color2: "#111317", direction: "vertical" },
    previewCss: "linear-gradient(to bottom, #2b313b, #111317)",
  },
  {
    name: "Deep Midnight",
    options: { style: "gradient", color1: "#172554", color2: "#020617", direction: "vertical" },
    previewCss: "linear-gradient(to bottom, #172554, #020617)",
  },
  {
    name: "Action Crimson",
    options: { style: "gradient", color1: "#7f1d1d", color2: "#0a0a0a", direction: "vertical" },
    previewCss: "linear-gradient(to bottom, #7f1d1d, #0a0a0a)",
  },
  {
    name: "Cyber Violet",
    options: { style: "gradient", color1: "#4c1d95", color2: "#09090b", direction: "vertical" },
    previewCss: "linear-gradient(to bottom, #4c1d95, #09090b)",
  },
  {
    name: "Dark Emerald",
    options: { style: "gradient", color1: "#064e3b", color2: "#022c22", direction: "vertical" },
    previewCss: "linear-gradient(to bottom, #064e3b, #022c22)",
  },
  {
    name: "Radial Spotlight",
    options: { style: "radial", color1: "#334155", color2: "#020617" },
    previewCss: "radial-gradient(circle, #334155 10%, #020617 80%)",
  },
  {
    name: "Obsidian Black",
    options: { style: "solid", color1: "#0a0a0a" },
    previewCss: "#0a0a0a",
  },
  {
    name: "Clean White",
    options: { style: "solid", color1: "#ffffff" },
    previewCss: "#ffffff",
  },
];

export default function BackgroundModal({ isOpen, onClose, onApply }: Props) {
  const [style, setStyle] = useState<BackgroundStyle>("gradient");
  const [color1, setColor1] = useState("#2b313b");
  const [color2, setColor2] = useState("#111317");
  const [direction, setDirection] = useState<"vertical" | "horizontal">("vertical");

  if (!isOpen) return null;

  const handlePresetSelect = (p: Preset) => {
    setStyle(p.options.style);
    setColor1(p.options.color1);
    setColor2(p.options.color2 || "#000000");
    if (p.options.direction) setDirection(p.options.direction);
  };

  const getPreviewStyle = () => {
    if (style === "solid") return { backgroundColor: color1 };
    if (style === "radial") {
      return { background: `radial-gradient(circle, ${color1} 15%, ${color2} 85%)` };
    }
    const dir = direction === "horizontal" ? "to right" : "to bottom";
    return { background: `linear-gradient(${dir}, ${color1}, ${color2})` };
  };

  const handleApply = () => {
    onApply({
      style,
      color1,
      color2: style !== "solid" ? color2 : undefined,
      direction: style === "gradient" ? direction : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="flex w-full max-w-lg flex-col rounded-lg bg-slate-850 border border-slate-700 shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3 bg-slate-900">
          <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
            <span>🎨</span>
            <span>Hintergrund generieren (Generate Background)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-base leading-none p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Presets */}
          <div>
            <div className="text-slate-300 font-medium mb-2">Vorlagen (Presets)</div>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handlePresetSelect(p)}
                  className="group flex flex-col items-center gap-1.5 p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer text-left"
                >
                  <div
                    className="w-full h-8 rounded border border-slate-600 shadow-xs"
                    style={{ background: p.previewCss }}
                  />
                  <span className="text-[10px] text-slate-300 group-hover:text-white truncate w-full text-center">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Settings */}
          <div className="border-t border-slate-700/80 pt-3 flex flex-col gap-3">
            <div className="text-slate-300 font-medium">Benutzerdefiniert (Custom)</div>

            {/* Style Selector */}
            <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded border border-slate-700">
              <button
                type="button"
                className={`py-1 rounded text-center cursor-pointer transition-colors ${
                  style === "gradient" ? "bg-blue-600 font-semibold text-white" : "text-slate-300 hover:text-white"
                }`}
                onClick={() => setStyle("gradient")}
              >
                Verlauf (Gradient)
              </button>
              <button
                type="button"
                className={`py-1 rounded text-center cursor-pointer transition-colors ${
                  style === "radial" ? "bg-blue-600 font-semibold text-white" : "text-slate-300 hover:text-white"
                }`}
                onClick={() => setStyle("radial")}
              >
                Spotlight (Radial)
              </button>
              <button
                type="button"
                className={`py-1 rounded text-center cursor-pointer transition-colors ${
                  style === "solid" ? "bg-blue-600 font-semibold text-white" : "text-slate-300 hover:text-white"
                }`}
                onClick={() => setStyle("solid")}
              >
                Einfarbig (Solid)
              </button>
            </div>

            {/* Color Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-slate-400">{style === "solid" ? "Farbe" : "Farbe 1 (Start/Mitte)"}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color1}
                    onChange={(e) => setColor1(e.target.value)}
                    className="w-8 h-8 rounded bg-transparent border border-slate-600 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={color1}
                    onChange={(e) => setColor1(e.target.value)}
                    className="w-20 rounded bg-slate-800 border border-slate-600 px-2 py-1 text-slate-200 uppercase font-mono text-xs"
                  />
                </div>
              </label>

              {style !== "solid" && (
                <label className="flex flex-col gap-1">
                  <span className="text-slate-400">Farbe 2 (Ende/Rand)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color2}
                      onChange={(e) => setColor2(e.target.value)}
                      className="w-8 h-8 rounded bg-transparent border border-slate-600 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={color2}
                      onChange={(e) => setColor2(e.target.value)}
                      className="w-20 rounded bg-slate-800 border border-slate-600 px-2 py-1 text-slate-200 uppercase font-mono text-xs"
                    />
                  </div>
                </label>
              )}
            </div>

            {/* Direction (for gradient) */}
            {style === "gradient" && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Verlaufsrichtung</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setDirection("vertical")}
                    className={`px-3 py-1 rounded cursor-pointer border ${
                      direction === "vertical"
                        ? "bg-blue-600 border-blue-500 text-white font-medium"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Vertikal ↕
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection("horizontal")}
                    className={`px-3 py-1 rounded cursor-pointer border ${
                      direction === "horizontal"
                        ? "bg-blue-600 border-blue-500 text-white font-medium"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Horizontal ↔
                  </button>
                </div>
              </div>
            )}

            {/* Live Preview Box */}
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-slate-400">Vorschau (Preview)</span>
              <div
                className="w-full h-24 rounded border border-slate-600 shadow-inner flex items-center justify-center transition-all"
                style={getPreviewStyle()}
              >
                <div className="px-2 py-1 bg-black/40 backdrop-blur-xs rounded text-[10px] text-white/90 font-mono">
                  Cover Background
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-700 px-4 py-3 bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-xs"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-white font-medium shadow-xs transition-colors cursor-pointer text-xs"
          >
            Hintergrund anwenden
          </button>
        </div>
      </div>
    </div>
  );
}
