/**
 * Hardcore fighting layers: 体力 / 护甲·破甲 / 锋锐·崩刀 / 硬直等级 / 霸体.
 * Tuned so a fresh player can still clear with skill; touch stays usable.
 */

import type { AttackDef } from './types';
import type { WeaponWeight } from '../meta/weapons';

export const STAMINA_MAX = 100;
export const SHARPNESS_MAX = 100;

/** Stamina costs (points). */
export const STA = {
  light: 7,
  medium: 10,
  heavy: 15,
  dash: 16,
  jump: 5,
  airJump: 7,
  whiff: 3,
  guardPerFrame: 0.28,
  /** Holding guard after first frames. */
  guardHold: 0.22,
  throw: 18,
} as const;

export const STA_REGEN = {
  idleGround: 0.62,
  moveGround: 0.32,
  air: 0.18,
  afterExhaust: 0.4,
} as const;

/** Frames locked in 力竭. */
export const EXHAUST_LOCK = 38;

/** Armor break debuff length (frames @60fps ≈ 3s). */
export const ARMOR_BREAK_T = 180;

/** Out-of-combat gate before armor regen. */
export const ARMOR_COMBAT_CD = 100;
export const ARMOR_REGEN = 0.18;

/** Sharpness loss. */
export const SHARP = {
  blockHeavy: 7,
  clashWin: 3,
  clashLose: 10,
  throw: 2,
} as const;

export type StunTier = 1 | 2 | 3;

export function stunTierOf(def: AttackDef): StunTier {
  if (def.stunTier) return def.stunTier;
  if (def.ultimate || def.name === 'throw' || def.name === 'counter') return 3;
  if (def.heavy || def.launch || def.knockdown) return 3;
  if (def.air || def.low) return 2;
  return 1;
}

export function staminaCostFor(def: AttackDef): number {
  if (def.name === 'throw') return STA.throw;
  const t = stunTierOf(def);
  if (t >= 3 || def.heavy) return STA.heavy;
  if (t === 2) return STA.medium;
  return STA.light;
}

/** Armor damage from an attack (before weapon affinities). */
export function armorDamageOf(def: AttackDef, opts: { antiArmor?: boolean; pojun?: boolean } = {}): number {
  let base = def.heavy || def.ultimate ? 14 : def.pierce ? 10 : 6;
  base *= def.armorMul ?? 1;
  if (opts.antiArmor) base *= 1.45;
  if (opts.pojun) base *= 1.35;
  if (def.name === 'throw') base *= 1.8;
  return base;
}

export function sharpnessDamageMul(sharpness: number): number {
  const t = Math.max(0, Math.min(1, sharpness / SHARPNESS_MAX));
  return 0.78 + t * 0.22;
}

export function weightRank(w: WeaponWeight): number {
  return w === 'heavy' ? 3 : w === 'medium' ? 2 : 1;
}

/** Clash priority: higher wins. */
export function clashPriority(def: AttackDef, weight: WeaponWeight): number {
  return weightRank(weight) * 10 + stunTierOf(def) * 3 + (def.heavy ? 2 : 0) + (def.ultimate ? 5 : 0);
}

/** Base player armor from meta (before live regen). */
export function computeMaxArmor(opts: {
  gearArmor: number;
  defPercent: number;
}): number {
  // Bare: thin 护体; gear adds plate
  return Math.round(18 + opts.gearArmor + opts.defPercent * 40);
}

export interface GearArmorBits {
  /** Flat armor points from equipped pieces. */
  points: number;
}

/** Map equipped armor bonuses → plate points. */
export function gearArmorPoints(bonuses: { hp?: number; def?: number }[]): number {
  let p = 0;
  for (const b of bonuses) {
    p += (b.hp ?? 0) * 0.35;
    p += (b.def ?? 0) * 2.2;
  }
  return Math.round(p);
}

/** 内力 — separate from 体力. */
export const NEILI_MAX_BASE = 60;
export const NEILI_REGEN_BASE = 0.12;

export function maxNeiliFor(neigongRank: number): number {
  return NEILI_MAX_BASE + Math.max(0, neigongRank) * 14;
}

export function neiliRegenFor(neigongRank: number): number {
  return NEILI_REGEN_BASE + Math.max(0, neigongRank) * 0.04;
}
