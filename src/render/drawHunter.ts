import { drawGlow } from '../effects/glow';
import { limb, solve, type Dims, type Joints, type Pose } from './rig';
import type { WeaponDef } from '../meta/weapons';
import { appearanceFromWeapon, drawWeaponAppearance } from './drawWeaponAppearance';

export const HUNTER_DIMS: Dims = { thigh: 19, shin: 19, torso: 26, neck: 4, headR: 7.5, upper: 14, fore: 13, weapon: 50 };
export function hunterDimsFor(w?: WeaponDef): Dims {
  return { ...HUNTER_DIMS, weapon: w?.length ?? 50 };
}

interface Palette { cape: string; capeIn: string; coat: string; trim: string; bLimb: string; fLimb: string; bArm: string; fArm: string; skin: string; hair: string; blade: string; boot: string }

/** 夜行侠客 — indigo / ink / cinnabar */
const NORMAL: Palette = {
  cape: '#0c1420', capeIn: '#8a1420', coat: '#1a2438', trim: '#c9a050',
  bLimb: '#101820', fLimb: '#1c2838', bArm: '#182030', fArm: '#243048',
  skin: '#e8e0d4', hair: '#1a1410', blade: '#e9eef7', boot: '#0a0c10',
};
const FLASH: Palette = { cape: '#fff', capeIn: '#fff', coat: '#fff', trim: '#fff', bLimb: '#fff', fLimb: '#fff', bArm: '#fff', fArm: '#fff', skin: '#fff', hair: '#fff', blade: '#fff', boot: '#fff' };
const GHOST: Palette = { cape: '#2a4058', capeIn: '#6a2030', coat: '#3a5070', trim: '#8a7060', bLimb: '#2a3848', fLimb: '#3a4858', bArm: '#304050', fArm: '#405868', skin: '#a0b0c0', hair: '#203040', blade: '#c0d8ff', boot: '#182028' };

export interface HunterOpts { time: number; speed: number; flash?: boolean; ghost?: boolean; glow?: number; guard?: boolean; weapon?: WeaponDef; rim?: boolean }

/** Draws the 侠客 at local origin (feet), facing +x. */
export function drawHunter(ctx: CanvasRenderingContext2D, pose: Pose, o: HunterOpts): Joints {
  const dims = hunterDimsFor(o.weapon);
  const j = solve(pose, dims);
  const c = o.flash ? FLASH : o.ghost ? GHOST : { ...NORMAL, blade: o.weapon?.blade ?? NORMAL.blade };
  ctx.save();
  if (pose.rot) {
    ctx.translate(j.hip.x, j.hip.y);
    ctx.rotate(pose.rot);
    ctx.translate(-j.hip.x, -j.hip.y);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const flutter = Math.sin(o.time * 0.22) * 3 + Math.sin(o.time * 0.13) * 2;
  const sp = Math.min(1, Math.abs(o.speed) / 8);
  const { hip, sh, head } = j;

  // short night cloak
  const tailX = sh.x - 20 - sp * 14 + flutter * 0.4;
  const tailY = hip.y + 22 - sp * 12 + flutter;
  ctx.fillStyle = c.cape;
  ctx.beginPath();
  ctx.moveTo(sh.x + 2, sh.y - 2);
  ctx.quadraticCurveTo(sh.x - 12, sh.y + 6, tailX, tailY);
  ctx.lineTo(tailX + 10, tailY + 2);
  ctx.quadraticCurveTo(hip.x - 4, hip.y + 6, hip.x, hip.y - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.capeIn;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(sh.x, sh.y);
  ctx.quadraticCurveTo(sh.x - 6, sh.y + 8, tailX + 6, tailY - 2);
  ctx.lineTo(hip.x, hip.y - 4);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // back arm & leg
  limb(ctx, sh, j.bElbow, j.bHand, 5.5, c.bArm);
  limb(ctx, hip, j.bKnee, j.bFoot, 6.5, c.bLimb);
  clothBoot(ctx, j.bKnee, j.bFoot, c.boot);

  // 劲装 torso + skirt
  const ux = sh.x - hip.x, uy = sh.y - hip.y;
  const ul = Math.hypot(ux, uy) || 1;
  const nx = -uy / ul, ny = ux / ul;
  ctx.fillStyle = c.coat;
  ctx.beginPath();
  ctx.moveTo(hip.x + nx * 7, hip.y + ny * 7);
  ctx.lineTo((hip.x + j.fKnee.x) / 2 + 4, (hip.y + j.fKnee.y) / 2 + 6);
  ctx.lineTo(hip.x - 2, hip.y + 16);
  ctx.lineTo(hip.x - 12 - sp * 8 + flutter * 0.3, hip.y + 18 - sp * 4);
  ctx.lineTo(hip.x - nx * 7, hip.y - ny * 7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sh.x + nx * 9, sh.y + ny * 9);
  ctx.lineTo(sh.x - nx * 8, sh.y - ny * 8);
  ctx.lineTo(hip.x - nx * 7, hip.y - ny * 7);
  ctx.lineTo(hip.x + nx * 7, hip.y + ny * 7);
  ctx.closePath();
  ctx.fill();

  // 交领 overlap
  if (!o.flash && !o.ghost) {
    ctx.strokeStyle = '#0a1018';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(sh.x - nx * 2, sh.y + 2);
    ctx.lineTo(hip.x + nx * 2 + ux * 0.35, hip.y + uy * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sh.x + nx * 3, sh.y + 1);
    ctx.lineTo(hip.x - nx * 1 + ux * 0.4, hip.y + uy * 0.4);
    ctx.stroke();
    // 束腰 sash (cinnabar)
    ctx.strokeStyle = '#a01828';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(hip.x + nx * 7.5 + ux * 0.1, hip.y + ny * 7.5 + uy * 0.1);
    ctx.lineTo(hip.x - nx * 7.5 + ux * 0.1, hip.y - ny * 7.5 + uy * 0.1);
    ctx.stroke();
    // sash knot / tassel
    ctx.strokeStyle = '#c02838';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hip.x + nx * 6, hip.y + 2);
    ctx.lineTo(hip.x + nx * 9 + 2, hip.y + 12);
    ctx.stroke();
    // gold trim line
    ctx.strokeStyle = c.trim;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(sh.x - nx * 1 + ux * 0.15, sh.y - ny * 1 + uy * 0.15);
    ctx.lineTo(hip.x + 1 + ux * 0.05, hip.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // front leg
  limb(ctx, hip, j.fKnee, j.fFoot, 7, c.fLimb);
  clothBoot(ctx, j.fKnee, j.fFoot, c.boot);

  // head — 束发 topknot
  const hr = HUNTER_DIMS.headR;
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.arc(head.x + 1.5, head.y + 1, hr * 0.85, 0, Math.PI * 2);
  ctx.fill();
  // hair base
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.arc(head.x, head.y - 1, hr + 0.8, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  // topknot
  ctx.beginPath();
  ctx.ellipse(head.x - 1, head.y - hr - 3, 4.5, 5.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  if (!o.flash && !o.ghost) {
    ctx.strokeStyle = c.trim;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(head.x - 1, head.y - hr - 1, 3.2, 0, Math.PI * 2);
    ctx.stroke();
    // side locks
    ctx.fillStyle = c.hair;
    ctx.beginPath();
    ctx.moveTo(head.x - 5, head.y);
    ctx.quadraticCurveTo(head.x - 10, head.y + 6, head.x - 7, head.y + 10);
    ctx.lineTo(head.x - 3, head.y + 4);
    ctx.fill();
    // cold eye
    ctx.fillStyle = '#2a4058';
    ctx.fillRect(head.x + 4.2, head.y, 2.4, 1.3);
    drawGlow(ctx, head.x + 5.2, head.y + 0.6, 4, '#60a0c0', 0.45);
  }

  // front arm + weapon (look recipe / parametric / whitelist sprite)
  const h = j.fHand, a = j.wAng;
  const dx = Math.sin(a), dy = Math.cos(a);
  const wpn = o.weapon;
  const look = wpn ? appearanceFromWeapon(wpn) : null;
  const glowCol = look?.swingHint?.color ?? look?.trail ?? wpn?.trail ?? '#ff1a40';
  if (!o.flash && !o.ghost) { ctx.shadowColor = glowCol; ctx.shadowBlur = 7 + (o.glow ?? 0) * 12; }
  if (look) {
    drawWeaponAppearance(ctx, h, a, { ...look, blade: o.flash ? '#fff' : (look.blade || c.blade) }, o.flash);
  } else {
    // bare hands — tiny ink stub
    ctx.strokeStyle = o.flash ? '#fff' : '#2a1a14';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(h.x - dx * 4, h.y - dy * 4);
    ctx.lineTo(h.x + dx * 6, h.y + dy * 6);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  // legacy trim guard only when no look recipe (recipe draws its own guard/tsuba)
  if (!look?.parts?.length) {
    ctx.strokeStyle = c.trim;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(h.x + dy * 5.5, h.y - dx * 5.5);
    ctx.lineTo(h.x - dy * 5.5, h.y + dx * 5.5);
    ctx.stroke();
  }
  limb(ctx, sh, j.fElbow, j.fHand, 5.8, c.fArm);
  ctx.fillStyle = c.boot;
  ctx.beginPath();
  ctx.arc(h.x, h.y, 3, 0, Math.PI * 2);
  ctx.fill();
  if (o.guard && !o.flash) drawGlow(ctx, h.x + 6, h.y - 14, 28, '#70c8a0', 0.4);

  // soft moon rim
  if (o.rim && !o.flash && !o.ghost) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(180,210,255,0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(head.x + 2.2, head.y + 0.5, hr * 0.88, -1.1, 0.85);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,200,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sh.x + nx * 9 + 1, sh.y + ny * 9);
    ctx.lineTo(hip.x + nx * 7 + 1, hip.y + ny * 7);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  return j;
}

function clothBoot(ctx: CanvasRenderingContext2D, knee: { x: number; y: number }, foot: { x: number; y: number }, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(knee.x + (foot.x - knee.x) * 0.45, knee.y + (foot.y - knee.y) * 0.45);
  ctx.lineTo(foot.x, foot.y);
  ctx.lineTo(foot.x + 5.5, foot.y);
  ctx.stroke();
}

