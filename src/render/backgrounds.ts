import { GROUND_SCREEN_Y, GROUND_Y, VIEW_H, VIEW_W, WORLD_ZOOM } from '../engine/constants';
import { mulberry32 } from '../engine/math';

export interface Layer { c: HTMLCanvasElement; w: number; h: number; p: number; y: number }

export interface Backdrop {
  sky: HTMLCanvasElement;
  moon: HTMLCanvasElement;
  layers: Layer[];
  ground: Layer;
  fore: Layer;
  fog: HTMLCanvasElement;
  vignette: HTMLCanvasElement;
}

function canvas(w: number, h: number, s: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * s);
  c.height = Math.ceil(h * s);
  const g = c.getContext('2d')!;
  g.scale(s, s);
  return [c, g];
}

type R = () => number;

function pagoda(g: CanvasRenderingContext2D, x: number, base: number, tiers: number, s: number, col: string, roof: string): void {
  let y = base;
  let w = 70 * s;
  for (let i = 0; i < tiers; i++) {
    const h = (22 - i * 1.5) * s;
    g.fillStyle = col;
    g.fillRect(x - w / 2, y - h, w, h);
    // flying eave
    g.fillStyle = roof;
    g.beginPath();
    g.moveTo(x - w / 2 - 14 * s, y - h + 4 * s);
    g.lineTo(x - w / 2, y - h - 6 * s);
    g.lineTo(x + w / 2, y - h - 6 * s);
    g.lineTo(x + w / 2 + 14 * s, y - h + 4 * s);
    g.lineTo(x + w / 2, y - h + 8 * s);
    g.lineTo(x - w / 2, y - h + 8 * s);
    g.closePath();
    g.fill();
    y -= h + 4 * s;
    w *= 0.82;
  }
  // finial
  g.fillStyle = roof;
  g.beginPath();
  g.moveTo(x - 4 * s, y);
  g.lineTo(x, y - 28 * s);
  g.lineTo(x + 4 * s, y);
  g.fill();
}

function hall(g: CanvasRenderingContext2D, x: number, base: number, w: number, h: number, col: string, roof: string, lit: string, r: R): void {
  g.fillStyle = col;
  g.fillRect(x, base - h, w, h);
  // columns
  g.fillStyle = '#1a0c10';
  for (let i = 0; i < 4; i++) g.fillRect(x + 8 + i * (w / 4), base - h, 4, h);
  // flying roof
  g.fillStyle = roof;
  g.beginPath();
  g.moveTo(x - 18, base - h + 6);
  g.quadraticCurveTo(x - 8, base - h - h * 0.35, x + w / 2, base - h - h * 0.45);
  g.quadraticCurveTo(x + w + 8, base - h - h * 0.35, x + w + 18, base - h + 6);
  g.lineTo(x + w, base - h + 14);
  g.lineTo(x, base - h + 14);
  g.closePath();
  g.fill();
  // lantern / door glow
  if (r() < 0.45) {
    g.fillStyle = lit;
    g.fillRect(x + w * 0.42, base - h * 0.55, w * 0.16, h * 0.35);
  }
}

function bamboo(g: CanvasRenderingContext2D, x: number, base: number, h: number, r: R): void {
  g.strokeStyle = '#0a1810';
  g.lineWidth = 3 + r() * 2;
  g.beginPath();
  g.moveTo(x, base);
  g.lineTo(x + (r() - 0.5) * 8, base - h);
  g.stroke();
  // leaves
  g.strokeStyle = '#0c2014';
  g.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    const ly = base - h * (0.3 + i * 0.14);
    const lx = x + (r() - 0.5) * 6;
    g.beginPath();
    g.moveTo(lx, ly);
    g.quadraticCurveTo(lx + 14, ly - 4, lx + 22, ly + 2);
    g.stroke();
    g.beginPath();
    g.moveTo(lx, ly);
    g.quadraticCurveTo(lx - 12, ly - 3, lx - 20, ly + 3);
    g.stroke();
  }
}

function stoneLion(g: CanvasRenderingContext2D, x: number, base: number, s: number, flip: number): void {
  g.save();
  g.translate(x, base);
  g.scale(flip * s, s);
  g.fillStyle = '#121018';
  g.fillRect(-18, -22, 36, 14); // plinth
  g.beginPath();
  g.moveTo(-14, -22);
  g.lineTo(-16, -48);
  g.quadraticCurveTo(-4, -62, 10, -52);
  g.lineTo(14, -28);
  g.lineTo(6, -22);
  g.closePath();
  g.fill();
  // head / mane
  g.beginPath();
  g.arc(6, -54, 12, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(14, -54);
  g.lineTo(28, -48);
  g.lineTo(18, -44);
  g.fill();
  g.restore();
}

function lantern(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  g.fillStyle = 'rgba(255, 180, 60, 0.85)';
  g.beginPath();
  g.ellipse(x, y, 5 * s, 7 * s, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#5a1810';
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = '#3a1008';
  g.fillRect(x - 1, y - 9 * s, 2, 3 * s);
  g.fillRect(x - 1, y + 7 * s, 2, 4 * s);
  // glow
  const grd = g.createRadialGradient(x, y, 0, x, y, 28 * s);
  grd.addColorStop(0, 'rgba(255,160,40,0.35)');
  grd.addColorStop(1, 'rgba(255,120,20,0)');
  g.fillStyle = grd;
  g.beginPath();
  g.arc(x, y, 28 * s, 0, Math.PI * 2);
  g.fill();
}

function inkMountain(g: CanvasRenderingContext2D, pts: number[], base: number, col: string): void {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(pts[0], base + 40);
  for (let i = 0; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.lineTo(pts[pts.length - 2], base + 40);
  g.closePath();
  g.fill();
}

export function buildBackdrop(scale: number): Backdrop {
  const s = Math.min(2, Math.max(1, scale));

  // --- indigo night sky ---
  const [sky, sg] = canvas(VIEW_W, VIEW_H, s);
  const grd = sg.createLinearGradient(0, 0, 0, VIEW_H);
  grd.addColorStop(0, '#060a18');
  grd.addColorStop(0.4, '#0c1830');
  grd.addColorStop(0.7, '#142038');
  grd.addColorStop(0.88, '#1a2030');
  grd.addColorStop(1, '#0e141c');
  sg.fillStyle = grd;
  sg.fillRect(0, 0, VIEW_W, VIEW_H);
  const r0 = mulberry32(7);
  for (let i = 0; i < 180; i++) {
    const y = r0() * VIEW_H * 0.55;
    sg.globalAlpha = (1 - y / (VIEW_H * 0.55)) * (0.25 + r0() * 0.65);
    sg.fillStyle = r0() < 0.12 ? '#ffe8c0' : '#c8d8f0';
    const sz = r0() < 0.06 ? 1.6 : 0.9;
    sg.fillRect(r0() * VIEW_W, y, sz, sz);
  }
  sg.globalAlpha = 1;
  // ink-wash cloud bands
  for (let i = 0; i < 7; i++) {
    const cy = 50 + r0() * 180, cx = r0() * VIEW_W;
    const cg = sg.createRadialGradient(cx, cy, 0, cx, cy, 200);
    cg.addColorStop(0, 'rgba(40,60,90,0.22)');
    cg.addColorStop(1, 'rgba(40,60,90,0)');
    sg.fillStyle = cg;
    sg.save();
    sg.translate(cx, cy);
    sg.scale(1.4, 0.22);
    sg.translate(-cx, -cy);
    sg.beginPath();
    sg.arc(cx, cy, 200, 0, Math.PI * 2);
    sg.fill();
    sg.restore();
  }

  // --- cold jade moon ---
  const [moon, mg] = canvas(260, 260, s);
  const mc = 130;
  const halo = mg.createRadialGradient(mc, mc, 36, mc, mc, 128);
  halo.addColorStop(0, 'rgba(200,230,255,0.55)');
  halo.addColorStop(0.4, 'rgba(140,180,210,0.16)');
  halo.addColorStop(1, 'rgba(40,80,120,0)');
  mg.fillStyle = halo;
  mg.fillRect(0, 0, 260, 260);
  const disc = mg.createRadialGradient(mc - 12, mc - 14, 6, mc, mc, 54);
  disc.addColorStop(0, '#f0f6ff');
  disc.addColorStop(0.7, '#d0dce8');
  disc.addColorStop(1, '#a0b0c4');
  mg.fillStyle = disc;
  mg.beginPath();
  mg.arc(mc, mc, 54, 0, Math.PI * 2);
  mg.fill();
  const rm = mulberry32(3);
  for (let i = 0; i < 10; i++) {
    const a = rm() * Math.PI * 2, d = rm() * 40;
    mg.fillStyle = `rgba(120,140,160,${0.1 + rm() * 0.15})`;
    mg.beginPath();
    mg.arc(mc + Math.cos(a) * d, mc + Math.sin(a) * d, 3 + rm() * 8, 0, Math.PI * 2);
    mg.fill();
  }

  // --- far ink mountains + pagodas (parallax 0.12) ---
  const farW = 2400;
  const [far, fg] = canvas(farW, VIEW_H, s);
  const r1 = mulberry32(11);
  const farBase = 410;
  inkMountain(fg, [0, farBase, 200, 280, 420, 320, 700, 250, 950, 300, 1200, 240, 1500, 290, 1800, 260, 2100, 310, 2400, 280], farBase, '#0a1220');
  inkMountain(fg, [100, farBase, 350, 340, 600, 300, 900, 350, 1300, 310, 1700, 340, 2100, 300, 2400, farBase], farBase, '#0e1828');
  for (let i = 0; i < 5; i++) {
    pagoda(fg, 200 + i * 450 + r1() * 80, farBase - 10, 5 + (r1() * 3) | 0, 0.7 + r1() * 0.4, '#101828', '#1a2838');
  }
  // distant temple halls
  for (let i = 0; i < 6; i++) {
    hall(fg, 80 + i * 380 + r1() * 60, farBase, 90 + r1() * 40, 40 + r1() * 30, '#121c2a', '#1c2838', 'rgba(255,140,40,0.25)', r1);
  }

  // --- mid town / bamboo (parallax 0.35) ---
  const midW = 2200;
  const [mid, mdg] = canvas(midW, VIEW_H, s);
  const r2 = mulberry32(23);
  const midBase = 446;
  for (let x = -20; x < midW; ) {
    const w = 70 + r2() * 70, h = 55 + r2() * 70;
    hall(mdg, x, midBase, w, h, '#141018', '#2a1810', 'rgba(255,150,50,0.55)', r2);
    x += w + 16 + r2() * 40;
  }
  // bamboo groves
  for (let i = 0; i < 40; i++) bamboo(mdg, r2() * midW, midBase, 80 + r2() * 100, r2);
  // stone lions flanking a gate
  stoneLion(mdg, 520, midBase, 1.1, 1);
  stoneLion(mdg, 620, midBase, 1.1, -1);
  stoneLion(mdg, 1600, midBase, 0.95, 1);
  stoneLion(mdg, 1690, midBase, 0.95, -1);
  // hanging lantern strings
  for (let i = 0; i < 12; i++) {
    const lx = 100 + i * 170 + r2() * 40;
    mdg.strokeStyle = '#1a1008';
    mdg.lineWidth = 1;
    mdg.beginPath();
    mdg.moveTo(lx - 20, midBase - 90);
    mdg.lineTo(lx + 20, midBase - 90);
    mdg.stroke();
    lantern(mdg, lx - 12, midBase - 78, 0.9);
    lantern(mdg, lx + 12, midBase - 82, 0.85);
  }
  mdg.fillStyle = '#100e14';
  mdg.fillRect(0, midBase - 4, midW, VIEW_H - midBase + 4);

  // --- near: temple gate, bridge, plum, fence (parallax 0.65) ---
  const nearW = 2000;
  const [near, ng] = canvas(nearW, VIEW_H, s);
  const r3 = mulberry32(37);
  const nb = GROUND_Y + 2;
  // stone bridge arch
  for (const bx of [300, 1100]) {
    ng.fillStyle = '#16141c';
    ng.beginPath();
    ng.moveTo(bx - 80, nb);
    ng.lineTo(bx - 70, nb - 28);
    ng.quadraticCurveTo(bx, nb - 70, bx + 70, nb - 28);
    ng.lineTo(bx + 80, nb);
    ng.closePath();
    ng.fill();
    ng.globalCompositeOperation = 'destination-out';
    ng.beginPath();
    ng.ellipse(bx, nb - 8, 42, 28, 0, Math.PI, 0);
    ng.fill();
    ng.globalCompositeOperation = 'source-over';
  }
  // temple gate (pai fang)
  ng.fillStyle = '#1a1210';
  ng.fillRect(700, nb - 120, 10, 120);
  ng.fillRect(860, nb - 120, 10, 120);
  ng.fillStyle = '#3a2010';
  ng.beginPath();
  ng.moveTo(680, nb - 115);
  ng.quadraticCurveTo(790, nb - 160, 900, nb - 115);
  ng.lineTo(890, nb - 105);
  ng.quadraticCurveTo(790, nb - 140, 690, nb - 105);
  ng.closePath();
  ng.fill();
  lantern(ng, 720, nb - 100, 1.1);
  lantern(ng, 850, nb - 100, 1.1);
  // bamboo near
  for (let i = 0; i < 18; i++) bamboo(ng, 40 + i * 110 + r3() * 40, nb, 90 + r3() * 80, r3);
  // plum blossom trees (ink silhouette)
  ng.strokeStyle = '#0c0a10';
  ng.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const tx = 150 + i * 480 + r3() * 60;
    ng.lineWidth = 5;
    ng.beginPath();
    ng.moveTo(tx, nb);
    ng.quadraticCurveTo(tx - 20, nb - 80, tx + 10, nb - 140);
    ng.stroke();
    ng.lineWidth = 2.5;
    for (let b = 0; b < 4; b++) {
      ng.beginPath();
      ng.moveTo(tx + 5, nb - 60 - b * 20);
      ng.quadraticCurveTo(tx + 40, nb - 70 - b * 22, tx + 55 + r3() * 20, nb - 50 - b * 18);
      ng.stroke();
    }
    // blossoms
    ng.fillStyle = 'rgba(240,200,210,0.55)';
    for (let p = 0; p < 12; p++) {
      ng.beginPath();
      ng.arc(tx + (r3() - 0.3) * 70, nb - 50 - r3() * 100, 2 + r3() * 2, 0, Math.PI * 2);
      ng.fill();
    }
  }
  // low stone rail
  ng.fillStyle = '#141018';
  for (let x = 0; x < nearW; x += 28) {
    ng.fillRect(x, nb - 36, 4, 36);
    ng.fillRect(x, nb - 36, 28, 3);
  }

  // --- ground tiles (parallax 1) ---
  const gW = 512, gH = VIEW_H - GROUND_Y;
  const [ground, gg] = canvas(gW, gH, s);
  const g1 = gg.createLinearGradient(0, 0, 0, gH);
  g1.addColorStop(0, '#2a2834');
  g1.addColorStop(0.3, '#1a1822');
  g1.addColorStop(1, '#0a0810');
  gg.fillStyle = g1;
  gg.fillRect(0, 0, gW, gH);
  const r4 = mulberry32(5);
  let row = 0;
  for (let y = 4; y < gH; y += 12 + row * 2, row++) {
    let x = row % 2 ? -14 : 0;
    while (x < gW) {
      const w = 28 + r4() * 16 + row * 3;
      const sh = 10 + row * 2;
      const l = 18 + r4() * 8 - row * 2;
      gg.fillStyle = `hsl(${220 + r4() * 20}, 10%, ${Math.max(6, l)}%)`;
      gg.beginPath();
      gg.roundRect(x + 1, y, Math.min(w - 2, gW - x - 1), sh, 2);
      gg.fill();
      x += w;
    }
  }
  gg.fillStyle = 'rgba(180,200,220,0.35)';
  gg.fillRect(0, 0, gW, 1.5);

  // --- foreground grass / lantern poles (parallax 1.3) ---
  const foreW = 2600;
  const [fore, fog2] = canvas(foreW, VIEW_H, s);
  const r5 = mulberry32(51);
  fog2.fillStyle = '#04060a';
  for (let i = 0; i < 6; i++) {
    const x = 180 + i * 420 + r5() * 100;
    fog2.fillRect(x, VIEW_H - 70, 5, 70);
    lantern(fog2, x + 2, VIEW_H - 78, 1.2);
  }
  for (let x = 0; x < foreW; x += 5) {
    const h = 8 + r5() * 26 * (0.5 + Math.sin(x * 0.012) * 0.5);
    fog2.beginPath();
    fog2.moveTo(x, VIEW_H);
    fog2.lineTo(x + 2 + r5() * 3, VIEW_H - h);
    fog2.lineTo(x + 5, VIEW_H);
    fog2.fill();
  }

  // --- mist ---
  const [fog, fgx] = canvas(1024, 180, 1);
  const r6 = mulberry32(77);
  for (let i = 0; i < 60; i++) {
    const x = r6() * 1024, y = 50 + r6() * 90, rad = 50 + r6() * 80;
    for (const ox of [0, -1024, 1024]) {
      const fgr = fgx.createRadialGradient(x + ox, y, 0, x + ox, y, rad);
      fgr.addColorStop(0, 'rgba(160,180,200,0.14)');
      fgr.addColorStop(1, 'rgba(160,180,200,0)');
      fgx.fillStyle = fgr;
      fgx.fillRect(x + ox - rad, y - rad, rad * 2, rad * 2);
    }
  }

  // --- vignette ---
  const [vig, vg] = canvas(VIEW_W, VIEW_H, 1);
  const vgr = vg.createRadialGradient(VIEW_W / 2, VIEW_H * 0.55, VIEW_H * 0.32, VIEW_W / 2, VIEW_H * 0.55, VIEW_W * 0.7);
  vgr.addColorStop(0, 'rgba(0,0,0,0)');
  vgr.addColorStop(0.6, 'rgba(0,8,16,0.1)');
  vgr.addColorStop(1, 'rgba(0,4,12,0.86)');
  vg.fillStyle = vgr;
  vg.fillRect(0, 0, VIEW_W, VIEW_H);

  return {
    sky,
    moon,
    layers: [
      { c: far, w: farW, h: VIEW_H, p: 0.12, y: 0 },
      { c: mid, w: midW, h: VIEW_H, p: 0.35, y: 0 },
      { c: near, w: nearW, h: VIEW_H, p: 0.65, y: 0 },
    ],
    ground: { c: ground, w: gW, h: gH, p: 1, y: GROUND_Y },
    fore: { c: fore, w: foreW, h: VIEW_H, p: 1.3, y: GROUND_Y + (VIEW_H - GROUND_SCREEN_Y) / WORLD_ZOOM - VIEW_H + 2 },
    fog,
    vignette: vig,
  };
}

export function drawLayer(ctx: CanvasRenderingContext2D, L: Layer, camX: number): void {
  const off = ((camX * L.p) % L.w + L.w) % L.w;
  for (let x = -off; x < VIEW_W; x += L.w) ctx.drawImage(L.c, x, L.y, L.w, L.h);
}
