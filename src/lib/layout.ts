export interface Template {
  id: string;
  name: string;
  dpi: number;
  heightMm: number;
  backMm: number;
  spineMm: number;
  frontMm: number;
  bleedMm: number;
}

export type ZoneName = "back" | "spine" | "front";
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Layout {
  width: number;
  height: number;
  bleedPx: number;
  trim: Rect;
  zones: Record<ZoneName, Rect>;
}

export const mmToPx = (mm: number, dpi = 300) => Math.round((mm / 25.4) * dpi);

export function computeLayout(t: Template, bleedOn: boolean): Layout {
  const b = bleedOn ? mmToPx(t.bleedMm, t.dpi) : 0;
  const back = mmToPx(t.backMm, t.dpi);
  const spine = mmToPx(t.spineMm, t.dpi);
  const front = mmToPx(t.frontMm, t.dpi);
  const h = mmToPx(t.heightMm, t.dpi);
  const width = back + spine + front + 2 * b;
  const height = h + 2 * b;
  return {
    width,
    height,
    bleedPx: b,
    trim: { x: b, y: b, w: back + spine + front, h },
    zones: {
      // outer zones extend into the bleed; the spine only top/bottom
      back: { x: 0, y: 0, w: back + b, h: height },
      spine: { x: b + back, y: 0, w: spine, h: height },
      front: { x: b + back + spine, y: 0, w: front + b, h: height },
    },
  };
}

export function zoneAt(x: number, l: Layout): ZoneName {
  if (x < l.zones.spine.x) return "back";
  if (x < l.zones.front.x) return "spine";
  return "front";
}

/** Scale so the image fully covers the zone; left/top are the zone centre (use origin 'center'). */
export function coverFit(imgW: number, imgH: number, zone: Rect) {
  return {
    scale: Math.max(zone.w / imgW, zone.h / imgH),
    left: zone.x + zone.w / 2,
    top: zone.y + zone.h / 2,
  };
}

export interface WizardSlots {
  frontTitle: { x: number; y: number };
  spineCenter: { x: number; y: number };
  backTitle: { x: number; y: number };
  synopsis: { x: number; y: number; width: number };
  spineLogo: { x: number; y: number };
  frontLogo: { x: number; y: number };
  frontImages: Rect;
  backImages: Rect;
}

/** Anchor points for the express wizard, 6 % inside the trim area of each panel (zones include bleed, so not used). */
export function wizardSlots(l: Layout): WizardSlots {
  const { trim } = l;
  const spine = l.zones.spine;
  const backW = spine.x - trim.x;
  const frontW = trim.x + trim.w - l.zones.front.x;
  const mx = (w: number) => w * 0.06;
  const bottom = trim.y + trim.h - trim.h * 0.06;
  return {
    frontTitle: { x: l.zones.front.x + frontW / 2, y: trim.y + trim.h * 0.1 },
    spineCenter: { x: spine.x + spine.w / 2, y: trim.y + trim.h / 2 },
    backTitle: { x: trim.x + mx(backW), y: trim.y + trim.h * 0.06 },
    synopsis: { x: trim.x + mx(backW), y: trim.y + trim.h * 0.2, width: backW - 2 * mx(backW) },
    spineLogo: { x: spine.x + spine.w / 2, y: bottom },
    frontLogo: { x: trim.x + trim.w - mx(frontW), y: bottom },
    // image areas leave room above for the title (and the synopsis on the back) and below for the logo
    frontImages: { x: l.zones.front.x + mx(frontW), y: trim.y + trim.h * 0.22, w: frontW - 2 * mx(frontW), h: trim.h * 0.64 },
    backImages: { x: trim.x + mx(backW), y: trim.y + trim.h * 0.36, w: backW - 2 * mx(backW), h: trim.h * 0.58 },
  };
}

/** Fit images into `area` without cropping: equal grid cells, each image scaled to fit its cell (aspect kept) and centred. Picks the column count that keeps the images largest. */
export function packGrid(sizes: { w: number; h: number }[], area: Rect, gap: number): Rect[] {
  const n = sizes.length;
  let best: Rect[] = [];
  let bestScore = -1;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cw = (area.w - gap * (cols - 1)) / cols;
    const ch = (area.h - gap * (rows - 1)) / rows;
    const rects = sizes.map((s, i) => {
      const k = Math.min(cw / s.w, ch / s.h);
      const w = s.w * k;
      const h = s.h * k;
      // the last row is centred when it is not full
      const inRow = i >= (rows - 1) * cols ? n - (rows - 1) * cols : cols;
      const offX = ((cols - inRow) * (cw + gap)) / 2;
      const x = area.x + offX + (i % cols) * (cw + gap) + (cw - w) / 2;
      const y = area.y + Math.floor(i / cols) * (ch + gap) + (ch - h) / 2;
      return { x, y, w, h };
    });
    const score = rects.reduce((a, r) => a + r.w * r.h, 0);
    if (score > bestScore) {
      bestScore = score;
      best = rects;
    }
  }
  return best;
}
