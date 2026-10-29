import type { Rect } from '../physics/body';

export type SwingSfx = 'slash' | 'heavy' | 'claw' | 'bash' | 'kick' | 'whip' | 'none';

export interface AttackDef {
  name: string;
  startup: number;
  active: number;
  recovery: number;
  /** Hitbox relative to feet, facing right. */
  box: Rect;
  damage: number;
  kbX: number;
  kbY: number;
  hitstun: number;
  hitstop: number;
  shake: number;
  launch?: boolean;
  knockdown?: boolean;
  spike?: boolean;
  /** Can hit knocked-down targets. */
  otg?: boolean;
  /** Low attack: goes under shields. */
  low?: boolean;
  parryable?: boolean;
  unblockable?: boolean;
  guardBreak?: boolean;
  /** Heavy attacks break shields and deal more poise damage. */
  heavy?: boolean;
  air?: boolean;
  moveX?: number;
  moveFrames?: number;
  rage?: number;
  swing?: SwingSfx;
  /** Ignores super armor / always staggers. */
  ultimate?: boolean;
  /** Spear-style: counts as heavy vs shields (front block fails). */
  pierce?: boolean;
  /** Multiplier applied to boss poise damage (defaults to heavy?1.6:1). */
  poiseScale?: number;
  /** Hitstun hierarchy: 1 light < 2 medium < 3 heavy. */
  stunTier?: 1 | 2 | 3;
  /** Multiplier on armor damage dealt. */
  armorMul?: number;
  /** Throw / grab — beats guard, ignores armor briefly. */
  throw?: boolean;
  /** Brief hyper armor while this attack's active frames run. */
  hyperArmor?: boolean;
  /**
   * Closed-set runtime cue for 普攻 physics (W3).
   * Prefer over object identity (`def === PM.*`).
   */
  combatCue?: 'plunge' | 'rising' | 'launcher';
  /** Sword-qi VFX at startup+1 (W3 data flag; replaces PM.finisher|launcher|… identity). */
  swordQi?: boolean;
}

export interface AttackInst {
  def: AttackDef;
  f: number;
  hit: Set<object>;
}

export function phaseOf(a: AttackInst): 'startup' | 'active' | 'recovery' | 'done' {
  const d = a.def;
  if (a.f < d.startup) return 'startup';
  if (a.f < d.startup + d.active) return 'active';
  if (a.f < d.startup + d.active + d.recovery) return 'recovery';
  return 'done';
}

export const totalFrames = (d: AttackDef) => d.startup + d.active + d.recovery;
