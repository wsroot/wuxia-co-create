import { drawGlow } from '../effects/glow';
import type { V } from '../engine/math';
import { limb, solve, type Dims, type Joints, type Pose } from './rig';
import type { SilhouetteDef, SilhouettePart } from '../meta/bTier/types';
import {
  drawWeaponAppearance,
  type WeaponAppearance,
} from './drawWeaponAppearance';

export type SkelKind = 'axe' | 'shield' | 'archer' | 'spear';

export const SKEL_DIMS: Dims = { thigh: 18, shin: 19, torso: 24, neck: 5, headR: 8.2, upper: 14, fore: 14, weapon: 44 };

export interface SkelOpts {
  kind: SkelKind;
  flash?: boolean;
  glint?: number;
  draw?: number;
  eye?: string;
  time: number;
  /** Catalog silhouette (parts interpreter). Absent / no parts → legacy kind look. */
  silhouette?: SilhouetteDef | null;
  /** Resolved mainhand look (gear WeaponDef or silhouette mainhand). */
  weaponLook?: WeaponAppearance | null;
}

const partWarn = new Set<string>();
function warnPart(key: string, msg: string): void {
  if (partWarn.has(key)) return;
  partWarn.add(key);
  console.warn(`[silhouette] ${msg}`);
}

/** Fully clothed Jianghu fighters (gameplay kinds unchanged). */
export function drawSkeleton(ctx: CanvasRenderingContext2D, pose: Pose, o: SkelOpts): Joints {
  const sil = o.silhouette ?? null;
  const parts = sil?.parts;
  const useParts = !!(parts && parts.length);
  const visualKind = resolveVisualKind(o.kind, sil);
  const parsed = useParts ? parseParts(parts!, sil!.id) : null;
  const scaleMul = parsed?.scale ?? 1;

  const dims = scaleMul !== 1
    ? {
        thigh: SKEL_DIMS.thigh * scaleMul,
        shin: SKEL_DIMS.shin * scaleMul,
        torso: SKEL_DIMS.torso * scaleMul,
        neck: SKEL_DIMS.neck * scaleMul,
        headR: SKEL_DIMS.headR * scaleMul,
        upper: SKEL_DIMS.upper * scaleMul,
        fore: SKEL_DIMS.fore * scaleMul,
        weapon: SKEL_DIMS.weapon * scaleMul,
      }
    : SKEL_DIMS;
  const j = solve(pose, dims);
  const F = !!o.flash;
  const flutter = Math.sin(o.time * 0.18) * 2;
  const cloakSway = (parsed?.cloak?.sway ?? 1) * flutter;
  ctx.save();
  if (parsed?.stance) {
    const lean = parsed.stance.lean * 6;
    const crouch = parsed.stance.crouch * 10;
    ctx.translate(lean, crouch);
  }
  if (pose.rot) {
    ctx.translate(j.hip.x, j.hip.y);
    ctx.rotate(pose.rot);
    ctx.translate(-j.hip.x, -j.hip.y);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const { hip, sh, head } = j;
  const ux = sh.x - hip.x, uy = sh.y - hip.y;
  const ul = Math.hypot(ux, uy) || 1;
  const nx = -uy / ul, ny = ux / ul;

  let pal = palette(visualKind, F);
  if (parsed?.palette && !F) pal = { ...pal, ...parsed.palette };

  // back cloak / robe flap (cloak part can suppress / restyle)
  const cloakStyle = parsed?.cloak?.style ?? 'long';
  if (cloakStyle !== 'none') {
    const cf = cloakStyle === 'short' ? 0.55 : cloakStyle === 'ragged' ? 1.15 : 1;
    const cs = cloakSway * (cloakStyle === 'ragged' ? 1.4 : 1);
    ctx.fillStyle = (!F && parsed?.cloak?.color) ? parsed.cloak.color : pal.cloak;
    ctx.beginPath();
    ctx.moveTo(sh.x + 3, sh.y - 2);
    ctx.quadraticCurveTo(sh.x - 14, sh.y + 8, sh.x - 20 * cf, hip.y + 18 * cf + cs);
    ctx.lineTo(sh.x - 6, hip.y + 12 * cf);
    if (cloakStyle === 'ragged') {
      ctx.lineTo(sh.x - 12, hip.y + 16 + cs);
      ctx.lineTo(sh.x - 8, hip.y + 20 + cs * 0.5);
      ctx.lineTo(sh.x - 14, hip.y + 24 + cs);
    } else {
      ctx.lineTo(sh.x - 10, hip.y + 22 * cf + cs * 0.6);
    }
    ctx.lineTo(hip.x + 2, hip.y - 2);
    ctx.closePath();
    ctx.fill();
  }

  // back limbs
  limb(ctx, sh, j.bElbow, j.bHand, 5.2, pal.armB);
  limb(ctx, hip, j.bKnee, j.bFoot, 6, pal.legB);
  boot(ctx, j.bKnee, j.bFoot, pal.boot);

  // torso robe
  ctx.fillStyle = pal.coat;
  ctx.beginPath();
  ctx.moveTo(sh.x + nx * 9, sh.y + ny * 9);
  ctx.lineTo(sh.x - nx * 8, sh.y - ny * 8);
  ctx.lineTo(hip.x - nx * 8, hip.y - ny * 8);
  ctx.lineTo(hip.x + nx * 8, hip.y + ny * 8);
  ctx.closePath();
  ctx.fill();
  // skirt
  ctx.beginPath();
  ctx.moveTo(hip.x + nx * 8, hip.y + ny * 8);
  ctx.lineTo((hip.x + j.fKnee.x) / 2 + 5, (hip.y + j.fKnee.y) / 2 + 8);
  ctx.lineTo(hip.x - 2, hip.y + 18);
  ctx.lineTo(hip.x - 14, hip.y + 16 + flutter);
  ctx.lineTo(hip.x - nx * 8, hip.y - ny * 8);
  ctx.closePath();
  ctx.fill();
  // sash
  if (!F) {
    ctx.strokeStyle = pal.sash;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hip.x + nx * 8 + ux * 0.08, hip.y + ny * 8 + uy * 0.08);
    ctx.lineTo(hip.x - nx * 8 + ux * 0.08, hip.y - ny * 8 + uy * 0.08);
    ctx.stroke();
  }
  // armorLayer overlays
  if (parsed?.armor && !F) {
    for (const a of parsed.armor) {
      const col = a.color ?? (a.style === 'plate' ? '#6a7080' : a.style === 'cloth' ? pal.coat : '#4a4050');
      ctx.fillStyle = col;
      ctx.globalAlpha = a.style === 'plate' ? 0.55 : 0.35;
      if (a.slot === 'chest') {
        ctx.beginPath();
        ctx.moveTo(sh.x + nx * 7, sh.y + ny * 7);
        ctx.lineTo(sh.x - nx * 6, sh.y - ny * 6);
        ctx.lineTo(hip.x - nx * 5, hip.y - ny * 5 - 4);
        ctx.lineTo(hip.x + nx * 5, hip.y + ny * 5 - 4);
        ctx.closePath();
        ctx.fill();
      } else if (a.slot === 'shoulder') {
        ctx.beginPath();
        ctx.ellipse(sh.x + nx * 10, sh.y + 2, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sh.x - nx * 9, sh.y + 2, 6, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (a.slot === 'skirt') {
        ctx.beginPath();
        ctx.moveTo(hip.x + nx * 7, hip.y);
        ctx.lineTo(hip.x + nx * 10, hip.y + 16);
        ctx.lineTo(hip.x - nx * 10, hip.y + 16);
        ctx.lineTo(hip.x - nx * 7, hip.y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  // ornaments
  if (parsed?.ornaments && !F) {
    for (const orn of parsed.ornaments) {
      const col = orn.color ?? '#c8a060';
      ctx.fillStyle = col;
      ctx.strokeStyle = col;
      if (orn.slot === 'waist') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hip.x, hip.y + 2);
        ctx.lineTo(hip.x - 4, hip.y + 14 + cloakSway * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(hip.x - 4, hip.y + 16 + cloakSway * 0.3, orn.style === 'bell' ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (orn.slot === 'neck') {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(head.x, head.y + 10, 5, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else if (orn.slot === 'back') {
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(sh.x - 8, sh.y + 4);
        ctx.quadraticCurveTo(sh.x - 22, sh.y + 20, sh.x - 18, hip.y + 10 + cloakSway);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (orn.slot === 'ear') {
        ctx.beginPath();
        ctx.arc(head.x + 7, head.y - 1, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 交领
  if (!F) {
    ctx.strokeStyle = pal.collar;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sh.x - nx * 2, sh.y + 2);
    ctx.lineTo(hip.x + nx * 1 + ux * 0.4, hip.y + uy * 0.4);
    ctx.moveTo(sh.x + nx * 3, sh.y + 1);
    ctx.lineTo(hip.x - nx * 1 + ux * 0.45, hip.y + uy * 0.45);
    ctx.stroke();
  }

  // front leg
  limb(ctx, hip, j.fKnee, j.fFoot, 6.4, pal.leg);
  boot(ctx, j.fKnee, j.fFoot, pal.boot);

  // head — flesh, not skull
  const hr = dims.headR;
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.arc(head.x + 1.2, head.y + 1, hr * 0.88, 0, Math.PI * 2);
  ctx.fill();
  if (!F) {
    // hair / headgear
    drawHeadgear(ctx, head, hr, visualKind, pal, parsed?.headgear);
    // eye glint
    const eye = o.eye ?? pal.eye;
    ctx.fillStyle = eye;
    ctx.fillRect(head.x + 4.2, head.y, 2.4, 1.4);
    if (o.glint && o.glint > 0.2) drawGlow(ctx, head.x + 5, head.y + 0.5, 6 + o.glint * 8, eye, 0.7);
    // faceMark
    const fm = parsed?.faceMark;
    if (fm && fm.style && fm.style !== 'none') {
      const fc = fm.color ?? '#3a3038';
      ctx.strokeStyle = fc;
      ctx.fillStyle = fc;
      if (fm.style === 'scar') {
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(head.x + 2, head.y - 3);
        ctx.lineTo(head.x + 6, head.y + 4);
        ctx.stroke();
      } else if (fm.style === 'mask') {
        ctx.globalAlpha = 0.75;
        ctx.fillRect(head.x - 2, head.y - 1, 10, 5);
        ctx.globalAlpha = 1;
      } else if (fm.style === 'veil') {
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(head.x - 4, head.y + 2);
        ctx.quadraticCurveTo(head.x + 2, head.y + 10, head.x + 8, head.y + 4);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(head.x + 1.2, head.y + 1, hr * 0.88, 0, Math.PI * 2);
    ctx.fill();
  }

  // off-hand (legacy shield short blade, or part override)
  const offStyle = parsed?.offhand ?? (visualKind === 'shield' ? 'blade' : undefined);
  if (offStyle === 'blade') {
    drawOffhandBlade(ctx, j, F);
  } else if (offStyle === 'shield') {
    // drawn after front hand as round shield when used as offhand prop
  }

  // front arm + main weapon
  const h = j.fHand;
  let glintAt: V = j.tip;
  const look = o.weaponLook ?? null;
  const interpretMain = !!(look || useParts);

  if (interpretMain && look) {
    glintAt = drawWeaponAppearance(ctx, h, j.wAng, look, F);
  } else if (interpretMain && !look) {
    // parts present but no resolved look → body-default procedural
    if (visualKind === 'axe') glintAt = drawPudao(ctx, h, j.wAng, F);
    else if (visualKind === 'archer') glintAt = drawBow(ctx, h, j, o.draw ?? 0, F);
    else if (visualKind === 'spear') glintAt = drawSpear(ctx, h, j.wAng, F);
  } else {
    // legacy: no parts → kind-hardcoded
    if (o.kind === 'axe') glintAt = drawPudao(ctx, h, j.wAng, F);
    else if (o.kind === 'archer') glintAt = drawBow(ctx, h, j, o.draw ?? 0, F);
    else if (o.kind === 'spear') glintAt = drawSpear(ctx, h, j.wAng, F);
  }
  limb(ctx, sh, j.fElbow, j.fHand, 5.4, pal.arm);
  // hand
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.arc(h.x, h.y, 3, 0, Math.PI * 2);
  ctx.fill();

  // Round shield on front hand: legacy shield kind, or offhand:'shield'
  const drawFrontShield =
    offStyle === 'shield' ||
    (!look && (useParts ? visualKind === 'shield' && offStyle !== 'none' && offStyle !== 'blade' : o.kind === 'shield'));
  if (drawFrontShield) {
    glintAt = drawRoundShield(ctx, h, pose.lean, F);
  }

  if (o.glint && o.glint > 0) {
    const g = o.glint;
    drawGlow(ctx, glintAt.x, glintAt.y, 24 * g + 6, '#e04050', 0.85);
    ctx.strokeStyle = `rgba(255,240,220,${g})`;
    ctx.lineWidth = 1.4;
    const s = 14 * g + 4;
    ctx.beginPath();
    ctx.moveTo(glintAt.x - s, glintAt.y); ctx.lineTo(glintAt.x + s, glintAt.y);
    ctx.moveTo(glintAt.x, glintAt.y - s); ctx.lineTo(glintAt.x, glintAt.y + s);
    ctx.stroke();
  }
  ctx.restore();
  return j;
}

function palette(kind: SkelKind, F: boolean) {
  if (F) {
    const w = '#ffffff';
    return { cloak: w, coat: w, arm: w, armB: w, leg: w, legB: w, boot: w, skin: w, sash: w, collar: w, eye: w };
  }
  if (kind === 'shield') {
    return {
      cloak: '#2a2430', coat: '#3a3040', arm: '#4a3848', armB: '#342838',
      leg: '#2e2834', legB: '#241e28', boot: '#1a1418', skin: '#d8c8b0',
      sash: '#8a2030', collar: '#1a1018', eye: '#c03040',
    };
  }
  if (kind === 'archer') {
    return {
      cloak: '#121820', coat: '#1a2430', arm: '#243040', armB: '#182028',
      leg: '#1a222c', legB: '#121820', boot: '#0a0e14', skin: '#c8b8a8',
      sash: '#305060', collar: '#0a1018', eye: '#50a0c0',
    };
  }
  if (kind === 'spear') {
    return {
      cloak: '#141820', coat: '#1c2430', arm: '#2a3440', armB: '#1a222c',
      leg: '#182028', legB: '#121820', boot: '#0a0e12', skin: '#d0c0a8',
      sash: '#6a3040', collar: '#0c1018', eye: '#c07040',
    };
  }
  // axe / bandit
  return {
    cloak: '#2a1810', coat: '#3a2818', arm: '#4a3420', armB: '#302418',
    leg: '#2e2218', legB: '#241810', boot: '#140e0a', skin: '#e0c8a8',
    sash: '#a02820', collar: '#1a1008', eye: '#e05030',
  };
}

function boot(ctx: CanvasRenderingContext2D, knee: V, foot: V, col: string): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(knee.x + (foot.x - knee.x) * 0.5, knee.y + (foot.y - knee.y) * 0.5);
  ctx.lineTo(foot.x, foot.y);
  ctx.lineTo(foot.x + 5, foot.y);
  ctx.stroke();
}

function drawHeadgear(
  ctx: CanvasRenderingContext2D, head: V, hr: number, kind: SkelKind,
  pal: ReturnType<typeof palette>,
  style?: 'bandit' | 'hat' | 'topknot' | 'hood' | 'none',
): void {
  if (style === 'none') return;
  const eff: SkelKind =
    style === 'bandit' ? 'axe' :
    style === 'hat' ? 'shield' :
    style === 'topknot' ? 'spear' :
    style === 'hood' ? 'archer' :
    kind;
  if (eff === 'axe') {
    // messy bandit hair + headband
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.arc(head.x, head.y - 1, hr + 0.5, Math.PI * 1.05, Math.PI * 1.95);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8a2030';
    ctx.fillRect(head.x - hr - 1, head.y - 2, hr * 2 + 2, 2.4);
    // facial stubble hint
    ctx.fillStyle = 'rgba(60,40,20,0.35)';
    ctx.fillRect(head.x + 2, head.y + 4, 5, 3);
  } else if (eff === 'shield') {
    // tattered bamboo hat
    ctx.fillStyle = '#4a3820';
    ctx.beginPath();
    ctx.ellipse(head.x, head.y - 6, hr + 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a18';
    ctx.beginPath();
    ctx.arc(head.x, head.y - 8, hr * 0.7, Math.PI, 0);
    ctx.fill();
    // broken brim scrap
    ctx.fillStyle = '#5a4030';
    ctx.beginPath();
    ctx.moveTo(head.x + hr + 2, head.y - 6);
    ctx.lineTo(head.x + hr + 14, head.y - 2);
    ctx.lineTo(head.x + hr + 4, head.y - 1);
    ctx.fill();
  } else if (eff === 'spear') {
    // tight topknot + iron brow-band (枪兵)
    ctx.fillStyle = '#0e1218';
    ctx.beginPath();
    ctx.arc(head.x - 1, head.y - 4, hr * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a4550';
    ctx.fillRect(head.x - hr - 0.5, head.y - 3, hr * 2 + 1, 2.2);
    // short rear cloth flap
    ctx.fillStyle = '#1a2030';
    ctx.beginPath();
    ctx.moveTo(head.x - hr + 1, head.y);
    ctx.quadraticCurveTo(head.x - hr - 6, head.y + 6, head.x - hr - 2, head.y + 12);
    ctx.lineTo(head.x - 2, head.y + 4);
    ctx.closePath();
    ctx.fill();
  } else {
    // 蒙面巾 + hood
    ctx.fillStyle = '#121820';
    ctx.beginPath();
    ctx.moveTo(head.x + 8, head.y - 3);
    ctx.quadraticCurveTo(head.x + 2, head.y - 14, head.x - 9, head.y - 8);
    ctx.lineTo(head.x - 13, head.y + 7);
    ctx.lineTo(head.x - 3, head.y + 8);
    ctx.quadraticCurveTo(head.x - 4, head.y - 2, head.x + 8, head.y - 3);
    ctx.fill();
    // face cloth — only eyes show
    ctx.fillStyle = '#1a2830';
    ctx.fillRect(head.x - 2, head.y - 1, 12, 8);
    ctx.fillStyle = pal.eye;
    ctx.fillRect(head.x + 4, head.y + 1, 2.2, 1.5);
  }
}

/** 朴刀 */
function drawPudao(ctx: CanvasRenderingContext2D, h: V, ang: number, F: boolean): V {
  const dx = Math.sin(ang), dy = Math.cos(ang);
  const end = { x: h.x + dx * 42, y: h.y + dy * 42 };
  ctx.strokeStyle = F ? '#fff' : '#3a2a18';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(h.x - dx * 6, h.y - dy * 6);
  ctx.lineTo(end.x - dx * 8, end.y - dy * 8);
  ctx.stroke();
  // broad single-edge blade (朴刀 silhouette)
  const px = -dy, py = dx;
  ctx.fillStyle = F ? '#fff' : '#9aa0a8';
  ctx.beginPath();
  const P = (u: number, v: number) => [end.x + px * u + dx * v, end.y + py * u + dy * v] as const;
  ctx.moveTo(...P(0, 2));
  ctx.lineTo(...P(5, 0));
  ctx.quadraticCurveTo(...P(14, 4), ...P(18, 10));
  ctx.quadraticCurveTo(...P(12, -6), ...P(2, -14));
  ctx.lineTo(...P(-1, -6));
  ctx.closePath();
  ctx.fill();
  if (!F) {
    ctx.strokeStyle = '#c8d0d8';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(...P(2, 0));
    ctx.lineTo(...P(12, 2));
    ctx.stroke();
  }
  return { x: end.x + px * 12, y: end.y + py * 12 };
}

function drawBow(ctx: CanvasRenderingContext2D, h: V, j: Joints, pull: number, F: boolean): V {
  const a = j.fForeAng, dx = Math.sin(a), dy = Math.cos(a);
  const px = dy, py = -dx;
  const R = 28;
  const top = { x: h.x + px * R - dx * 8, y: h.y + py * R - dy * 8 };
  const bot = { x: h.x - px * R - dx * 8, y: h.y - py * R - dy * 8 };
  ctx.strokeStyle = F ? '#fff' : '#3a2818';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.quadraticCurveTo(h.x + dx * 14, h.y + dy * 14, bot.x, bot.y);
  ctx.stroke();
  const nock = pull > 0 ? j.bHand : { x: h.x - dx * 8, y: h.y - dy * 8 };
  ctx.strokeStyle = F ? '#fff' : '#c8b890';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(nock.x, nock.y);
  ctx.lineTo(bot.x, bot.y);
  ctx.stroke();
  if (pull > 0) {
    ctx.strokeStyle = F ? '#fff' : '#5a4030';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(nock.x, nock.y);
    ctx.lineTo(h.x + dx * 12, h.y + dy * 12);
    ctx.stroke();
    return { x: h.x + dx * 12, y: h.y + dy * 12 };
  }
  return h;
}

function drawRoundShield(ctx: CanvasRenderingContext2D, h: V, lean: number, F: boolean): V {
  ctx.save();
  ctx.translate(h.x + 6, h.y);
  ctx.rotate(lean * 0.3);
  ctx.fillStyle = F ? '#fff' : '#4a3420';
  ctx.strokeStyle = F ? '#fff' : '#8a7060';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 朱砂 + 金边 boss
  if (!F) {
    ctx.strokeStyle = '#c9a050';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#a01828';
    ctx.beginPath();
    ctx.arc(0, -2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8d8a0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(0, 2);
    ctx.moveTo(-3.5, -2); ctx.lineTo(3.5, -2);
    ctx.stroke();
  }
  ctx.restore();
  return { x: h.x + 6, y: h.y - 16 };
}

/** 长枪 — ink shaft + leaf tip + short tassel */
function drawSpear(ctx: CanvasRenderingContext2D, h: V, ang: number, F: boolean): V {
  const dx = Math.sin(ang), dy = Math.cos(ang);
  const len = 58;
  const end = { x: h.x + dx * len, y: h.y + dy * len };
  const butt = { x: h.x - dx * 10, y: h.y - dy * 10 };
  // shaft
  ctx.strokeStyle = F ? '#fff' : '#2a2218';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(butt.x, butt.y);
  ctx.lineTo(end.x - dx * 10, end.y - dy * 10);
  ctx.stroke();
  // grip wrap
  if (!F) {
    ctx.strokeStyle = '#5a4030';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(h.x - dx * 2, h.y - dy * 2);
    ctx.lineTo(h.x + dx * 6, h.y + dy * 6);
    ctx.stroke();
  }
  // leaf spearhead
  const px = -dy, py = dx;
  const base = { x: end.x - dx * 12, y: end.y - dy * 12 };
  ctx.fillStyle = F ? '#fff' : '#8a9098';
  ctx.beginPath();
  ctx.moveTo(end.x + dx * 2, end.y + dy * 2);
  ctx.lineTo(base.x + px * 5, base.y + py * 5);
  ctx.lineTo(base.x - dx * 2, base.y - dy * 2);
  ctx.lineTo(base.x - px * 5, base.y - py * 5);
  ctx.closePath();
  ctx.fill();
  if (!F) {
    ctx.strokeStyle = '#c8d0d8';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(end.x + dx * 1, end.y + dy * 1);
    ctx.stroke();
    // ink tassel near head
    ctx.strokeStyle = '#6a2030';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(base.x - dx * 2, base.y - dy * 2);
    ctx.quadraticCurveTo(base.x - dx * 4 - px * 8, base.y - dy * 4 - py * 8, base.x - dx * 10 - px * 4, base.y - dy * 10 - py * 4);
    ctx.stroke();
  }
  return { x: end.x + px * 2, y: end.y + py * 2 };
}

function resolveVisualKind(kind: SkelKind, sil: SilhouetteDef | null | undefined): SkelKind {
  const rig = sil?.baseRig ?? sil?.body;
  if (rig === 'axe' || rig === 'shield' || rig === 'archer' || rig === 'spear') return rig;
  return kind;
}

type ParsedParts = {
  headgear?: 'bandit' | 'hat' | 'topknot' | 'hood' | 'none';
  torso?: 'robe' | 'light' | 'heavy';
  offhand?: 'blade' | 'shield' | 'none';
  palette?: Partial<ReturnType<typeof palette>>;
  scale?: number;
  hasMainhand: boolean;
  cloak?: { style: 'short' | 'long' | 'ragged' | 'none'; sway: number; color?: string };
  armor?: Array<{ slot: 'chest' | 'shoulder' | 'skirt'; style: 'light' | 'plate' | 'cloth'; color?: string }>;
  ornaments?: Array<{ slot: 'waist' | 'back' | 'neck' | 'ear'; style: string; color?: string }>;
  faceMark?: { style: 'none' | 'scar' | 'mask' | 'veil'; color?: string };
  stance?: { lean: number; crouch: number };
};

function parseParts(parts: SilhouettePart[], silId: string): ParsedParts {
  const out: ParsedParts = { hasMainhand: false };
  for (const p of parts) {
    const k = (p as { kind?: string }).kind;
    if (k === 'headgear') {
      out.headgear = (p as { style?: ParsedParts['headgear'] }).style;
    } else if (k === 'torso') {
      out.torso = (p as { style?: ParsedParts['torso'] }).style;
      // torso styles currently share robe geometry; palette part covers recolor.
    } else if (k === 'offhand') {
      out.offhand = (p as { style?: ParsedParts['offhand'] }).style;
    } else if (k === 'mainhand') {
      out.hasMainhand = true;
    } else if (k === 'palette') {
      const pal = p as Extract<SilhouettePart, { kind: 'palette' }>;
      out.palette = {
        ...(out.palette ?? {}),
        ...(pal.cloak != null ? { cloak: pal.cloak } : {}),
        ...(pal.coat != null ? { coat: pal.coat } : {}),
        ...(pal.arm != null ? { arm: pal.arm } : {}),
        ...(pal.armB != null ? { armB: pal.armB } : {}),
        ...(pal.leg != null ? { leg: pal.leg } : {}),
        ...(pal.legB != null ? { legB: pal.legB } : {}),
        ...(pal.boot != null ? { boot: pal.boot } : {}),
        ...(pal.skin != null ? { skin: pal.skin } : {}),
        ...(pal.sash != null ? { sash: pal.sash } : {}),
        ...(pal.collar != null ? { collar: pal.collar } : {}),
        ...(pal.eye != null ? { eye: pal.eye } : {}),
      };
    } else if (k === 'scale') {
      const v = (p as { value?: number }).value;
      if (typeof v === 'number' && v > 0.4 && v < 2.5) out.scale = v;
    } else if (k === 'cloak') {
      const c = p as Extract<SilhouettePart, { kind: 'cloak' }>;
      out.cloak = {
        style: c.style ?? 'long',
        sway: typeof c.sway === 'number' ? c.sway : 1,
        color: c.color,
      };
    } else if (k === 'armorLayer') {
      const a = p as Extract<SilhouettePart, { kind: 'armorLayer' }>;
      (out.armor ??= []).push({
        slot: a.slot ?? 'chest',
        style: a.style ?? 'light',
        color: a.color,
      });
    } else if (k === 'ornament') {
      const o = p as Extract<SilhouettePart, { kind: 'ornament' }>;
      (out.ornaments ??= []).push({
        slot: o.slot ?? 'waist',
        style: o.style ?? 'pendant',
        color: o.color,
      });
    } else if (k === 'faceMark') {
      const f = p as Extract<SilhouettePart, { kind: 'faceMark' }>;
      out.faceMark = { style: f.style ?? 'none', color: f.color };
    } else if (k === 'stanceBias') {
      const s = p as Extract<SilhouettePart, { kind: 'stanceBias' }>;
      out.stance = {
        lean: Math.max(-1, Math.min(1, s.lean ?? 0)),
        crouch: Math.max(0, Math.min(1, s.crouch ?? 0)),
      };
    } else {
      warnPart(`${silId}:${k}`, `未知剪影部件 kind「${k}」，已跳过`);
    }
  }
  return out;
}

function drawOffhandBlade(ctx: CanvasRenderingContext2D, j: Joints, F: boolean): void {
  const a = j.bForeAng + 0.85;
  const dx = Math.sin(a), dy = Math.cos(a);
  ctx.strokeStyle = F ? '#fff' : '#4a3828';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(j.bHand.x, j.bHand.y);
  ctx.lineTo(j.bHand.x + dx * 26, j.bHand.y + dy * 26);
  ctx.stroke();
  ctx.fillStyle = F ? '#fff' : '#8a9098';
  const tip = { x: j.bHand.x + dx * 26, y: j.bHand.y + dy * 26 };
  const px = -dy, py = dx;
  ctx.beginPath();
  ctx.moveTo(tip.x - dx * 4 + px * 3, tip.y - dy * 4 + py * 3);
  ctx.lineTo(tip.x + dx * 2, tip.y + dy * 2);
  ctx.lineTo(tip.x - dx * 4 - px * 3, tip.y - dy * 4 - py * 3);
  ctx.closePath();
  ctx.fill();
}
