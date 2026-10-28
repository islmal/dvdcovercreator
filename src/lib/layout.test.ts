import { describe, expect, it } from "vitest";
import { computeLayout, coverFit, packGrid, wizardSlots, zoneAt } from "./layout";
import { templates } from "../templates";

const [std, slim] = templates;

describe("computeLayout", () => {
  it("standard", () => {
    const l = computeLayout(std, false);
    expect(l.width).toBe(3213);
    expect(l.height).toBe(2161);
    expect(l.zones.back).toMatchObject({ x: 0, w: 1524 });
    expect(l.zones.spine).toMatchObject({ x: 1524, w: 165 });
    expect(l.zones.front).toMatchObject({ x: 1689, w: 1524 });
  });
  it("slim", () => {
    const l = computeLayout(slim, false);
    expect(l.zones.spine.w).toBe(Math.round((7 / 25.4) * 300));
    expect(l.zones.spine.w).toBe(83);
    expect(l.zones.front.x).toBe(1607);
  });
  it("bleed", () => {
    const a = computeLayout(std, false);
    const b = computeLayout(std, true);
    expect(b.width).toBe(a.width + 70);
    expect(b.height).toBe(a.height + 70);
    expect(b.trim.x).toBe(a.trim.x + 35);
    expect(b.zones.spine.x).toBe(a.zones.spine.x + 35);
    expect(b.zones.front.x).toBe(a.zones.front.x + 35);
    expect(b.zones.back.x).toBe(0);
    expect(b.zones.front.x + b.zones.front.w).toBe(b.width);
    expect(b.zones.back.x + b.zones.back.w).toBe(b.zones.spine.x);
  });
});

describe("zoneAt", () => {
  const l = computeLayout(std, false);
  it("boundaries", () => {
    expect(zoneAt(1523, l)).toBe("back");
    expect(zoneAt(1524, l)).toBe("spine");
    expect(zoneAt(1688, l)).toBe("spine");
    expect(zoneAt(1689, l)).toBe("front");
  });
});

describe("coverFit", () => {
  it("covers and centres", () => {
    const zone = { x: 0, y: 0, w: 1524, h: 2161 };
    const f = coverFit(1000, 500, zone);
    expect(f.scale).toBeCloseTo(4.322, 3);
    expect(1000 * f.scale).toBeGreaterThanOrEqual(zone.w);
    expect(500 * f.scale).toBeGreaterThanOrEqual(zone.h);
    expect(f.left).toBe(762);
    expect(f.top).toBe(1080.5);
  });
});

describe("wizardSlots", () => {
  const [stdT, slimT] = templates;
  for (const [name, t, bleed] of [["standard", stdT, false], ["slim", slimT, false], ["bleed", stdT, true]] as const) {
    it(name, () => {
      const l = computeLayout(t, bleed);
      const s = wizardSlots(l);
      const { trim } = l;
      const sp = l.zones.spine;
      const fr = l.zones.front;
      const backW = sp.x - trim.x;
      const frontW = trim.x + trim.w - fr.x;
      expect(s.spineCenter).toEqual({ x: sp.x + sp.w / 2, y: trim.y + trim.h / 2 });
      expect(s.frontTitle.x).toBe(fr.x + frontW / 2);
      expect(s.frontTitle.y).toBeGreaterThanOrEqual(trim.y);
      expect(s.frontTitle.y).toBeLessThanOrEqual(trim.y + trim.h / 5);
      for (const p of [s.backTitle, s.synopsis]) expect(p.x).toBeGreaterThanOrEqual(trim.x + backW * 0.06 - 1e-9);
      expect(s.synopsis.x + s.synopsis.width).toBeLessThanOrEqual(sp.x - backW * 0.06 + 1e-9);
      expect(s.spineLogo.x).toBe(s.spineCenter.x);
      expect(s.spineLogo.y).toBeGreaterThan(s.spineCenter.y);
      expect(s.spineLogo.y).toBeLessThanOrEqual(trim.y + trim.h);
      expect(s.frontLogo.x).toBeGreaterThan(fr.x + frontW / 2);
      expect(s.frontLogo.x).toBeLessThanOrEqual(trim.x + trim.w);
      expect(s.frontLogo.y).toBeLessThanOrEqual(trim.y + trim.h);
    });
  }
});

describe("packGrid", () => {
  const area = { x: 100, y: 200, w: 1000, h: 1200 };
  it("keeps aspect ratio and stays inside the area", () => {
    const sizes = [{ w: 640, h: 360 }, { w: 500, h: 750 }, { w: 800, h: 800 }];
    const rs = packGrid(sizes, area, 24);
    rs.forEach((r, i) => {
      expect(r.w / r.h).toBeCloseTo(sizes[i].w / sizes[i].h, 6);
      expect(r.x).toBeGreaterThanOrEqual(area.x - 1e-6);
      expect(r.y).toBeGreaterThanOrEqual(area.y - 1e-6);
      expect(r.x + r.w).toBeLessThanOrEqual(area.x + area.w + 1e-6);
      expect(r.y + r.h).toBeLessThanOrEqual(area.y + area.h + 1e-6);
    });
  });
  it("two wide images stack instead of shrinking side by side", () => {
    const [a, b] = packGrid([{ w: 1600, h: 900 }, { w: 1600, h: 900 }], area, 24);
    expect(b.y).toBeGreaterThan(a.y + a.h);
    expect(a.w).toBeCloseTo(1000, 6);
  });
});
