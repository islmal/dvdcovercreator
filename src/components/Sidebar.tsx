import { useState, type ReactNode } from "react";
import type { ZoneName } from "../lib/layout";
import type { BadgeType } from "../lib/editor";
import { templates } from "../templates";

interface Props {
  templateId: string;
  onTemplate: (id: string) => void;
  badgeType: BadgeType;
  onBadgeType: (b: BadgeType) => void;
  zone: ZoneName;
  onZone: (z: ZoneName) => void;
  bleed: boolean;
  onBleed: (b: boolean) => void;
  onAddText: () => void;
  onAddBadge: (b: BadgeType) => void;
  onAddImage: (f: File) => void;
  onBackground: (f: File) => void;
  onAutoGenerate: (title: string, files: File[], badgeType: BadgeType) => void;
  onExport: (kind: "pdf" | "png") => void;
}

const btn = "block w-full cursor-pointer rounded bg-slate-700 px-3 py-2 text-center text-sm hover:bg-slate-600";

function FileButton({ children, onFile }: { children: ReactNode; onFile: (f: File) => void }) {
  return (
    <label className={btn}>
      {children}
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

export default function Sidebar(p: Props) {
  const [title, setTitle] = useState("");
  const [covers, setCovers] = useState<File[]>([]);
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-3 bg-slate-800 p-3 text-white">
      <div className="flex flex-col gap-2 border-b border-slate-600 pb-3">
        <div className="text-xs text-slate-300">Express Wizard</div>
        <input
          className="rounded bg-slate-700 p-1 text-sm"
          placeholder="Project Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) {
              p.onAutoGenerate(title.trim(), covers, p.badgeType);
            }
          }}
        />
        <label className={btn} title="All images are arranged on the front and the back">
          {covers.length ? covers.map((f) => f.name).join(", ") : "Cover Images (optional, up to 6)"}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              setCovers(Array.from(e.target.files ?? []).slice(0, 6));
              e.target.value = "";
            }}
          />
        </label>
        {covers.length > 0 && (
          <button className="text-xs text-slate-300 underline" onClick={() => setCovers([])}>
            Clear images
          </button>
        )}
        <button
          className={btn + " disabled:cursor-not-allowed disabled:opacity-50"}
          disabled={!title.trim()}
          onClick={() => p.onAutoGenerate(title.trim(), covers, p.badgeType)}
        >
          Auto-Generate
        </button>
      </div>
      <label className="text-xs text-slate-300">
        Template
        <select
          className="mt-1 block w-full rounded bg-slate-700 p-1 text-sm"
          value={p.templateId}
          onChange={(e) => p.onTemplate(e.target.value)}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-1.5 border-b border-slate-700 pb-3">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>Logo / Badge</span>
          <span className="text-[10px] text-slate-400 font-medium">
            {p.badgeType === "dvd" ? "DVD" : "Blu-ray"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            className={`rounded px-1 py-1.5 text-center text-xs transition-colors cursor-pointer ${
              p.badgeType === "dvd"
                ? "bg-blue-600 font-semibold text-white shadow-xs"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
            onClick={() => p.onBadgeType("dvd")}
            title="DVD-Logo verwenden"
          >
            DVD
          </button>
          <button
            type="button"
            className={`rounded px-1 py-1.5 text-center text-xs transition-colors cursor-pointer ${
              p.badgeType === "bluray-blue"
                ? "bg-blue-600 font-semibold text-white shadow-xs"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
            onClick={() => p.onBadgeType("bluray-blue")}
            title="Blaues Blu-ray Logo verwenden (auch für DVD-Hüllen)"
          >
            BD Blau
          </button>
          <button
            type="button"
            className={`rounded px-1 py-1.5 text-center text-xs transition-colors cursor-pointer ${
              p.badgeType === "bluray-white"
                ? "bg-blue-600 font-semibold text-white shadow-xs"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
            onClick={() => p.onBadgeType("bluray-white")}
            title="Weißes Blu-ray Logo verwenden (auch für DVD-Hüllen)"
          >
            BD Weiß
          </button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.bleed} onChange={(e) => p.onBleed(e.target.checked)} />
        Bleed (3 mm)
      </label>
      <label className="text-xs text-slate-300">
        Target zone
        <select
          className="mt-1 block w-full rounded bg-slate-700 p-1 text-sm"
          value={p.zone}
          onChange={(e) => p.onZone(e.target.value as ZoneName)}
        >
          <option value="back">Back</option>
          <option value="spine">Spine</option>
          <option value="front">Front</option>
        </select>
      </label>
      <button className={btn} onClick={p.onAddText}>
        Add Text
      </button>
      <button className={btn} onClick={() => p.onAddBadge(p.badgeType)}>
        Add {p.badgeType === "dvd" ? "DVD" : "Blu-ray"} Logo
      </button>
      <FileButton onFile={p.onAddImage}>Add Image</FileButton>
      <FileButton onFile={p.onBackground}>Upload Background</FileButton>
      <div className="mt-auto flex flex-col gap-2">
        <button className={btn} onClick={() => p.onExport("pdf")}>
          Export PDF
        </button>
        <button className={btn} onClick={() => p.onExport("png")}>
          Export PNG
        </button>
      </div>
    </aside>
  );
}
