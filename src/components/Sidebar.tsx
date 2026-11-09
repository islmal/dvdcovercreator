import { useState, type ReactNode } from "react";
import type { ZoneName } from "../lib/layout";
import { templates } from "../templates";

interface Props {
  templateId: string;
  onTemplate: (id: string) => void;
  zone: ZoneName;
  onZone: (z: ZoneName) => void;
  bleed: boolean;
  onBleed: (b: boolean) => void;
  onAddText: () => void;
  onAddImage: (f: File) => void;
  onBackground: (f: File) => void;
  onAutoGenerate: (title: string, files: File[]) => void;
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
              p.onAutoGenerate(title.trim(), covers);
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
          onClick={() => p.onAutoGenerate(title.trim(), covers)}
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
