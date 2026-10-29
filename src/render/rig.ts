import type { V } from '../engine/math';
import { clamp, easeOut, lerp } from '../engine/math';
import type { AttackInst } from '../combat/types';

/**
 * Pose angles in radians, measured from straight down, positive = rotating toward facing direction.
 * f* = front limbs, b* = back limbs. Knees/elbows are relative to the parent bone. Arms are relative to torso lean.
 */
export interface Pose {
  y: number; lean: number; head: number; rot: number;
  ft: number; fk: number; bt: number; bk: number;
  fa: number; fe: number; ba: number; be: number;
  w: number;
}

const KEYS: (keyof Pose)[] = ['y', 'lean', 'head', 'rot', 'ft', 'fk', 'bt', 'bk', 'fa', 'fe', 'ba', 'be', 'w'];

export const P = (p: Partial<Pose>): Pose => ({
  y: 0, lean: 0, head: 0, rot: 0, ft: 0.2, fk: -0.2, bt: -0.2, bk: -0.2, fa: 0.3, fe: 0.3, ba: -0.2, be: 0.3, w: 0.5, ...p,
});

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const o = {} as Pose;
  for (const k of KEYS) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
}

export interface Dims { thigh: number; shin: number; torso: number; neck: number; headR: number; upper: number; fore: number; weapon: number }

export interface Joints {
  hip: V; fKnee: V; fFoot: V; bKnee: V; bFoot: V; sh: V; head: V;
  fElbow: V; fHand: V; bElbow: V; bHand: V; tip: V; wAng: number; fForeAng: number; bForeAng: number;
}

const dir = (a: number, l: number): V => ({ x: Math.sin(a) * l, y: Math.cos(a) * l });
const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });

export function solve(p: Pose, d: Dims): Joints {
  const hip = { x: 0, y: -(d.thigh + d.shin) * 0.96 + p.y };
  const fKnee = add(hip, dir(p.ft, d.thigh));
  const fFoot = add(fKnee, dir(p.ft + p.fk, d.shin));
  const bKnee = add(hip, dir(p.bt, d.thigh));
  const bFoot = add(bKnee, dir(p.bt + p.bk, d.shin));
  const sh = add(hip, { x: Math.sin(p.lean) * d.torso, y: -Math.cos(p.lean) * d.torso });
  const hl = d.neck + d.headR;
  const head = add(sh, { x: Math.sin(p.lean + p.head) * hl, y: -Math.cos(p.lean + p.head) * hl });
  const fua = p.fa + p.lean, bua = p.ba + p.lean;
  const fElbow = add(sh, dir(fua, d.upper));
  const fHand = add(fElbow, dir(fua + p.fe, d.fore));
  const bElbow = add(sh, dir(bua, d.upper));
  const bHand = add(bElbow, dir(bua + p.be, d.fore));
  const wAng = fua + p.fe + p.w;
  const tip = add(fHand, dir(wAng, d.weapon));
  return { hip, fKnee, fFoot, bKnee, bFoot, sh, head, fElbow, fHand, bElbow, bHand, tip, wAng, fForeAng: fua + p.fe, bForeAng: bua + p.be };
}

export interface AttackPoses { wind: Pose; strike: Pose; rec: Pose }

/** Interpolates idle -> windup -> strike -> recovery -> idle across an attack's frame data. */
export function attackPose(a: AttackInst, poses: AttackPoses, rest: Pose): Pose {
  const d = a.def;
  const f = a.f;
  if (f < d.startup) return lerpPose(rest, poses.wind, easeOut((f + 1) / Math.max(1, d.startup)));
  if (f < d.startup + d.active) return lerpPose(poses.wind, poses.strike, easeOut((f - d.startup + 1) / Math.max(1, Math.min(d.active, 3))));
  const r = (f - d.startup - d.active) / Math.max(1, d.recovery);
  if (r < 0.55) return lerpPose(poses.strike, poses.rec, easeOut(r / 0.55));
  return lerpPose(poses.rec, rest, clamp((r - 0.55) / 0.45, 0, 1));
}

/** Two-pose cycle (e.g. run). */
export function cycle(a: Pose, b: Pose, phase: number): Pose {
  return lerpPose(a, b, (Math.sin(phase) + 1) / 2);
}

export const mix = lerp;

export function limb(ctx: CanvasRenderingContext2D, a: V, b: V, c: V, w: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.stroke();
}
