import { Canvas, FabricImage, FabricObject, FabricText, Gradient, Group, IText, Rect, Textbox } from "fabric";
import { coverFit, packGrid, wizardSlots, zoneAt, type Layout, type Rect as Rect2, type ZoneName } from "./layout";

export type EditorObject = FabricObject & {
  autofillZone?: ZoneName;
  isBackground?: boolean;
  wizard?: true;
};

/** Average colour of an image from a 16x16 downscale. */
function averageColor(img: FabricImage): [number, number, number] {
  const c = document.createElement("canvas");
  c.width = c.height = 16;
  const g = c.getContext("2d")!;
  g.drawImage(img.getElement() as CanvasImageSource, 0, 0, 16, 16);
  const d = g.getImageData(0, 0, 16, 16).data;
  const sum = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) sum[k] += d[i + k];
  return sum.map((v) => v / 256) as [number, number, number];
}

/** Dark vertical gradient tinted by the cover colour, so white text stays readable. */
function backdrop(avg: [number, number, number] | null) {
  if (!avg) return new Rect({ width: 100, height: 100, fill: "#1A1A1A", selectable: false, evented: false });
  const shade = (f: number) => `rgb(${avg.map((v) => Math.round(v * f)).join(",")})`;
  return new Rect({
    width: 100,
    height: 100,
    selectable: false,
    evented: false,
    fill: new Gradient({
      type: "linear",
      gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: [
        { offset: 0, color: shade(0.45) },
        { offset: 1, color: shade(0.12) },
      ],
    }),
  });
}

export interface Editor {
  canvas: Canvas;
  setLayout(next: Layout): void;
  addText(zone: ZoneName): void;
  addImage(file: File, zone: ZoneName, dropX?: number, dropY?: number): Promise<void>;
  setBackground(file: File): Promise<void>;
  autoFill(obj: FabricObject): void;
  autoGenerate(title: string, images: File[]): Promise<void>;
  exportPng(): string;
  dispose(): void;
}

export function createEditor(
  el: HTMLCanvasElement,
  host: HTMLElement,
  initial: Layout,
  onSelect: (obj: FabricObject | null) => void,
): Editor {
  let layout = initial;
  let zoom = 1;
  let showGuides = true;
  const canvas = new Canvas(el, {
    width: layout.width,
    height: layout.height,
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
  });

  const resize = () => {
    zoom = Math.max(
      0.05,
      Math.min((host.clientWidth - 32) / layout.width, (host.clientHeight - 32) / layout.height),
    );
    canvas.setZoom(zoom);
    canvas.setDimensions({ width: layout.width * zoom, height: layout.height * zoom });
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // Guides are painted after every render, so they are never objects and never selectable.
  canvas.on("after:render", ({ ctx }) => {
    if (!showGuides) return;
    const [a, b, c, d, e, f] = canvas.viewportTransform;
    ctx.save();
    ctx.transform(a, b, c, d, e, f);
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([12 / zoom, 8 / zoom]);
    const { spine, front } = layout.zones;
    ctx.strokeStyle = "#2563eb";
    ctx.beginPath();
    for (const x of [spine.x, front.x]) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, layout.height);
    }
    ctx.stroke();
    if (layout.bleedPx) {
      const t = layout.trim;
      ctx.strokeStyle = "#dc2626";
      ctx.strokeRect(t.x, t.y, t.w, t.h);
    }
    ctx.restore();
  });

  const select = () => onSelect(canvas.getActiveObject() ?? null);
  canvas.on("selection:created", select);
  canvas.on("selection:updated", select);
  canvas.on("selection:cleared", select);

  // Text whose centre is inside the spine snaps to the spine's centre line.
  canvas.on("object:moving", ({ target }) => {
    if (!(target instanceof IText)) return;
    const sp = layout.zones.spine;
    const cx = target.getCenterPoint().x;
    if (cx >= sp.x && cx < sp.x + sp.w) target.set({ left: sp.x + sp.w / 2 });
  });

  const onDragOver = (e: DragEvent) => e.preventDefault();
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const r = canvas.getElement().getBoundingClientRect();
    const x = (e.clientX - r.left) / zoom;
    const y = (e.clientY - r.top) / zoom;
    for (const f of Array.from(e.dataTransfer?.files ?? [])) {
      if (f.type.startsWith("image/")) void editor.addImage(f, zoneAt(x, layout), x, y);
    }
  };
  host.addEventListener("dragover", onDragOver);
  host.addEventListener("drop", onDrop);

  const loadImage = async (file: File) => {
    const url = URL.createObjectURL(file);
    try {
      return await FabricImage.fromURL(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const add = (o: FabricObject) => {
    canvas.add(o);
    canvas.setActiveObject(o);
    canvas.requestRenderAll();
  };

  const fillRect = (o: FabricObject, rect: { x: number; y: number; w: number; h: number }) => {
    const f = coverFit(o.width, o.height, rect);
    o.set({
      originX: "center",
      originY: "center",
      angle: 0,
      scaleX: f.scale,
      scaleY: f.scale,
      left: f.left,
      top: f.top,
    });
    o.setCoords();
  };

  const fill = (o: EditorObject, zone: ZoneName) => {
    const z = layout.zones[zone];
    fillRect(o, z);
    o.clipPath = new Rect({ left: z.x, top: z.y, width: z.w, height: z.h, absolutePositioned: true });
    o.autofillZone = zone;
  };

  const fillBackground = (o: FabricObject) =>
    fillRect(o, { x: 0, y: 0, w: layout.width, h: layout.height });

  const editor: Editor = {
    canvas,

    setLayout(next) {
      const old = layout;
      if (next === old) return;
      layout = next;
      const dy = next.trim.y - old.trim.y;
      const dx: Record<ZoneName, number> = {
        back: next.trim.x - old.trim.x,
        spine: next.zones.spine.x + next.zones.spine.w / 2 - (old.zones.spine.x + old.zones.spine.w / 2),
        front: next.zones.front.x - old.zones.front.x,
      };
      for (const o of canvas.getObjects() as EditorObject[]) {
        if (o.isBackground) fillBackground(o);
        else if (o.autofillZone) fill(o, o.autofillZone);
        else {
          const z = zoneAt(o.getCenterPoint().x, old);
          o.set({ left: o.left + dx[z], top: o.top + dy });
          o.clipPath?.set({ left: (o.clipPath.left ?? 0) + dx[z], top: (o.clipPath.top ?? 0) + dy });
          o.setCoords();
        }
      }
      resize();
      canvas.requestRenderAll();
    },

    addText(zone) {
      const z = layout.zones[zone];
      add(
        new IText("Text", {
          originX: "center",
          originY: "center",
          left: z.x + z.w / 2,
          top: layout.height / 2,
          angle: zone === "spine" ? 90 : 0,
          fontSize: zone === "spine" ? 90 : 140,
          fill: "#000000",
          textAlign: "center",
          stroke: "#ffffff",
          strokeWidth: 0,
          paintFirst: "stroke",
        }),
      );
    },

    async addImage(file, zone, dropX, dropY) {
      const img = await loadImage(file);
      const z = layout.zones[zone];
      const s = Math.min(1, (z.w * 0.9) / img.width, (z.h * 0.9) / img.height);
      img.set({
        originX: "center",
        originY: "center",
        scaleX: s,
        scaleY: s,
        left: dropX ?? z.x + z.w / 2,
        top: dropY ?? layout.height / 2,
      });
      add(img);
    },

    async setBackground(file) {
      const img = (await loadImage(file)) as EditorObject;
      for (const o of canvas.getObjects() as EditorObject[]) if (o.isBackground) canvas.remove(o);
      img.isBackground = true;
      img.set({ selectable: false, evented: false });
      fillBackground(img);
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.requestRenderAll();
    },

    autoFill(obj) {
      if (!(obj instanceof FabricImage)) return;
      const o = obj as EditorObject;
      fill(o, o.autofillZone ?? zoneAt(obj.getCenterPoint().x, layout));
      canvas.requestRenderAll();
    },

    async autoGenerate(title, images) {
      for (const o of canvas.getObjects() as EditorObject[]) if (o.wizard) canvas.remove(o);
      const tag = <T extends FabricObject>(o: T) => {
        (o as EditorObject).wizard = true;
        canvas.add(o);
        return o;
      };
      const slots = wizardSlots(layout);
      const sp = layout.zones.spine;

      // All images (max 6) are laid out uncropped below the title on the front and again on the back.
      // Every panel gets a gradient tinted by the first image's average colour.
      const files = images.slice(0, 6);
      const cells = await Promise.all(files.map(loadImage));
      const avg = cells[0] ? averageColor(cells[0]) : null;
      for (const zone of ["back", "spine", "front"] as const) {
        const r = backdrop(avg);
        fill(r, zone);
        tag(r);
        canvas.sendObjectToBack(r);
      }
      for (const o of canvas.getObjects() as EditorObject[]) if (o.isBackground) canvas.sendObjectToBack(o);

      const gap = 24;
      // aspect ratio is kept (no cropping): images are only scaled to fit their cell
      const arrange = (imgs: FabricImage[], area: Rect2) => {
        const rs = packGrid(imgs.map((i) => ({ w: i.width, h: i.height })), area, gap);
        imgs.forEach((img, i) => {
          const r = rs[i];
          img.set({ originX: "center", originY: "center", scaleX: r.w / img.width, scaleY: r.h / img.height, left: r.x + r.w / 2, top: r.y + r.h / 2 });
          img.setCoords();
          tag(img);
        });
      };
      arrange(cells, slots.frontImages);
      if (files.length) arrange(await Promise.all(files.map(loadImage)), slots.backImages);

      const text = { fill: "#ffffff", fontFamily: "sans-serif" };
      tag(
        new IText(title, {
          ...text,
          originX: "center",
          originY: "center",
          textAlign: "center",
          left: slots.frontTitle.x,
          top: slots.frontTitle.y,
          fontSize: 140,
          stroke: "#000000",
          strokeWidth: 8,
          paintFirst: "stroke",
        }),
      );
      const spineTitle = new IText(title, {
        ...text,
        originX: "center",
        originY: "center",
        angle: 90,
        fontSize: Math.min(90, sp.w * 0.6),
      });
      const maxLen = layout.trim.h * 0.85;
      if (spineTitle.width > maxLen) spineTitle.set({ fontSize: (spineTitle.fontSize * maxLen) / spineTitle.width });
      spineTitle.set({ left: slots.spineCenter.x, top: slots.spineCenter.y });
      spineTitle.setCoords();
      tag(spineTitle);
      tag(new IText(title, { ...text, originX: "left", originY: "top", left: slots.backTitle.x, top: slots.backTitle.y, fontSize: 100 }));
      tag(
        new Textbox(
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
          { ...text, originX: "left", originY: "top", left: slots.synopsis.x, top: slots.synopsis.y, width: slots.synopsis.width, fontSize: 40 },
        ),
      );

      // generic placeholder badge, not the trademarked DVD-Video logo
      const logo = () =>
        new Group(
          [
            new Rect({ left: 0, top: 0, width: 200, height: 120, rx: 24, ry: 24, fill: "transparent", stroke: "#fff", strokeWidth: 10 }),
            new FabricText("DVD", { left: 105, top: 65, originX: "center", originY: "center", fontFamily: "Arial", fontWeight: "bold", fontSize: 70, fill: "#fff" }),
          ],
        );
      const spineLogo = logo();
      const s = (sp.w * 0.8) / spineLogo.width;
      spineLogo.set({ originX: "center", originY: "bottom", scaleX: s, scaleY: s, left: slots.spineLogo.x, top: slots.spineLogo.y });
      tag(spineLogo);
      const frontLogo = logo();
      const fs = 300 / frontLogo.width;
      frontLogo.set({ originX: "right", originY: "bottom", scaleX: fs, scaleY: fs, left: slots.frontLogo.x, top: slots.frontLogo.y });
      tag(frontLogo);

      canvas.discardActiveObject();
      canvas.requestRenderAll();
    },

    // Rendered at zoom 1 (not via multiplier) so the PNG is exactly layout.width x layout.height.
    exportPng() {
      canvas.discardActiveObject();
      showGuides = false;
      canvas.setZoom(1);
      canvas.setDimensions({ width: layout.width, height: layout.height });
      try {
        return canvas.toDataURL({ format: "png", multiplier: 1 });
      } finally {
        showGuides = true;
        resize();
        canvas.requestRenderAll();
      }
    },

    dispose() {
      ro.disconnect();
      host.removeEventListener("dragover", onDragOver);
      host.removeEventListener("drop", onDrop);
      void canvas.dispose();
    },
  };
  return editor;
}
