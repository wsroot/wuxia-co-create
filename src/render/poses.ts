import { P, type AttackPoses, type Pose } from './rig';

// ---------------- Hunter (player) ----------------
export const HP = {
  idle: P({ y: 3, lean: 0.12, head: -0.08, ft: 0.42, fk: -0.5, bt: -0.32, bk: -0.3, fa: 0.5, fe: 1.0, ba: -0.3, be: 0.7, w: 0.55 }),
  idle2: P({ y: 5, lean: 0.14, head: -0.04, ft: 0.44, fk: -0.58, bt: -0.32, bk: -0.36, fa: 0.55, fe: 0.95, ba: -0.25, be: 0.75, w: 0.6 }),
  run1: P({ y: 2, lean: 0.4, head: -0.25, ft: 1.0, fk: -0.5, bt: -0.75, bk: -0.9, fa: 0.0, fe: 0.9, ba: 0.7, be: 0.7, w: 0.9 }),
  run2: P({ y: 2, lean: 0.4, head: -0.25, ft: -0.7, fk: -1.1, bt: 0.9, bk: -0.4, fa: 0.6, fe: 0.8, ba: -0.6, be: 0.9, w: 0.5 }),
  jump: P({ lean: 0.1, ft: 0.9, fk: -1.4, bt: 0.1, bk: -1.0, fa: 1.3, fe: 0.7, ba: -0.9, be: 0.5, w: 0.4 }),
  fall: P({ lean: 0.05, ft: 0.5, fk: -0.7, bt: -0.3, bk: -0.5, fa: 1.7, fe: 0.4, ba: -1.4, be: 0.5, w: 0.3 }),
  land: P({ y: 12, lean: 0.35, ft: 0.8, fk: -1.3, bt: -0.5, bk: -0.7, fa: 0.7, fe: 0.6, ba: -0.6, be: 0.4, w: 0.6 }),
  guard: P({ y: 6, lean: 0.02, head: -0.05, ft: 0.55, fk: -0.75, bt: -0.4, bk: -0.4, fa: 0.75, fe: 1.55, ba: 0.9, be: 1.4, w: 0.75 }),
  dash: P({ y: 10, lean: 0.95, head: -0.6, ft: 1.3, fk: -1.2, bt: -1.2, bk: -0.3, fa: -1.4, fe: 0.3, ba: -1.6, be: 0.3, w: 0.3 }),
  hurt: P({ y: 2, lean: -0.45, head: -0.45, ft: 0.45, fk: -0.4, bt: -0.25, bk: -0.4, fa: -0.6, fe: 0.6, ba: -1.0, be: 0.4, w: 1.0 }),
  down: P({ y: 30, rot: -1.5, lean: -0.1, head: -0.2, ft: 0.3, fk: -0.4, bt: 0.1, bk: -0.2, fa: -0.4, fe: 0.3, ba: 0.3, be: 0.3, w: 0.4 }),
  getup: P({ y: 18, lean: 0.6, ft: 0.9, fk: -1.6, bt: -0.6, bk: -1.2, fa: 0.4, fe: 0.4, ba: 0.6, be: 0.4, w: 0.6 }),
  charge: P({ y: 8, lean: -0.1, head: -0.3, ft: 0.55, fk: -0.6, bt: -0.5, bk: -0.3, fa: 2.4, fe: 0.4, ba: -2.4, be: -0.4, w: 0.0 }),
};

export const HUNTER_ATTACKS: Record<string, AttackPoses> = {
  slash1: {
    wind: P({ y: 4, lean: -0.08, ft: 0.5, fk: -0.5, bt: -0.35, bk: -0.3, fa: 2.75, fe: 0.5, ba: -0.6, be: 0.6, w: 0.4 }),
    strike: P({ y: 7, lean: 0.38, head: -0.1, ft: 0.8, fk: -0.75, bt: -0.6, bk: -0.2, fa: 1.0, fe: 0.15, ba: -1.0, be: 0.4, w: 0.15 }),
    rec: P({ y: 6, lean: 0.32, ft: 0.75, fk: -0.7, bt: -0.55, bk: -0.2, fa: 0.4, fe: 0.2, ba: -0.8, be: 0.5, w: 0.2 }),
  },
  slash2: {
    wind: P({ y: 6, lean: 0.3, ft: 0.6, fk: -0.7, bt: -0.5, bk: -0.2, fa: -0.5, fe: 0.2, ba: 0.3, be: 0.5, w: -0.2 }),
    strike: P({ y: 3, lean: 0.12, head: -0.15, ft: 0.7, fk: -0.6, bt: -0.5, bk: -0.3, fa: 2.3, fe: 0.25, ba: -0.8, be: 0.4, w: 0.25 }),
    rec: P({ y: 3, lean: 0.08, ft: 0.65, fk: -0.6, bt: -0.5, bk: -0.3, fa: 2.0, fe: 0.5, ba: -0.6, be: 0.5, w: 0.4 }),
  },
  slash3: {
    wind: P({ y: 6, lean: -0.15, ft: 0.4, fk: -0.5, bt: -0.6, bk: -0.3, fa: -1.5, fe: 0.3, ba: 0.4, be: 0.6, w: -0.4 }),
    strike: P({ y: 8, lean: 0.45, head: -0.15, ft: 0.95, fk: -0.9, bt: -0.6, bk: -0.2, fa: 1.25, fe: 0.0, ba: -1.2, be: 0.3, w: 0.0 }),
    rec: P({ y: 8, lean: 0.4, ft: 0.9, fk: -0.9, bt: -0.6, bk: -0.2, fa: 1.0, fe: 0.4, ba: -1.0, be: 0.4, w: 0.3 }),
  },
  finisher: {
    wind: P({ y: 0, lean: -0.3, head: -0.2, ft: 0.4, fk: -0.3, bt: -0.4, bk: -0.3, fa: 3.1, fe: 0.3, ba: 2.8, be: 0.3, w: 0.4 }),
    strike: P({ y: 18, lean: 0.7, head: -0.3, ft: 1.1, fk: -1.2, bt: -0.9, bk: 0.0, fa: 0.55, fe: 0.0, ba: 0.4, be: 0.3, w: 0.0 }),
    rec: P({ y: 16, lean: 0.6, ft: 1.05, fk: -1.2, bt: -0.9, bk: 0.0, fa: 0.4, fe: 0.1, ba: 0.3, be: 0.3, w: 0.05 }),
  },
  launcher: {
    wind: P({ y: 16, lean: 0.5, ft: 0.9, fk: -1.3, bt: -0.7, bk: -0.6, fa: -0.2, fe: 0.1, ba: -0.6, be: 0.4, w: -0.4 }),
    strike: P({ y: -4, lean: -0.15, head: -0.3, ft: 0.3, fk: -0.2, bt: -0.4, bk: -0.4, fa: 3.0, fe: 0.1, ba: -1.0, be: 0.4, w: 0.1 }),
    rec: P({ y: -2, lean: -0.1, ft: 0.4, fk: -0.5, bt: -0.4, bk: -0.5, fa: 2.7, fe: 0.4, ba: -0.8, be: 0.5, w: 0.3 }),
  },
  rising: {
    wind: P({ lean: 0.4, ft: 0.9, fk: -1.4, bt: 0.1, bk: -1.0, fa: -0.2, fe: 0.1, ba: -0.6, be: 0.4, w: -0.4 }),
    strike: P({ lean: -0.15, head: -0.3, ft: 0.6, fk: -1.2, bt: -0.1, bk: -0.8, fa: 3.0, fe: 0.1, ba: -1.0, be: 0.4, w: 0.1 }),
    rec: P({ lean: -0.1, ft: 0.6, fk: -1.2, bt: -0.1, bk: -0.8, fa: 2.7, fe: 0.4, ba: -0.8, be: 0.5, w: 0.3 }),
  },
  sweep: {
    wind: P({ y: 24, lean: 0.4, ft: 1.3, fk: -1.8, bt: -1.4, bk: -0.2, fa: -1.0, fe: 0.2, ba: 0.8, be: 0.4, w: 0.0 }),
    strike: P({ y: 26, lean: 0.55, head: -0.3, ft: 1.4, fk: -1.6, bt: -1.5, bk: -0.1, fa: 0.95, fe: 0.0, ba: -1.2, be: 0.4, w: 0.0 }),
    rec: P({ y: 24, lean: 0.5, ft: 1.35, fk: -1.7, bt: -1.4, bk: -0.2, fa: 0.8, fe: 0.3, ba: -1.0, be: 0.4, w: 0.2 }),
  },
  dashKick: {
    wind: P({ y: 4, lean: -0.1, ft: 1.0, fk: -1.6, bt: -0.3, bk: -0.4, fa: -1.0, fe: 0.5, ba: -1.4, be: 0.4, w: 0.5 }),
    strike: P({ y: 2, lean: -0.4, head: 0.1, ft: 1.75, fk: -0.05, bt: -0.15, bk: -0.4, fa: -1.1, fe: 0.4, ba: -1.6, be: 0.4, w: 0.5 }),
    rec: P({ y: 4, lean: -0.3, ft: 1.4, fk: -0.6, bt: -0.2, bk: -0.4, fa: -0.8, fe: 0.5, ba: -1.2, be: 0.4, w: 0.6 }),
  },
  airA: {
    wind: P({ lean: -0.1, ft: 0.9, fk: -1.4, bt: 0.1, bk: -1.0, fa: 2.8, fe: 0.4, ba: -0.8, be: 0.5, w: 0.4 }),
    strike: P({ lean: 0.35, ft: 0.9, fk: -1.2, bt: -0.1, bk: -1.0, fa: 0.8, fe: 0.1, ba: -1.0, be: 0.4, w: 0.1 }),
    rec: P({ lean: 0.3, ft: 0.8, fk: -1.2, bt: -0.1, bk: -1.0, fa: 0.6, fe: 0.3, ba: -0.9, be: 0.5, w: 0.2 }),
  },
  airB: {
    wind: P({ lean: 0.3, ft: 0.7, fk: -1.3, bt: 0.2, bk: -1.1, fa: -0.4, fe: 0.2, ba: 0.4, be: 0.5, w: -0.2 }),
    strike: P({ lean: 0.05, ft: 0.8, fk: -1.3, bt: 0.0, bk: -1.0, fa: 2.4, fe: 0.2, ba: -0.8, be: 0.4, w: 0.2 }),
    rec: P({ lean: 0.05, ft: 0.8, fk: -1.3, bt: 0.0, bk: -1.0, fa: 2.1, fe: 0.5, ba: -0.6, be: 0.5, w: 0.4 }),
  },
  plunge: {
    wind: P({ lean: -0.2, ft: 0.9, fk: -1.6, bt: 0.3, bk: -1.4, fa: 2.9, fe: 0.3, ba: 2.6, be: 0.3, w: 0.3 }),
    strike: P({ lean: 0.15, ft: 0.8, fk: -1.4, bt: 0.4, bk: -1.3, fa: 0.25, fe: -0.1, ba: 0.4, be: 0.3, w: -0.35 }),
    rec: P({ y: 18, lean: 0.5, ft: 1.1, fk: -1.6, bt: -0.8, bk: -0.6, fa: 0.4, fe: -0.1, ba: 0.3, be: 0.3, w: -0.3 }),
  },
  counter: {
    wind: P({ y: 10, lean: 0.6, ft: 1.0, fk: -1.1, bt: -1.0, bk: -0.2, fa: -1.6, fe: 0.2, ba: 0.5, be: 0.4, w: -0.3 }),
    strike: P({ y: 10, lean: 0.55, head: -0.2, ft: 1.15, fk: -1.1, bt: -1.0, bk: -0.1, fa: 1.6, fe: 0.0, ba: -1.3, be: 0.3, w: 0.0 }),
    rec: P({ y: 10, lean: 0.5, ft: 1.1, fk: -1.1, bt: -1.0, bk: -0.1, fa: 1.4, fe: 0.4, ba: -1.1, be: 0.4, w: 0.4 }),
  },
};

// ---------------- Skeletons ----------------
export const SP = {
  idle: P({ y: 3, lean: 0.18, head: 0.15, ft: 0.3, fk: -0.4, bt: -0.25, bk: -0.3, fa: 0.4, fe: 0.6, ba: -0.2, be: 0.5, w: 0.8 }),
  walk1: P({ y: 2, lean: 0.22, head: 0.15, ft: 0.55, fk: -0.3, bt: -0.45, bk: -0.5, fa: 0.2, fe: 0.6, ba: 0.2, be: 0.4, w: 0.8 }),
  walk2: P({ y: 2, lean: 0.22, head: 0.15, ft: -0.35, fk: -0.7, bt: 0.5, bk: -0.2, fa: 0.55, fe: 0.6, ba: -0.4, be: 0.5, w: 0.8 }),
  hurt: P({ y: 2, lean: -0.5, head: -0.4, ft: 0.4, fk: -0.3, bt: -0.3, bk: -0.4, fa: -0.6, fe: 0.4, ba: -0.8, be: 0.3, w: 0.8 }),
  air: P({ lean: -0.6, head: -0.5, ft: 0.8, fk: -0.9, bt: 0.2, bk: -0.6, fa: -1.4, fe: 0.4, ba: -1.8, be: 0.3, w: 0.6 }),
  down: P({ y: 30, rot: -1.55, lean: 0, head: -0.3, ft: 0.2, fk: -0.2, bt: 0.0, bk: -0.2, fa: 2.2, fe: 0.2, ba: 1.8, be: 0.2, w: 0.4 }),
  getup: P({ y: 18, lean: 0.6, ft: 0.9, fk: -1.6, bt: -0.6, bk: -1.2, fa: 0.4, fe: 0.4, ba: 0.6, be: 0.4, w: 0.8 }),
  parried: P({ y: 0, lean: -0.55, head: -0.5, ft: 0.5, fk: -0.4, bt: -0.4, bk: -0.4, fa: 2.6, fe: 0.4, ba: -1.2, be: 0.2, w: 0.4 }),
  hop: P({ lean: -0.1, ft: 0.8, fk: -1.4, bt: 0.2, bk: -1.2, fa: 1.2, fe: 0.3, ba: -0.4, be: 0.5, w: 0 }),
  // shield bearer: front arm holds the shield forward
  shIdle: P({ y: 5, lean: 0.25, head: 0.2, ft: 0.45, fk: -0.6, bt: -0.35, bk: -0.4, fa: 0.9, fe: 1.1, ba: -0.4, be: 0.9, w: 0 }),
  shWalk1: P({ y: 4, lean: 0.3, head: 0.2, ft: 0.6, fk: -0.4, bt: -0.5, bk: -0.5, fa: 0.9, fe: 1.1, ba: -0.4, be: 0.9, w: 0 }),
  shWalk2: P({ y: 4, lean: 0.3, head: 0.2, ft: -0.3, fk: -0.7, bt: 0.5, bk: -0.3, fa: 0.9, fe: 1.1, ba: -0.3, be: 0.9, w: 0 }),
  shBang: P({ y: 5, lean: 0.15, head: 0.1, ft: 0.45, fk: -0.6, bt: -0.35, bk: -0.4, fa: 0.9, fe: 1.1, ba: 2.2, be: 0.8, w: 0 }),
  shBang2: P({ y: 5, lean: 0.25, head: 0.2, ft: 0.45, fk: -0.6, bt: -0.35, bk: -0.4, fa: 0.9, fe: 1.1, ba: 1.2, be: 1.3, w: 0 }),
  shCharge: P({ y: 8, lean: 0.75, head: 0.4, ft: 1.1, fk: -0.7, bt: -0.9, bk: -0.5, fa: 0.5, fe: 1.1, ba: -0.8, be: 0.6, w: 0 }),
  shTired: P({ y: 10, lean: 0.6, head: 0.6, ft: 0.5, fk: -0.9, bt: -0.4, bk: -0.6, fa: 0.0, fe: 0.3, ba: 0.0, be: 0.3, w: 0 }),
  // archer
  arIdle: P({ y: 3, lean: 0.1, head: 0.1, ft: 0.35, fk: -0.4, bt: -0.3, bk: -0.3, fa: 0.7, fe: 0.4, ba: 0.4, be: 0.8, w: 0 }),
  arAim: P({ y: 6, lean: -0.05, head: 0.05, ft: 0.55, fk: -0.6, bt: -0.4, bk: -0.4, fa: 1.65, fe: 0.0, ba: 1.5, be: -1.2, w: 0 }),
  // spear — long weapon held forward / mid-guard
  spIdle: P({ y: 3, lean: 0.14, head: 0.08, ft: 0.35, fk: -0.42, bt: -0.28, bk: -0.32, fa: 0.95, fe: 0.15, ba: -0.35, be: 0.55, w: 0.05 }),
  spWalk1: P({ y: 2, lean: 0.2, head: 0.1, ft: 0.55, fk: -0.35, bt: -0.48, bk: -0.5, fa: 0.9, fe: 0.12, ba: -0.25, be: 0.5, w: 0.05 }),
  spWalk2: P({ y: 2, lean: 0.2, head: 0.1, ft: -0.32, fk: -0.72, bt: 0.48, bk: -0.22, fa: 1.0, fe: 0.1, ba: -0.4, be: 0.55, w: 0.05 }),
};

export const SKEL_ATTACKS: Record<string, AttackPoses> = {
  axe: {
    wind: P({ y: 0, lean: -0.35, head: -0.2, ft: 0.4, fk: -0.3, bt: -0.4, bk: -0.3, fa: 3.0, fe: 0.4, ba: 2.7, be: 0.4, w: 0.2 }),
    strike: P({ y: 12, lean: 0.6, head: 0.3, ft: 0.9, fk: -1.0, bt: -0.7, bk: -0.1, fa: 0.75, fe: 0.1, ba: 0.8, be: 0.2, w: 0.1 }),
    rec: P({ y: 12, lean: 0.55, head: 0.3, ft: 0.85, fk: -1.0, bt: -0.7, bk: -0.1, fa: 0.5, fe: 0.1, ba: 0.5, be: 0.2, w: 0.1 }),
  },
  bash: {
    wind: P({ y: 6, lean: -0.1, ft: 0.4, fk: -0.6, bt: -0.4, bk: -0.4, fa: 0.4, fe: 1.3, ba: -0.4, be: 0.8, w: 0 }),
    strike: P({ y: 6, lean: 0.5, ft: 0.9, fk: -0.8, bt: -0.7, bk: -0.2, fa: 1.5, fe: 0.1, ba: -0.6, be: 0.8, w: 0 }),
    rec: P({ y: 6, lean: 0.4, ft: 0.8, fk: -0.8, bt: -0.6, bk: -0.2, fa: 1.2, fe: 0.5, ba: -0.5, be: 0.8, w: 0 }),
  },
  charge: {
    wind: SP.shCharge, strike: SP.shCharge, rec: SP.shTired,
  },
  whip: {
    wind: P({ y: 4, lean: -0.2, ft: 0.4, fk: -0.5, bt: -0.4, bk: -0.3, fa: -1.0, fe: 0.3, ba: 0.4, be: 0.6, w: 0 }),
    strike: P({ y: 6, lean: 0.4, ft: 0.8, fk: -0.8, bt: -0.6, bk: -0.2, fa: 1.9, fe: 0.1, ba: -0.6, be: 0.6, w: 0 }),
    rec: P({ y: 6, lean: 0.35, ft: 0.7, fk: -0.8, bt: -0.6, bk: -0.2, fa: 1.6, fe: 0.3, ba: -0.4, be: 0.6, w: 0 }),
  },
  thrust: {
    wind: P({ y: 4, lean: -0.25, head: -0.1, ft: 0.5, fk: -0.55, bt: -0.45, bk: -0.35, fa: -0.6, fe: 0.2, ba: 0.5, be: 0.6, w: -0.15 }),
    strike: P({ y: 5, lean: 0.35, head: 0.05, ft: 0.85, fk: -0.75, bt: -0.65, bk: -0.15, fa: 1.85, fe: -0.05, ba: -0.7, be: 0.5, w: 0.0 }),
    rec: P({ y: 5, lean: 0.28, head: 0.05, ft: 0.75, fk: -0.7, bt: -0.55, bk: -0.2, fa: 1.5, fe: 0.15, ba: -0.5, be: 0.55, w: 0.05 }),
  },
  lunge: {
    wind: P({ y: 6, lean: -0.15, head: -0.05, ft: 0.55, fk: -0.7, bt: -0.4, bk: -0.4, fa: 0.2, fe: 0.25, ba: -0.3, be: 0.55, w: 0.0 }),
    strike: P({ y: 4, lean: 0.55, head: -0.1, ft: 1.05, fk: -0.85, bt: -0.85, bk: -0.1, fa: 1.7, fe: -0.05, ba: -0.9, be: 0.4, w: 0.0 }),
    rec: P({ y: 6, lean: 0.4, head: 0.0, ft: 0.9, fk: -0.85, bt: -0.7, bk: -0.15, fa: 1.35, fe: 0.15, ba: -0.6, be: 0.5, w: 0.05 }),
  },
};

// ---------------- Gargoyle boss ----------------
export const GP = {
  idle: P({ y: 6, lean: 0.55, head: -0.35, ft: 0.6, fk: -1.0, bt: -0.3, bk: -0.8, fa: 0.6, fe: 0.7, ba: 0.2, be: 0.8, w: 0 }),
  idle2: P({ y: 9, lean: 0.6, head: -0.4, ft: 0.62, fk: -1.1, bt: -0.3, bk: -0.9, fa: 0.65, fe: 0.8, ba: 0.25, be: 0.9, w: 0 }),
  walk1: P({ y: 6, lean: 0.6, head: -0.4, ft: 0.9, fk: -0.9, bt: -0.6, bk: -0.9, fa: 0.3, fe: 0.7, ba: 0.6, be: 0.8, w: 0 }),
  walk2: P({ y: 6, lean: 0.6, head: -0.4, ft: -0.3, fk: -1.1, bt: 0.7, bk: -0.8, fa: 0.8, fe: 0.7, ba: 0.0, be: 0.8, w: 0 }),
  fly: P({ y: 0, lean: 0.3, head: -0.2, ft: 0.4, fk: -1.2, bt: 0.0, bk: -1.1, fa: 1.2, fe: 0.8, ba: 0.9, be: 0.8, w: 0 }),
  dive: P({ y: 0, lean: 1.4, head: -1.0, ft: 0.0, fk: -0.3, bt: -0.3, bk: -0.3, fa: 1.6, fe: 0.1, ba: 1.5, be: 0.1, w: 0 }),
  crouch: P({ y: 22, lean: 0.9, head: -0.7, ft: 1.1, fk: -1.8, bt: -0.6, bk: -1.4, fa: -0.6, fe: 0.4, ba: -0.8, be: 0.4, w: 0 }),
  charge: P({ y: 16, lean: 1.2, head: -0.9, ft: 1.2, fk: -1.0, bt: -1.1, bk: -0.6, fa: 1.5, fe: 0.2, ba: 1.4, be: 0.2, w: 0 }),
  roar: P({ y: 0, lean: -0.35, head: -0.6, ft: 0.6, fk: -0.6, bt: -0.6, bk: -0.4, fa: 2.4, fe: 0.4, ba: -2.2, be: -0.4, w: 0 }),
  cast: P({ y: 0, lean: 0.25, head: 0.25, ft: 0.4, fk: -1.2, bt: 0.0, bk: -1.1, fa: 2.0, fe: 0.6, ba: 1.8, be: 0.6, w: 0 }),
  stagger: P({ y: 26, lean: 0.95, head: 0.5, ft: 0.9, fk: -1.9, bt: -0.4, bk: -1.6, fa: 0.1, fe: 0.2, ba: 0.0, be: 0.2, w: 0 }),
  hurt: P({ y: 6, lean: 0.1, head: 0.2, ft: 0.6, fk: -0.9, bt: -0.4, bk: -0.8, fa: -0.4, fe: 0.6, ba: -0.6, be: 0.6, w: 0 }),
  air: P({ y: 0, lean: -0.4, head: -0.5, ft: 0.8, fk: -0.9, bt: 0.2, bk: -0.6, fa: -1.4, fe: 0.4, ba: -1.8, be: 0.3, w: 0 }),
  down: P({ y: 44, rot: -1.5, lean: 0, head: -0.3, ft: 0.3, fk: -0.4, bt: 0.1, bk: -0.4, fa: 2.0, fe: 0.4, ba: 1.6, be: 0.4, w: 0 }),
};

export const GARG_ATTACKS: Record<string, AttackPoses> = {
  claw1: {
    wind: P({ y: 4, lean: 0.2, head: -0.2, ft: 0.5, fk: -0.9, bt: -0.4, bk: -0.8, fa: 2.8, fe: 0.5, ba: 0.0, be: 0.6, w: 0 }),
    strike: P({ y: 12, lean: 0.85, head: -0.5, ft: 0.95, fk: -1.2, bt: -0.7, bk: -0.6, fa: 0.7, fe: 0.1, ba: -0.4, be: 0.6, w: 0 }),
    rec: P({ y: 12, lean: 0.8, head: -0.5, ft: 0.95, fk: -1.2, bt: -0.7, bk: -0.6, fa: 0.4, fe: 0.3, ba: -0.2, be: 0.6, w: 0 }),
  },
  claw2: {
    wind: P({ y: 8, lean: 0.6, head: -0.4, ft: 0.7, fk: -1.0, bt: -0.5, bk: -0.8, fa: 0.3, fe: 0.5, ba: 2.8, be: 0.4, w: 0 }),
    strike: P({ y: 12, lean: 0.85, head: -0.5, ft: 0.95, fk: -1.2, bt: -0.7, bk: -0.6, fa: 0.0, fe: 0.4, ba: 0.7, be: 0.1, w: 0 }),
    rec: P({ y: 12, lean: 0.8, head: -0.5, ft: 0.95, fk: -1.2, bt: -0.7, bk: -0.6, fa: 0.1, fe: 0.4, ba: 0.4, be: 0.3, w: 0 }),
  },
  claw3: {
    wind: P({ y: -2, lean: -0.3, head: -0.5, ft: 0.4, fk: -0.5, bt: -0.5, bk: -0.4, fa: 3.0, fe: 0.4, ba: 2.9, be: 0.4, w: 0 }),
    strike: P({ y: 22, lean: 1.1, head: -0.8, ft: 1.1, fk: -1.5, bt: -0.9, bk: -0.6, fa: 0.6, fe: 0.0, ba: 0.5, be: 0.0, w: 0 }),
    rec: P({ y: 22, lean: 1.0, head: -0.7, ft: 1.1, fk: -1.5, bt: -0.9, bk: -0.6, fa: 0.4, fe: 0.2, ba: 0.3, be: 0.2, w: 0 }),
  },
};

export const POSE_GALLERY: Array<[string, Pose]> = [
  ...Object.entries(HP),
  ...Object.entries(HUNTER_ATTACKS).flatMap(([k, v]) => [[k + '.w', v.wind], [k + '.s', v.strike]] as Array<[string, Pose]>),
];
