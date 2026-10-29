/**
 * 镇山石兽 — Chinese roof-ridge / stone-lion / 夜叉 guardian.
 * Gameplay id remains gargoyle; attacks & HP unchanged.
 */
import { drawGlow } from '../effects/glow';
import type { V } from '../engine/math';
import type { SilhouetteDef, SilhouettePart } from '../meta/bTier/types';
import { limb, solve, type Dims, type Joints, type Pose } from './rig';

export const GARG_DIMS: Dims = { thigh: 28, shin: 30, torso: 46, neck: 8, headR: 15, upper: 28, fore: 28, weapon: 10 };

export interface GargOpts {
  time: number; flash?: boolean; wing: number; jaw: number; rage: boolean; glow?: number; armor?: boolean;
  /** Per-act stone tint (jade default). Overridden by silhouette palette.skin when present. */
  tint?: 'jade' | 'ink' | 'blood' | 'ash';
  /**
   * Catalog silhouette (BossSil1: palette / scale; BossSil2: faceMark / ornament / armorLayer / cloak.color).
   * Absent / no parts / missing → tint + unit scale (bit-identical to pre-Sil1).
   */
  silhouette?: SilhouetteDef | null;
}

/** Resolved Boss silhouette look from whitelist parts (pure; smoke-friendly). */
export type GargSilhouetteLook = {
  /** Overrides tint-derived primary stone when set. */
  skin?: string;
  /** Secondary stone (from palette.arm, else palette.coat). */
  skinB?: string;
  /** Overall draw scale; 1 when no scale part. Clamped ~0.85–1.25. */
  scale: number;
  /** BossSil2: face overlay (none skips draw). */
  faceMark?: { style: 'none' | 'scar' | 'mask' | 'veil'; color?: string };
  /** BossSil2: joint ornaments (waist / back / neck / ear). */
  ornaments?: Array<{ slot: 'waist' | 'back' | 'neck' | 'ear'; style: string; color?: string }>;
  /** BossSil2: light procedural armor plates on torso joints. */
  armor?: Array<{ slot: 'chest' | 'shoulder' | 'skirt'; style: 'light' | 'plate' | 'cloth'; color?: string }>;
  /** BossSil2: optional cloud-cape recolor from cloak.color. */
  cloakColor?: string;
};

const GARG_SIL_SCALE_MIN = 0.85;
const GARG_SIL_SCALE_MAX = 1.25;

/** Known kinds still deferred past BossSil2 (soft-skip, no warn). */
const GARG_SIL_DEFERRED = new Set([
  'headgear', 'torso', 'offhand', 'mainhand', 'stanceBias',
]);

const gargPartWarn = new Set<string>();
function warnGargPart(key: string, msg: string): void {
  if (gargPartWarn.has(key)) return;
  gargPartWarn.add(key);
  console.warn(`[silhouette:gargoyle] ${msg}`);
}

/**
 * Soft-parse silhouette parts for drawGargoyle (BossSil1 + BossSil2 subset).
 * - palette.skin → skin; palette.arm|coat → skinB
 * - scale.value → clamped overall scale
 * - faceMark / ornament / armorLayer → light overlays
 * - cloak.color → cloud cape fill (style ignored; cape geometry stays)
 * - unknown kind → soft-skip + warn once; deferred kinds → silent skip
 * No parts / null sil → { scale: 1 } (caller keeps tint path).
 */
export function resolveGargoyleSilhouetteLook(
  sil: SilhouetteDef | null | undefined,
): GargSilhouetteLook {
  const out: GargSilhouetteLook = { scale: 1 };
  const parts = sil?.parts;
  if (!parts?.length) return out;
  const silId = sil!.id;
  for (const p of parts) {
    const k = (p as { kind?: string }).kind;
    if (k === 'palette') {
      const pal = p as Extract<SilhouettePart, { kind: 'palette' }>;
      if (pal.skin != null && pal.skin !== '') out.skin = pal.skin;
      if (pal.arm != null && pal.arm !== '') out.skinB = pal.arm;
      else if (pal.coat != null && pal.coat !== '' && out.skinB == null) out.skinB = pal.coat;
    } else if (k === 'scale') {
      const v = (p as { value?: number }).value;
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        out.scale = Math.max(GARG_SIL_SCALE_MIN, Math.min(GARG_SIL_SCALE_MAX, v));
      }
    } else if (k === 'faceMark') {
      const f = p as Extract<SilhouettePart, { kind: 'faceMark' }>;
      out.faceMark = { style: f.style ?? 'none', color: f.color };
    } else if (k === 'ornament') {
      const o = p as Extract<SilhouettePart, { kind: 'ornament' }>;
      (out.ornaments ??= []).push({
        slot: o.slot ?? 'waist',
        style: o.style ?? 'pendant',
        color: o.color,
      });
    } else if (k === 'armorLayer') {
      const a = p as Extract<SilhouettePart, { kind: 'armorLayer' }>;
      (out.armor ??= []).push({
        slot: a.slot ?? 'chest',
        style: a.style ?? 'light',
        color: a.color,
      });
    } else if (k === 'cloak') {
      const c = p as Extract<SilhouettePart, { kind: 'cloak' }>;
      if (c.color != null && c.color !== '') out.cloakColor = c.color;
    } else if (k && GARG_SIL_DEFERRED.has(k)) {
      // BossSil3+ / non-stone semantics
    } else if (k) {
      warnGargPart(`${silId}:${k}`, `石兽剪影暂不解释 kind「${k}」，已跳过`);
    }
  }
  return out;
}

/** Cloud / incense-smoke cape (replaces Western bat wings). */
function cloudCape(ctx: CanvasRenderingContext2D, root: V, flap: number, col: string, soft: string, scale: number, side: 1 | -1): void {
  const baseAng = side > 0 ? -2.0 : -1.1;
  const ang = baseAng - flap * 0.55 * side;
  ctx.fillStyle = soft;
  for (let i = 0; i < 4; i++) {
    const a = ang - i * 0.28 * side;
    const len = (48 + i * 10) * scale;
    const ex = root.x + Math.cos(a) * len;
    const ey = root.y + Math.sin(a) * len;
    const r = (16 - i * 2) * scale;
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 1.4, r * 0.85, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // stone plaque "spine" through the clouds
  ctx.strokeStyle = col;
  ctx.lineWidth = 5 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(root.x, root.y);
  ctx.quadraticCurveTo(
    root.x + Math.cos(ang) * 40 * scale,
    root.y + Math.sin(ang) * 40 * scale,
    root.x + Math.cos(ang - 0.4 * side) * 70 * scale,
    root.y + Math.sin(ang - 0.4 * side) * 70 * scale,
  );
  ctx.stroke();
}

function claws(ctx: CanvasRenderingContext2D, h: V, a: number, col: string): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = 2.6;
  for (let i = -1; i <= 1; i++) {
    const ang = a + i * 0.35;
    const dx = Math.sin(ang), dy = Math.cos(ang);
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.quadraticCurveTo(h.x + dx * 9, h.y + dy * 9, h.x + dx * 14 + dy * 3, h.y + dy * 14 - dx * 3);
    ctx.stroke();
  }
}

/** BossSil2: light armor plates on stone torso joints (procedural, no PNG). */
function drawGargArmor(
  ctx: CanvasRenderingContext2D,
  j: Joints,
  nx: number, ny: number,
  armor: NonNullable<GargSilhouetteLook['armor']>,
  s: number,
): void {
  const { hip, sh } = j;
  for (const a of armor) {
    const col = a.color ?? (a.style === 'plate' ? '#6a7080' : a.style === 'cloth' ? '#5a5048' : '#4a4050');
    ctx.fillStyle = col;
    ctx.globalAlpha = a.style === 'plate' ? 0.55 : 0.38;
    if (a.slot === 'chest') {
      ctx.beginPath();
      ctx.moveTo(sh.x + nx * 12 * s, sh.y + ny * 12 * s);
      ctx.lineTo(sh.x - nx * 10 * s, sh.y - ny * 10 * s);
      ctx.lineTo(hip.x - nx * 8 * s, hip.y - ny * 8 * s - 2 * s);
      ctx.lineTo(hip.x + nx * 9 * s, hip.y + ny * 9 * s - 2 * s);
      ctx.closePath();
      ctx.fill();
    } else if (a.slot === 'shoulder') {
      ctx.beginPath();
      ctx.ellipse(sh.x + nx * 16 * s, sh.y + 3 * s, 9 * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sh.x - nx * 14 * s, sh.y + 3 * s, 8 * s, 5.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (a.slot === 'skirt') {
      ctx.beginPath();
      ctx.moveTo(hip.x + nx * 10 * s, hip.y);
      ctx.lineTo(hip.x + nx * 14 * s, hip.y + 18 * s);
      ctx.lineTo(hip.x - nx * 14 * s, hip.y + 18 * s);
      ctx.lineTo(hip.x - nx * 10 * s, hip.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/** BossSil2: waist/back/neck/ear ornaments on stone joints. */
function drawGargOrnaments(
  ctx: CanvasRenderingContext2D,
  j: Joints,
  ornaments: NonNullable<GargSilhouetteLook['ornaments']>,
  s: number,
): void {
  const { hip, sh, head } = j;
  for (const orn of ornaments) {
    if (orn.style === 'none') continue;
    const col = orn.color ?? '#c8a060';
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    if (orn.slot === 'waist') {
      ctx.lineWidth = 2.2 * s;
      ctx.beginPath();
      ctx.moveTo(hip.x, hip.y + 2 * s);
      ctx.lineTo(hip.x - 5 * s, hip.y + 16 * s);
      ctx.stroke();
      const r = orn.style === 'bell' ? 4 * s : 3 * s;
      ctx.beginPath();
      ctx.arc(hip.x - 5 * s, hip.y + 18 * s, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (orn.slot === 'neck') {
      ctx.lineWidth = 1.8 * s;
      ctx.beginPath();
      ctx.arc(head.x, head.y + 12 * s, 7 * s, 0.15, Math.PI - 0.15);
      ctx.stroke();
    } else if (orn.slot === 'back') {
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 2.4 * s;
      ctx.beginPath();
      ctx.moveTo(sh.x - 10 * s, sh.y + 4 * s);
      ctx.quadraticCurveTo(sh.x - 28 * s, sh.y + 24 * s, sh.x - 22 * s, hip.y + 12 * s);
      ctx.stroke();
      if (orn.style === 'banner' || orn.style === 'feather') {
        ctx.beginPath();
        ctx.moveTo(sh.x - 22 * s, hip.y + 12 * s);
        ctx.lineTo(sh.x - 30 * s, hip.y + 28 * s);
        ctx.lineTo(sh.x - 14 * s, hip.y + 22 * s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (orn.slot === 'ear') {
      ctx.beginPath();
      ctx.arc(head.x + 10 * s, head.y - 2 * s, 2.4 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** BossSil2: scar / mask / veil on stone-lion snout. */
function drawGargFaceMark(
  ctx: CanvasRenderingContext2D,
  head: V,
  hr: number,
  fm: NonNullable<GargSilhouetteLook['faceMark']>,
): void {
  if (!fm.style || fm.style === 'none') return;
  const fc = fm.color ?? '#3a3038';
  ctx.strokeStyle = fc;
  ctx.fillStyle = fc;
  if (fm.style === 'scar') {
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(head.x + 2, head.y - hr * 0.35);
    ctx.lineTo(head.x + hr * 0.55, head.y + hr * 0.25);
    ctx.stroke();
  } else if (fm.style === 'mask') {
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.ellipse(head.x + hr * 0.25, head.y + 1, hr * 0.7, hr * 0.42, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (fm.style === 'veil') {
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    ctx.moveTo(head.x - 2, head.y + 2);
    ctx.quadraticCurveTo(head.x + hr * 0.4, head.y + hr * 0.9, head.x + hr * 0.9, head.y + hr * 0.55);
    ctx.lineTo(head.x + hr * 0.2, head.y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function drawGargoyle(ctx: CanvasRenderingContext2D, pose: Pose, o: GargOpts): Joints {
  const look = resolveGargoyleSilhouetteLook(o.silhouette);
  const scaleMul = look.scale;
  const dims: Dims = scaleMul !== 1
    ? {
        thigh: GARG_DIMS.thigh * scaleMul,
        shin: GARG_DIMS.shin * scaleMul,
        torso: GARG_DIMS.torso * scaleMul,
        neck: GARG_DIMS.neck * scaleMul,
        headR: GARG_DIMS.headR * scaleMul,
        upper: GARG_DIMS.upper * scaleMul,
        fore: GARG_DIMS.fore * scaleMul,
        weapon: GARG_DIMS.weapon * scaleMul,
      }
    : GARG_DIMS;
  const j = solve(pose, dims);
  const F = o.flash;
  // weathered stone; tint shifts per act — silhouette palette.skin/arm|coat override when set
  const tint = o.tint ?? 'jade';
  const skinMap = {
    jade: { skin: '#6a7880', skinB: '#4a5860', dark: '#243038', soft: 'rgba(70,90,100,0.55)' },
    ink: { skin: '#5a6878', skinB: '#3a4858', dark: '#1a2838', soft: 'rgba(50,70,100,0.55)' },
    ash: { skin: '#787068', skinB: '#585048', dark: '#302820', soft: 'rgba(90,80,70,0.5)' },
    blood: { skin: '#786068', skinB: '#584050', dark: '#381828', soft: 'rgba(100,50,60,0.55)' },
  } as const;
  const tm = skinMap[tint] ?? skinMap.jade;
  let skin = F ? '#fff' : tm.skin;
  let skinB = F ? '#fff' : tm.skinB;
  const dark = F ? '#fff' : tm.dark;
  let soft = F ? '#ffffffaa' : tm.soft;
  if (!F) {
    if (look.skin) skin = look.skin;
    if (look.skinB) skinB = look.skinB;
    // BossSil2: cloak.color recolors cloud-cape fill (stroke stays skin/skinB)
    if (look.cloakColor) soft = look.cloakColor;
  }
  const claw = F ? '#fff' : '#e8dcc8';
  const cinnabar = F ? '#fff' : '#a01828';
  const silS = scaleMul;
  ctx.save();
  if (pose.rot) {
    ctx.translate(j.hip.x, j.hip.y);
    ctx.rotate(pose.rot);
    ctx.translate(-j.hip.x, -j.hip.y);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const { hip, sh, head } = j;
  const wingRoot = { x: sh.x - 6, y: sh.y + 2 };
  const flap = o.wing;

  // back cloud cape
  cloudCape(ctx, { x: wingRoot.x + 4, y: wingRoot.y }, flap, skinB, soft, 1.05, -1);

  // stone lion tail (thick, curled)
  const tw = Math.sin(o.time * 0.08) * 6;
  ctx.strokeStyle = skinB;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(hip.x - 4, hip.y);
  ctx.bezierCurveTo(hip.x - 28, hip.y + 18, hip.x - 48, hip.y + 8 + tw, hip.x - 56, hip.y - 8 + tw);
  ctx.stroke();
  ctx.fillStyle = skinB;
  ctx.beginPath();
  ctx.arc(hip.x - 56, hip.y - 10 + tw, 8, 0, Math.PI * 2);
  ctx.fill();

  limb(ctx, sh, j.bElbow, j.bHand, 12, skinB);
  claws(ctx, j.bHand, j.bForeAng, claw);
  limb(ctx, hip, j.bKnee, j.bFoot, 14, skinB);
  ctx.strokeStyle = skinB; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(j.bFoot.x, j.bFoot.y); ctx.lineTo(j.bFoot.x + 14, j.bFoot.y + 1); ctx.stroke();

  // torso — stocky stone guardian
  const ux = sh.x - hip.x, uy = sh.y - hip.y;
  const ul = Math.hypot(ux, uy) || 1;
  const nx = -uy / ul, ny = ux / ul;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(hip.x + nx * 14, hip.y + ny * 14);
  ctx.quadraticCurveTo(hip.x + ux * 0.5 + nx * 26, hip.y + uy * 0.5 + ny * 26, sh.x + nx * 20, sh.y + ny * 20);
  ctx.quadraticCurveTo(sh.x - ux * 0.1, sh.y - uy * 0.2, sh.x - nx * 18, sh.y - ny * 18);
  ctx.quadraticCurveTo(hip.x + ux * 0.5 - nx * 18, hip.y + uy * 0.5 - ny * 18, hip.x - nx * 13, hip.y - ny * 13);
  ctx.closePath();
  ctx.fill();

  // carved stone plaques / armor plates
  ctx.fillStyle = dark;
  for (let i = 0; i < 3; i++) {
    const k = 0.3 + i * 0.22;
    const px = hip.x + ux * k + nx * 2, py = hip.y + uy * k + ny * 2;
    ctx.beginPath();
    ctx.moveTo(px - nx * 4, py - ny * 4);
    ctx.lineTo(px + nx * 12, py + ny * 12);
    ctx.lineTo(px + nx * 10 + ux * 0.1, py + ny * 10 + uy * 0.1);
    ctx.lineTo(px - nx * 2 + ux * 0.1, py - ny * 2 + uy * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  // cinnabar veins when raging
  ctx.strokeStyle = o.rage && !F ? cinnabar : dark;
  ctx.lineWidth = o.rage ? 2.2 : 1.4;
  if (o.rage && !F) { ctx.shadowColor = '#a01020'; ctx.shadowBlur = 10; }
  ctx.beginPath();
  ctx.moveTo(hip.x + nx * 2, hip.y + ny * 2);
  ctx.quadraticCurveTo(hip.x + ux * 0.5 + nx * 10, hip.y + uy * 0.5 + ny * 10, sh.x + nx * 6, sh.y + ny * 6);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 朱砂护心镜
  if (!F) {
    const mx = hip.x + ux * 0.55 + nx * 6, my = hip.y + uy * 0.55 + ny * 6;
    ctx.fillStyle = cinnabar;
    ctx.beginPath();
    ctx.arc(mx, my, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8d8a0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(mx, my - 4); ctx.lineTo(mx, my + 4);
    ctx.moveTo(mx - 4, my); ctx.lineTo(mx + 4, my);
    ctx.stroke();
  }

  // BossSil2: armorLayer overlays on torso joints
  if (look.armor && !F) {
    drawGargArmor(ctx, j, nx, ny, look.armor, silS);
  }

  limb(ctx, hip, j.fKnee, j.fFoot, 15, skin);
  ctx.strokeStyle = skin; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(j.fFoot.x, j.fFoot.y); ctx.lineTo(j.fFoot.x + 14, j.fFoot.y + 1); ctx.stroke();
  claws(ctx, { x: j.fFoot.x + 12, y: j.fFoot.y }, 1.57, claw);

  // head — 螭吻 / stone lion
  const hr = dims.headR;
  const jaw = o.jaw;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(head.x, head.y, hr * 1.1, hr * 0.9, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // broad snout
  ctx.beginPath();
  ctx.moveTo(head.x + 2, head.y - 5);
  ctx.lineTo(head.x + hr + 10, head.y);
  ctx.lineTo(head.x + hr + 6, head.y + 6);
  ctx.lineTo(head.x + 2, head.y + 5);
  ctx.closePath();
  ctx.fill();
  // jaw
  ctx.fillStyle = skinB;
  ctx.beginPath();
  ctx.moveTo(head.x + 1, head.y + 5);
  ctx.lineTo(head.x + hr + 6, head.y + 5 + jaw * 12);
  ctx.lineTo(head.x + hr, head.y + 11 + jaw * 14);
  ctx.lineTo(head.x - 2, head.y + 10);
  ctx.closePath();
  ctx.fill();
  if (jaw > 0.15 && !F) {
    drawGlow(ctx, head.x + hr + 2, head.y + 6, 12 + jaw * 18, '#ff8040', 0.5 * jaw);
  }
  // fangs
  ctx.fillStyle = claw;
  for (let i = 0; i < 3; i++) {
    const fx = head.x + 7 + i * 5;
    ctx.beginPath();
    ctx.moveTo(fx, head.y + 3);
    ctx.lineTo(fx + 1.5, head.y + 9);
    ctx.lineTo(fx + 3, head.y + 3);
    ctx.fill();
  }
  // upright 螭吻 horns
  ctx.fillStyle = F ? '#fff' : '#c8b890';
  for (const s of [0, 1]) {
    const bx = head.x - 4 - s * 9, by = head.y - hr * 0.5;
    ctx.beginPath();
    ctx.moveTo(bx + 3, by + 2);
    ctx.quadraticCurveTo(bx - 2, by - 30 - s * 5, bx + 4, by - 40 - s * 8);
    ctx.quadraticCurveTo(bx + 10, by - 22, bx + 7, by + 4);
    ctx.closePath();
    ctx.fill();
  }
  // forehead 朱砂
  if (!F) {
    ctx.fillStyle = cinnabar;
    ctx.beginPath();
    ctx.moveTo(head.x + 2, head.y - 9);
    ctx.lineTo(head.x + 7, head.y - 2);
    ctx.lineTo(head.x - 1, head.y - 2);
    ctx.closePath();
    ctx.fill();
  }
  // mane curls (stone lion)
  ctx.fillStyle = skinB;
  for (let i = 0; i < 5; i++) {
    const a = -0.6 + i * 0.45;
    const rx = head.x - 8 + Math.cos(a) * 10;
    const ry = head.y - 2 + Math.sin(a) * 8;
    ctx.beginPath();
    ctx.arc(rx, ry, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // eyes — jade or rage cinnabar
  const eyeC = o.rage ? '#ff3040' : '#40e0a0';
  if (!F) {
    drawGlow(ctx, head.x + 7, head.y - 3, 14 + (o.glow ?? 0) * 26, eyeC, 1);
    ctx.fillStyle = '#f0fff8';
    ctx.fillRect(head.x + 5, head.y - 4.5, 5, 2.2);
  }

  // BossSil2: faceMark on snout (after mane/eyes so it reads)
  if (look.faceMark && !F) {
    drawGargFaceMark(ctx, head, hr, look.faceMark);
  }

  // BossSil2: ornaments on joints
  if (look.ornaments && !F) {
    drawGargOrnaments(ctx, j, look.ornaments, silS);
  }

  limb(ctx, sh, j.fElbow, j.fHand, 13, skin);
  claws(ctx, j.fHand, j.fForeAng, claw);

  // front cloud cape
  cloudCape(ctx, { x: wingRoot.x + 12, y: wingRoot.y - 2 }, flap * 0.8, skin, soft, 0.9, 1);

  if (o.armor && !F) {
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, (hip.x + sh.x) / 2, (hip.y + sh.y) / 2, 90, '#c01828', 0.32 + Math.sin(o.time * 0.2) * 0.1);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  return j;
}
