/**
 * Core weapon appearance drawer.
 * - Legacy: parametric shape/length/三色 + whitelist sheet sprite.
 * - Look recipes: WeaponVisualPart whitelist interpreted here (no plugin Canvas/URL).
 * Used by hunter + enemy silhouette interpreters.
 */
import type { BladeShape, WeaponDef, WeaponSprite } from '../meta/weapons';
import type {
  BladeProfile, GuardStyle, HeadStyle, ResolvedWeaponLook, TipStyle,
  WeaponLookDef, WeaponVisualPart,
} from '../meta/weaponLooks';
import { isWeaponLookPartKind } from '../meta/weaponLooks';
import { getWeaponLook } from '../meta/contentRegistry';
import { getWeaponSheet, sheetFrameSize } from './weaponSheets';

export type WeaponAppearance = ResolvedWeaponLook;

export function appearanceFromWeapon(w: WeaponDef): WeaponAppearance {
  const base: WeaponAppearance = {
    shape: w.shape,
    length: w.length,
    blade: w.blade,
    trail: w.trail,
    edge: w.edge,
    sprite: w.sprite,
  };

  // Priority: inline parts → lookId catalog → legacy parametric
  const inline = w.parts?.length ? w.parts : undefined;
  const lookId = w.lookId;
  let recipe: WeaponLookDef | undefined;
  if (lookId) {
    if (/^https?:\/\//i.test(lookId) || lookId.includes('://')) {
      warnOnce(`url:${lookId}`, `lookId 禁止 URL「${lookId}」`);
    } else {
      recipe = getWeaponLook(lookId);
      if (!recipe) warnOnce(`look:${lookId}`, `lookId「${lookId}」不在兵刃外观目录，已回退`);
    }
  }

  const parts = inline ?? recipe?.parts;
  if (parts?.length) {
    base.parts = parts;
    base.lookId = lookId ?? recipe?.id;
    if (recipe?.baseShape) base.shape = recipe.baseShape;
    applyPaletteHints(base, parts);
  }
  return base;
}

function applyPaletteHints(look: WeaponAppearance, parts: WeaponVisualPart[]): void {
  for (const p of parts) {
    if (p.kind === 'palette') {
      if (p.blade) look.blade = p.blade;
      if (p.trail) look.trail = p.trail;
      if (p.edge) look.edge = p.edge;
    } else if (p.kind === 'idleTrail') {
      look.idleTrail = {
        color: p.color ?? look.trail,
        width: clamp(p.width ?? 2, 0.5, 8),
        alpha: clamp(p.alpha ?? 0.2, 0.05, 0.6),
      };
    } else if (p.kind === 'swingHint') {
      look.swingHint = {
        color: p.color ?? look.trail,
        width: clamp(p.width ?? 2.5, 0.5, 10),
      };
      if (p.color) look.trail = p.color;
    }
  }
}

const DEFAULT_LEN: Record<BladeShape, number> = {
  dagger: 28,
  sword: 44,
  axe: 48,
  spear: 58,
  twin: 36,
  greatsword: 56,
};

export function defaultLength(shape: BladeShape): number {
  return DEFAULT_LEN[shape] ?? 44;
}

const warned = new Set<string>();
function warnOnce(key: string, msg: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[weaponLook] ${msg}`);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

interface DrawState {
  blade: string;
  trail: string;
  edge: string;
  grip: string;
  metal: string;
  inkEdge?: { color: string; width: number };
  glow?: { color: string; radius: number; alpha: number };
  twin?: { dx: number; dy: number; scale: number; mirror?: boolean };
  spriteOverlay?: WeaponSprite;
  idleTrail?: { color: string; width: number; alpha: number };
  hasStructural: boolean;
}

function emptyState(look: WeaponAppearance): DrawState {
  return {
    blade: look.blade,
    trail: look.trail,
    edge: look.edge,
    grip: '#3a2a18',
    metal: '#c9a050',
    hasStructural: false,
  };
}

function collectState(parts: WeaponVisualPart[], look: WeaponAppearance): DrawState {
  const st = emptyState(look);
  for (const raw of parts) {
    const kind = (raw as { kind?: string }).kind;
    if (!kind || !isWeaponLookPartKind(kind)) {
      warnOnce(`kind:${kind}`, `未知外观部件 kind「${kind}」，已跳过`);
      continue;
    }
    const p = raw;
    switch (p.kind) {
      case 'palette':
        if (p.blade) st.blade = p.blade;
        if (p.trail) st.trail = p.trail;
        if (p.edge) st.edge = p.edge;
        if (p.grip) st.grip = p.grip;
        if (p.metal) st.metal = p.metal;
        break;
      case 'inkEdge':
        st.inkEdge = { color: p.color ?? st.edge, width: clamp(p.width ?? 0.8, 0.3, 3) };
        break;
      case 'glow':
        st.glow = {
          color: p.color ?? st.trail,
          radius: clamp(p.radius ?? 10, 2, 40),
          alpha: clamp(p.alpha ?? 0.3, 0.05, 0.8),
        };
        break;
      case 'twinOffset':
        st.twin = {
          dx: clamp(p.dx ?? -8, -40, 40),
          dy: clamp(p.dy ?? -10, -40, 40),
          scale: clamp(p.scale ?? 0.75, 0.3, 1.2),
          mirror: !!p.mirror,
        };
        break;
      case 'spriteOverlay':
        if (/^https?:\/\//i.test(p.sheetId) || p.sheetId.includes('://')) {
          warnOnce(`ov:${p.sheetId}`, `spriteOverlay.sheetId 禁止 URL`);
        } else {
          st.spriteOverlay = {
            sheetId: p.sheetId,
            frame: p.frame,
            pivot: p.pivot,
            scale: p.scale,
          };
        }
        break;
      case 'idleTrail':
        st.idleTrail = {
          color: p.color ?? st.trail,
          width: clamp(p.width ?? 2, 0.5, 8),
          alpha: clamp(p.alpha ?? 0.2, 0.05, 0.6),
        };
        break;
      case 'swingHint':
        if (p.color) st.trail = p.color;
        break;
      case 'grip':
      case 'guard':
      case 'tsuba':
      case 'pommel':
      case 'blade':
      case 'tip':
      case 'haft':
      case 'head':
      case 'chain':
      case 'tassel':
      case 'ring':
        st.hasStructural = true;
        break;
      default:
        break;
    }
  }
  return st;
}

/**
 * Draw weapon at hand along angle `ang` (tip = sin/cos of ang, same as skeleton wAng).
 * Returns a glint point near the tip.
 */
export function drawWeaponAppearance(
  ctx: CanvasRenderingContext2D,
  h: { x: number; y: number },
  ang: number,
  look: WeaponAppearance,
  flash?: boolean,
): { x: number; y: number } {
  const dx = Math.sin(ang), dy = Math.cos(ang);
  const len = look.length || defaultLength(look.shape);
  const tip = { x: h.x + dx * len, y: h.y + dy * len };
  const px = -dy, py = dx;

  // Full sprite (WeaponDef.sprite) wins when no recipe parts — soft-skip → parametric.
  const parts = look.parts;
  if ((!parts || !parts.length) && look.sprite && !flash) {
    if (tryDrawSprite(ctx, h, dx, dy, look.sprite)) {
      return { x: tip.x + px * 2, y: tip.y + py * 2 };
    }
  }

  if (parts?.length) {
    return drawFromParts(ctx, h, tip, dx, dy, px, py, len, look, parts, !!flash);
  }

  return drawLegacyParametric(ctx, h, tip, dx, dy, px, py, len, look, !!flash);
}

function tryDrawSprite(
  ctx: CanvasRenderingContext2D,
  h: { x: number; y: number },
  dx: number, dy: number,
  sp: WeaponSprite,
): boolean {
  const sheet = getWeaponSheet(sp.sheetId);
  if (!sheet) return false;
  const { w: fw, h: fh, frames } = sheetFrameSize(sp.sheetId);
  const frame = Math.max(0, Math.min(frames - 1, sp.frame ?? 0));
  const pivotX = sp.pivot?.x ?? 8;
  const pivotY = sp.pivot?.y ?? fh / 2;
  const scale = sp.scale ?? 1;
  const bladeAng = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(bladeAng);
  ctx.scale(scale, scale);
  ctx.drawImage(sheet, frame * fw, 0, fw, fh, -pivotX, -pivotY, fw, fh);
  ctx.restore();
  return true;
}

function drawFromParts(
  ctx: CanvasRenderingContext2D,
  h: { x: number; y: number },
  tip: { x: number; y: number },
  dx: number, dy: number, px: number, py: number,
  len: number,
  look: WeaponAppearance,
  parts: WeaponVisualPart[],
  flash: boolean,
): { x: number; y: number } {
  const st = collectState(parts, look);
  const blade = flash ? '#fff' : st.blade;
  const edge = flash ? '#fff' : st.edge;
  const grip = flash ? '#fff' : st.grip;
  const metal = flash ? '#fff' : st.metal;
  let glint = { x: tip.x + px * 2, y: tip.y + py * 2 };

  // Glow under
  if (st.glow && !flash) {
    const g = st.glow;
    const mid = { x: h.x + dx * (len * 0.55), y: h.y + dy * (len * 0.55) };
    const grd = ctx.createRadialGradient(mid.x, mid.y, 1, mid.x, mid.y, g.radius);
    const a = g.alpha;
    grd.addColorStop(0, hexAlpha(g.color, a));
    grd.addColorStop(1, hexAlpha(g.color, 0));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(mid.x, mid.y, g.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Idle micro trail (look layer)
  if (st.idleTrail && !flash) {
    const t = st.idleTrail;
    ctx.strokeStyle = hexAlpha(t.color, t.alpha);
    ctx.lineWidth = t.width;
    ctx.beginPath();
    ctx.moveTo(h.x + dx * 4 + px * 3, h.y + dy * 4 + py * 3);
    ctx.lineTo(tip.x - dx * 4 + px * 2, tip.y - dy * 4 + py * 2);
    ctx.stroke();
  }

  const drawBody = (ox: number, oy: number, scale: number) => {
    const hh = { x: h.x + ox, y: h.y + oy };
    const tipS = {
      x: hh.x + dx * len * scale,
      y: hh.y + dy * len * scale,
    };
    let localGlint = { x: tipS.x + px * 2, y: tipS.y + py * 2 };

    for (const raw of parts) {
      const kind = (raw as { kind?: string }).kind;
      if (!kind || !isWeaponLookPartKind(kind)) continue;
      const p = raw;

      if (p.kind === 'haft') {
        const L = (p.length ?? 12) * scale;
        const W = (p.width ?? 3.2) * scale;
        ctx.strokeStyle = flash ? '#fff' : (p.color ?? grip);
        ctx.lineWidth = W;
        ctx.beginPath();
        ctx.moveTo(hh.x - dx * L * 0.35, hh.y - dy * L * 0.35);
        ctx.lineTo(tipS.x - dx * 10 * scale, tipS.y - dy * 10 * scale);
        ctx.stroke();
      } else if (p.kind === 'grip') {
        const L = (p.length ?? 9) * scale;
        const W = (p.width ?? 3.2) * scale;
        ctx.strokeStyle = flash ? '#fff' : (p.color ?? grip);
        ctx.lineWidth = W;
        ctx.beginPath();
        ctx.moveTo(hh.x - dx * L * 0.55, hh.y - dy * L * 0.55);
        ctx.lineTo(hh.x + dx * L * 0.35, hh.y + dy * L * 0.35);
        ctx.stroke();
        const wrap = p.wrapStyle;
        if (wrap && wrap !== 'none' && !flash) {
          ctx.strokeStyle = wrap === 'silk' ? '#c8a0b0' : wrap === 'leather' ? '#5a4030' : '#8a7060';
          ctx.lineWidth = Math.max(1, W * 0.35);
          for (let i = 0; i < 3; i++) {
            const a = -0.4 + i * 0.28;
            ctx.beginPath();
            ctx.moveTo(hh.x + dx * L * a + px * W * 0.4, hh.y + dy * L * a + py * W * 0.4);
            ctx.lineTo(hh.x + dx * L * a - px * W * 0.4, hh.y + dy * L * a - py * W * 0.4);
            ctx.stroke();
          }
        }
      } else if (p.kind === 'pommel') {
        const r = (p.size ?? 3) * scale;
        ctx.fillStyle = flash ? '#fff' : (p.color ?? metal);
        const cx = hh.x - dx * (8 * scale), cy = hh.y - dy * (8 * scale);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        if (p.ring && !flash) {
          ctx.strokeStyle = metal;
          ctx.lineWidth = 1.2 * scale;
          ctx.beginPath();
          ctx.arc(cx, cy, r + 1.5 * scale, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (p.kind === 'ring') {
        const r = (p.radius ?? 4) * scale;
        const atPommel = (p.at ?? 'pommel') === 'pommel';
        const cx = atPommel ? hh.x - dx * (8 * scale) : hh.x + dx * (2 * scale);
        const cy = atPommel ? hh.y - dy * (8 * scale) : hh.y + dy * (2 * scale);
        ctx.strokeStyle = flash ? '#fff' : (p.color ?? metal);
        ctx.lineWidth = 1.4 * scale;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'guard' || p.kind === 'tsuba') {
        drawGuard(ctx, hh, dx, dy, px, py, p.style ?? (p.kind === 'tsuba' ? 'disk' : 'cross'),
          (p.width ?? (p.kind === 'tsuba' ? 10 : 11)) * scale,
          flash ? '#fff' : (p.color ?? metal),
          p.kind === 'tsuba' ? (('radius' in p ? p.radius : undefined) ?? 5) * scale : undefined);
      } else if (p.kind === 'blade') {
        const frac = clamp(p.lengthFrac ?? 1, 0.4, 1.2);
        const tipB = {
          x: hh.x + dx * len * frac * scale,
          y: hh.y + dy * len * frac * scale,
        };
        const taper = clamp(p.taper ?? 1, 0.4, 1.4);
        const w = (p.width ?? 2.2) * scale * taper;
        drawBladeProfile(ctx, hh, tipB, dx, dy, px, py, p.profile ?? profileFromShape(look.shape),
          flash ? '#fff' : (p.color ?? blade), w, p.curveAmount, p.fuller);
        localGlint = { x: tipB.x + px * 2, y: tipB.y + py * 2 };
      } else if (p.kind === 'tip') {
        drawTip(ctx, tipS, dx, dy, px, py, p.style ?? 'point',
          (p.size ?? 6) * scale, flash ? '#fff' : (p.color ?? blade));
        localGlint = { x: tipS.x + px * 2, y: tipS.y + py * 2 };
      } else if (p.kind === 'head') {
        const mid = {
          x: hh.x + dx * (len * 0.55 * scale),
          y: hh.y + dy * (len * 0.55 * scale),
        };
        localGlint = drawHead(ctx, hh, tipS, mid, dx, dy, px, py, p.style ?? 'axe',
          (p.size ?? 14) * scale, flash ? '#fff' : (p.color ?? blade), flash);
      } else if (p.kind === 'tassel') {
        drawTassel(ctx, hh, dx, dy, px, py, p.style ?? 'short',
          (p.length ?? 10) * scale, flash ? '#fff' : (p.color ?? '#a02820'), p.swayAmp);
      } else if (p.kind === 'chain') {
        drawChain(ctx, hh, dx, dy, px, py, p.style ?? 'links',
          (p.length ?? 14) * scale, flash ? '#fff' : (p.color ?? metal),
          clamp(p.links ?? 5, 2, 12), p.swayAmp);
      } else if (p.kind === 'runeInlay' && !flash) {
        const along = clamp(p.along ?? 0.45, 0.15, 0.85);
        const cx = hh.x + dx * len * along * scale;
        const cy = hh.y + dy * len * along * scale;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.fillStyle = p.color ?? edge;
        ctx.font = `${Math.max(6, 8 * scale)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.75;
        ctx.fillText((p.text ?? '刃').slice(0, 2), 0, 0);
        ctx.restore();
      }
    }

    // ink edge stroke along centerline
    if (st.inkEdge && !flash) {
      ctx.strokeStyle = st.inkEdge.color;
      ctx.lineWidth = st.inkEdge.width * scale;
      ctx.beginPath();
      ctx.moveTo(hh.x + dx * 4 * scale, hh.y + dy * 4 * scale);
      ctx.lineTo(tipS.x - dx * 6 * scale, tipS.y - dy * 6 * scale);
      ctx.stroke();
    }

    return localGlint;
  };

  // If recipe has no structural parts, fall back to shape parametric then overlays
  if (!st.hasStructural) {
    glint = drawLegacyParametric(ctx, h, tip, dx, dy, px, py, len, {
      ...look, blade, trail: st.trail, edge,
    }, flash);
  } else {
    glint = drawBody(0, 0, 1);
    if (st.twin) {
      const t = st.twin;
      const oxx = px * t.dx + dx * t.dy;
      const oyy = py * t.dx + dy * t.dy;
      drawBody(oxx, oyy, t.scale);
      if (t.mirror) {
        drawBody(-oxx, -oyy * 0.2, t.scale * 0.92);
      }
    }
  }

  // sprite overlay on top of procedural
  if (st.spriteOverlay && !flash) {
    tryDrawSprite(ctx, h, dx, dy, st.spriteOverlay);
  } else if (look.sprite && !flash && st.hasStructural) {
    // WeaponDef.sprite as soft overlay when recipe present but no explicit overlay
    // Only if recipe didn't already draw full sprite path — here procedural was drawn.
  }

  return glint;
}

function profileFromShape(shape: BladeShape): BladeProfile {
  switch (shape) {
    case 'dagger': return 'needle';
    case 'greatsword': return 'broad';
    case 'twin': return 'curved';
    case 'spear': return 'needle';
    case 'axe': return 'leaf';
    default: return 'straight';
  }
}

function drawBladeProfile(
  ctx: CanvasRenderingContext2D,
  h: { x: number; y: number },
  tip: { x: number; y: number },
  dx: number, dy: number, px: number, py: number,
  profile: BladeProfile,
  color: string,
  width: number,
  curveAmount?: number,
  fuller?: number,
): void {
  ctx.fillStyle = color;
  const w = width;
  const curve = curveAmount == null ? 1 : Math.max(0, Math.min(2, curveAmount));
  if (profile === 'curved' || profile === 'leaf') {
    const mid = { x: (h.x + tip.x) / 2, y: (h.y + tip.y) / 2 };
    const bulge = (profile === 'leaf' ? w * 2.2 : w * 1.6) * curve;
    ctx.beginPath();
    ctx.moveTo(h.x + px * w * 0.6, h.y + py * w * 0.6);
    ctx.quadraticCurveTo(mid.x + px * bulge, mid.y + py * bulge, tip.x, tip.y);
    ctx.quadraticCurveTo(mid.x - px * (bulge * 0.55), mid.y - py * (bulge * 0.55),
      h.x - px * w * 0.6, h.y - py * w * 0.6);
    ctx.closePath();
    ctx.fill();
  } else if (profile === 'needle' || profile === 'dagger') {
    ctx.beginPath();
    ctx.moveTo(h.x + px * w * 0.7, h.y + py * w * 0.7);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(h.x - px * w * 0.7, h.y - py * w * 0.7);
    ctx.closePath();
    ctx.fill();
  } else if (profile === 'broad' || profile === 'greatsword') {
    ctx.beginPath();
    ctx.moveTo(h.x + px * w * 1.4, h.y + py * w * 1.4);
    ctx.lineTo(tip.x + px * 0.4, tip.y + py * 0.4);
    ctx.lineTo(tip.x - px * 0.4, tip.y - py * 0.4);
    ctx.lineTo(h.x - px * w * 1.4, h.y - py * w * 1.4);
    ctx.closePath();
    ctx.fill();
  } else if (profile === 'axe' || profile === 'spear' || profile === 'twin' || profile === 'sword') {
    // Treat WeaponDef-shape aliases as straight-ish silhouettes
    ctx.beginPath();
    ctx.moveTo(h.x + px * w, h.y + py * w);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(h.x - px * w, h.y - py * w);
    ctx.closePath();
    ctx.fill();
  } else {
    // straight / default
    ctx.beginPath();
    ctx.moveTo(h.x + px * w, h.y + py * w);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(h.x - px * w, h.y - py * w);
    ctx.closePath();
    ctx.fill();
  }
  if (fuller && fuller > 0.05) {
    const f = Math.max(0, Math.min(1, fuller));
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = Math.max(0.6, w * 0.35 * f);
    ctx.beginPath();
    ctx.moveTo(h.x + dx * 4, h.y + dy * 4);
    ctx.lineTo(tip.x - dx * 8, tip.y - dy * 8);
    ctx.stroke();
  }
  void dx; void dy;
}

function drawGuard(
  ctx: CanvasRenderingContext2D,
  h: { x: number; y: number },
  dx: number, dy: number, px: number, py: number,
  style: GuardStyle,
  width: number,
  color: string,
  diskR?: number,
): void {
  if (style === 'none') return;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  if (style === 'disk') {
    const r = diskR ?? width * 0.45;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(h.x + dx * 1, h.y + dy * 1, r, 0, Math.PI * 2);
    ctx.stroke();
  } else if (style === 'wing') {
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(h.x + px * width * 0.55, h.y + py * width * 0.55);
    ctx.quadraticCurveTo(h.x + px * width + dx * 4, h.y + py * width + dy * 4,
      h.x + px * (width * 0.3) + dx * 6, h.y + py * (width * 0.3) + dy * 6);
    ctx.moveTo(h.x - px * width * 0.55, h.y - py * width * 0.55);
    ctx.quadraticCurveTo(h.x - px * width + dx * 4, h.y - py * width + dy * 4,
      h.x - px * (width * 0.3) + dx * 6, h.y - py * (width * 0.3) + dy * 6);
    ctx.stroke();
  } else {
    // cross
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(h.x + px * (width * 0.5), h.y + py * (width * 0.5));
    ctx.lineTo(h.x - px * (width * 0.5), h.y - py * (width * 0.5));
    ctx.stroke();
  }
}

function drawTip(
  ctx: CanvasRenderingContext2D,
  tip: { x: number; y: number },
  dx: number, dy: number, px: number, py: number,
  style: TipStyle,
  size: number,
  color: string,
): void {
  ctx.fillStyle = color;
  if (style === 'blunt') {
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'chisel') {
    ctx.beginPath();
    ctx.moveTo(tip.x + px * size * 0.35, tip.y + py * size * 0.35);
    ctx.lineTo(tip.x + dx * size * 0.35, tip.y + dy * size * 0.35);
    ctx.lineTo(tip.x - px * size * 0.35, tip.y - py * size * 0.35);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'hook') {
    ctx.beginPath();
    ctx.moveTo(tip.x - dx * size * 0.4, tip.y - dy * size * 0.4);
    ctx.quadraticCurveTo(
      tip.x + px * size * 0.8, tip.y + py * size * 0.8,
      tip.x + dx * size * 0.2 + px * size * 0.3, tip.y + dy * size * 0.2 + py * size * 0.3,
    );
    ctx.lineTo(tip.x - px * size * 0.2, tip.y - py * size * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'fork') {
    ctx.beginPath();
    ctx.moveTo(tip.x + px * size * 0.35, tip.y + py * size * 0.35);
    ctx.lineTo(tip.x + dx * size * 0.5 + px * size * 0.2, tip.y + dy * size * 0.5 + py * size * 0.2);
    ctx.lineTo(tip.x - dx * size * 0.1, tip.y - dy * size * 0.1);
    ctx.lineTo(tip.x + dx * size * 0.5 - px * size * 0.2, tip.y + dy * size * 0.5 - py * size * 0.2);
    ctx.lineTo(tip.x - px * size * 0.35, tip.y - py * size * 0.35);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(tip.x - dx * size * 0.5 + px * size * 0.45, tip.y - dy * size * 0.5 + py * size * 0.45);
    ctx.quadraticCurveTo(tip.x + px * size * 0.2, tip.y + py * size * 0.2, tip.x + dx * size * 0.2, tip.y + dy * size * 0.2);
    ctx.quadraticCurveTo(tip.x - px * size * 0.2, tip.y - py * size * 0.2,
      tip.x - dx * size * 0.5 - px * size * 0.45, tip.y - dy * size * 0.5 - py * size * 0.45);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'barbed') {
    ctx.beginPath();
    ctx.moveTo(tip.x + dx * size * 0.2, tip.y + dy * size * 0.2);
    ctx.lineTo(tip.x - dx * size * 0.3 + px * size * 0.5, tip.y - dy * size * 0.3 + py * size * 0.5);
    ctx.lineTo(tip.x - dx * size * 0.1 + px * size * 0.15, tip.y - dy * size * 0.1 + py * size * 0.15);
    ctx.lineTo(tip.x - dx * size * 0.55 + px * size * 0.25, tip.y - dy * size * 0.55 + py * size * 0.25);
    ctx.lineTo(tip.x - dx * size * 0.55 - px * size * 0.25, tip.y - dy * size * 0.55 - py * size * 0.25);
    ctx.lineTo(tip.x - dx * size * 0.1 - px * size * 0.15, tip.y - dy * size * 0.1 - py * size * 0.15);
    ctx.lineTo(tip.x - dx * size * 0.3 - px * size * 0.5, tip.y - dy * size * 0.3 - py * size * 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'crescent') {
    ctx.beginPath();
    ctx.moveTo(tip.x - dx * size * 0.2, tip.y - dy * size * 0.2);
    ctx.quadraticCurveTo(tip.x + px * size * 0.9, tip.y + py * size * 0.9, tip.x + dx * size * 0.35, tip.y + dy * size * 0.35);
    ctx.quadraticCurveTo(tip.x + px * size * 0.25, tip.y + py * size * 0.25, tip.x - dx * size * 0.15, tip.y - dy * size * 0.15);
    ctx.closePath();
    ctx.fill();
  } else {
    // point
    ctx.beginPath();
    ctx.moveTo(tip.x + dx * size * 0.15, tip.y + dy * size * 0.15);
    ctx.lineTo(tip.x - dx * size * 0.55 + px * size * 0.35, tip.y - dy * size * 0.55 + py * size * 0.35);
    ctx.lineTo(tip.x - dx * size * 0.55 - px * size * 0.35, tip.y - dy * size * 0.55 - py * size * 0.35);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  h: { x: number; y: number },
  tip: { x: number; y: number },
  mid: { x: number; y: number },
  dx: number, dy: number, px: number, py: number,
  style: HeadStyle,
  size: number,
  color: string,
  flash: boolean,
): { x: number; y: number } {
  ctx.fillStyle = color;
  if (style === 'hammer') {
    const hw = size * 0.55, hh = size * 0.4;
    ctx.beginPath();
    ctx.moveTo(mid.x + px * hw - dx * hh, mid.y + py * hw - dy * hh);
    ctx.lineTo(mid.x + px * hw + dx * hh, mid.y + py * hw + dy * hh);
    ctx.lineTo(mid.x - px * hw + dx * hh, mid.y - py * hw + dy * hh);
    ctx.lineTo(mid.x - px * hw - dx * hh, mid.y - py * hw - dy * hh);
    ctx.closePath();
    ctx.fill();
    return { x: mid.x + px * hw, y: mid.y + py * hw };
  }
  if (style === 'spear') {
    const base = { x: tip.x - dx * size, y: tip.y - dy * size };
    ctx.beginPath();
    ctx.moveTo(tip.x + dx * 2, tip.y + dy * 2);
    ctx.lineTo(base.x + px * size * 0.4, base.y + py * size * 0.4);
    ctx.lineTo(base.x - dx * 2, base.y - dy * 2);
    ctx.lineTo(base.x - px * size * 0.4, base.y - py * size * 0.4);
    ctx.closePath();
    ctx.fill();
    return { x: tip.x + px * 2, y: tip.y + py * 2 };
  }
  if (style === 'halberd' || style === 'crescent') {
    ctx.beginPath();
    ctx.moveTo(mid.x - dx * 4, mid.y - dy * 4);
    ctx.quadraticCurveTo(
      mid.x + px * size + dx * 4, mid.y + py * size + dy * 4,
      mid.x + px * (size * 0.7) + dx * (size * 0.7), mid.y + py * (size * 0.7) + dy * (size * 0.7),
    );
    ctx.quadraticCurveTo(
      mid.x + px * (size * 0.35) - dx * 2, mid.y + py * (size * 0.35) - dy * 2,
      mid.x - dx * 8, mid.y - dy * 8,
    );
    ctx.closePath();
    ctx.fill();
    // small spear tip
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - dx * 8 + px * 3, tip.y - dy * 8 + py * 3);
    ctx.lineTo(tip.x - dx * 6, tip.y - dy * 6);
    ctx.lineTo(tip.x - dx * 8 - px * 3, tip.y - dy * 8 - py * 3);
    ctx.closePath();
    ctx.fill();
    return { x: mid.x + px * (size * 0.6), y: mid.y + py * (size * 0.6) };
  }
  // axe default
  ctx.beginPath();
  ctx.moveTo(mid.x - dx * 4, mid.y - dy * 4);
  ctx.quadraticCurveTo(
    mid.x + px * (size * 1.2) + dx * 6, mid.y + py * (size * 1.2) + dy * 6,
    mid.x + px * size + dx * (size * 0.9), mid.y + py * size + dy * (size * 0.9),
  );
  ctx.quadraticCurveTo(
    mid.x + px * (size * 0.55) - dx * 2, mid.y + py * (size * 0.55) - dy * 2,
    mid.x + px * (size * 0.9) - dx * (size * 0.8), mid.y + py * (size * 0.9) - dy * (size * 0.8),
  );
  ctx.quadraticCurveTo(
    mid.x + px * (size * 0.75) - dx * 4, mid.y + py * (size * 0.75) - dy * 4,
    mid.x - dx * 10, mid.y - dy * 10,
  );
  ctx.closePath();
  ctx.fill();
  void h; void flash;
  return { x: mid.x + px * (size * 0.7), y: mid.y + py * (size * 0.7) };
}

function drawTassel(
  ctx: CanvasRenderingContext2D,
  h: { x: number; y: number },
  dx: number, dy: number, px: number, py: number,
  style: 'short' | 'long' | 'knot',
  length: number,
  color: string,
  swayAmp?: number,
): void {
  const root = { x: h.x - dx * 2 - px * 3, y: h.y - dy * 2 - py * 3 };
  const n = style === 'long' ? 4 : style === 'knot' ? 2 : 3;
  const len = style === 'long' ? length * 1.35 : length;
  const sway = (swayAmp ?? 1) * 2.2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * 1.6;
    ctx.beginPath();
    ctx.moveTo(root.x + px * off, root.y + py * off);
    ctx.quadraticCurveTo(
      root.x - dx * (len * 0.45) + px * (off * 1.4 + sway),
      root.y - dy * (len * 0.45) + py * (off * 1.4),
      root.x - dx * len + px * (off * 0.6 + sway * 0.5),
      root.y - dy * len + py * (off * 0.6),
    );
    ctx.stroke();
  }
  if (style === 'knot') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(root.x, root.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChain(
  ctx: CanvasRenderingContext2D,
  h: { x: number; y: number },
  dx: number, dy: number, px: number, py: number,
  style: 'links' | 'line',
  length: number,
  color: string,
  links: number,
  swayAmp?: number,
): void {
  const root = { x: h.x - dx * 6, y: h.y - dy * 6 };
  const sway = swayAmp ?? 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  if (style === 'line') {
    ctx.beginPath();
    ctx.moveTo(root.x, root.y);
    ctx.lineTo(root.x - dx * length - px * 4 * sway, root.y - dy * length - py * 4);
    ctx.stroke();
    return;
  }
  const step = length / links;
  for (let i = 0; i < links; i++) {
    const t0 = i * step, t1 = (i + 0.7) * step;
    const side = (i % 2 === 0 ? 1.5 : -1.5) * sway;
    const x0 = root.x - dx * t0 - px * side;
    const y0 = root.y - dy * t0 - py * side;
    const x1 = root.x - dx * t1 - px * side;
    const y1 = root.y - dy * t1 - py * side;
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, step * 0.35, 1.6, Math.atan2(dy, dx), 0, Math.PI * 2);
    ctx.stroke();
  }
}

function hexAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    const r = parseInt(h[0]! + h[0]!, 16);
    const g = parseInt(h[1]! + h[1]!, 16);
    const b = parseInt(h[2]! + h[2]!, 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  if (h.length >= 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  return hex;
}

function drawLegacyParametric(
  ctx: CanvasRenderingContext2D,
  h: { x: number; y: number },
  tip: { x: number; y: number },
  dx: number, dy: number, px: number, py: number,
  len: number,
  look: WeaponAppearance,
  flash: boolean,
): { x: number; y: number } {
  const blade = flash ? '#fff' : look.blade;
  const edge = flash ? '#fff' : look.edge;
  const shape = look.shape;

  if (shape === 'spear') {
    const butt = { x: h.x - dx * 10, y: h.y - dy * 10 };
    ctx.strokeStyle = flash ? '#fff' : '#2a2218';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(butt.x, butt.y);
    ctx.lineTo(tip.x - dx * 10, tip.y - dy * 10);
    ctx.stroke();
    if (!flash) {
      ctx.strokeStyle = '#5a4030';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(h.x - dx * 2, h.y - dy * 2);
      ctx.lineTo(h.x + dx * 6, h.y + dy * 6);
      ctx.stroke();
    }
    const base = { x: tip.x - dx * 12, y: tip.y - dy * 12 };
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(tip.x + dx * 2, tip.y + dy * 2);
    ctx.lineTo(base.x + px * 5, base.y + py * 5);
    ctx.lineTo(base.x - dx * 2, base.y - dy * 2);
    ctx.lineTo(base.x - px * 5, base.y - py * 5);
    ctx.closePath();
    ctx.fill();
    if (!flash) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(tip.x + dx, tip.y + dy);
      ctx.stroke();
    }
    return { x: tip.x + px * 2, y: tip.y + py * 2 };
  }

  if (shape === 'axe') {
    const mid = { x: h.x + dx * (len * 0.55), y: h.y + dy * (len * 0.55) };
    ctx.strokeStyle = flash ? '#fff' : '#5a3e2a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(h.x - dx * 4, h.y - dy * 4);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(mid.x - dx * 4, mid.y - dy * 4);
    ctx.quadraticCurveTo(
      mid.x + px * 22 + dx * 6, mid.y + py * 22 + dy * 6,
      mid.x + px * 18 + dx * 16, mid.y + py * 18 + dy * 16,
    );
    ctx.quadraticCurveTo(
      mid.x + px * 10 - dx * 2, mid.y + py * 10 - dy * 2,
      mid.x + px * 16 - dx * 14, mid.y + py * 16 - dy * 14,
    );
    ctx.quadraticCurveTo(
      mid.x + px * 14 - dx * 4, mid.y + py * 14 - dy * 4,
      mid.x - dx * 10, mid.y - dy * 10,
    );
    ctx.closePath();
    ctx.fill();
    return { x: mid.x + px * 14, y: mid.y + py * 14 };
  }

  if (shape === 'dagger') {
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(h.x + px * 1.6, h.y + py * 1.6);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(h.x - px * 1.6, h.y - py * 1.6);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'twin') {
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(h.x + px * 1.8, h.y + py * 1.8);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(h.x - px * 1.8, h.y - py * 1.8);
    ctx.closePath();
    ctx.fill();
    const ox = h.x - dx * 8 - px * 10, oy = h.y - dy * 8 - py * 10;
    ctx.beginPath();
    ctx.moveTo(ox + px * 1.2, oy + py * 1.2);
    ctx.lineTo(ox + dx * 18, oy + dy * 18);
    ctx.lineTo(ox - px * 1.2, oy - py * 1.2);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'greatsword') {
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(h.x + px * 3.4, h.y + py * 3.4);
    ctx.lineTo(tip.x + px * 0.5, tip.y + py * 0.5);
    ctx.lineTo(tip.x - px * 0.5, tip.y - py * 0.5);
    ctx.lineTo(h.x - px * 3.4, h.y - py * 3.4);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.strokeStyle = flash ? '#fff' : '#3a2a18';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(h.x - dx * 6, h.y - dy * 6);
    ctx.lineTo(tip.x - dx * 6, tip.y - dy * 6);
    ctx.stroke();
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(h.x + px * 2.2, h.y + py * 2.2);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(h.x - px * 2.2, h.y - py * 2.2);
    ctx.closePath();
    ctx.fill();
  }

  if (!flash) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(h.x + dx * 4, h.y + dy * 4);
    ctx.lineTo(tip.x - dx * 6, tip.y - dy * 6);
    ctx.stroke();
  }
  return { x: tip.x + px * 2, y: tip.y + py * 2 };
}
