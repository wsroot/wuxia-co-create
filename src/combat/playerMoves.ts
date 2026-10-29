/**
 * Core attack-box seed tables (普攻 / 空手 / 外功盒几何) + 普攻链风格种子 (W3).
 * 外功 / SkillDef.attackKey / attackChain: CORE_ATTACK_BOXES → ctx.attacks；只经 getAttackBox(id) (W1)。
 * 普攻：chooseAttack 读 AttackChainStyle（attackKeys）+ resolveAttack；runtime 认 combatCue / name，不比对象身份。
 */
import type { AttackDef } from './types';

const base = { hitstun: 22, hitstop: 5, shake: 3, kbY: 0, rage: 4, swing: 'slash' as const };

export const PM = {
  slash1: { ...base, name: 'slash1', stunTier: 1 as const, startup: 4, active: 4, recovery: 13, box: { x: 0, y: -84, w: 74, h: 70 }, damage: 8, kbX: 2.4, moveX: 3.2, moveFrames: 7 },
  slash2: { ...base, name: 'slash2', stunTier: 1 as const, startup: 4, active: 4, recovery: 13, box: { x: 0, y: -96, w: 74, h: 84 }, damage: 9, kbX: 2.6, moveX: 3.2, moveFrames: 7 },
  slash3: { ...base, name: 'slash3', stunTier: 2 as const, startup: 5, active: 5, recovery: 14, box: { x: -10, y: -82, w: 88, h: 66 }, damage: 10, kbX: 3.2, moveX: 3.8, moveFrames: 8, hitstop: 6, shake: 4 },
  finisherPoise: { ...base, name: 'finisherPoise', stunTier: 3 as const, hyperArmor: true, armorMul: 1.55, startup: 9, active: 5, recovery: 20, box: { x: 0, y: -110, w: 96, h: 110 }, damage: 16, kbX: 8, kbY: -4, knockdown: true, heavy: true, hitstun: 36, hitstop: 11, shake: 9, moveX: 5, moveFrames: 11, rage: 7, swing: 'heavy' as const, poiseScale: 2.4 },
  finisherDrain: { ...base, name: 'finisherDrain', stunTier: 3 as const, hyperArmor: true, armorMul: 1.2, startup: 8, active: 6, recovery: 18, box: { x: 4, y: -100, w: 100, h: 100 }, damage: 15, kbX: 14, kbY: -2, knockdown: true, heavy: true, hitstun: 30, hitstop: 10, shake: 8, moveX: 8, moveFrames: 10, rage: 6, swing: 'heavy' as const },
  finisher: { ...base, name: 'finisher', swordQi: true, stunTier: 3 as const, hyperArmor: true, armorMul: 1.4, startup: 10, active: 5, recovery: 22, box: { x: 0, y: -110, w: 92, h: 110 }, damage: 18, kbX: 10, kbY: -5, knockdown: true, heavy: true, hitstun: 34, hitstop: 11, shake: 9, moveX: 5.5, moveFrames: 12, rage: 8, swing: 'heavy' as const },
  launcher: { ...base, name: 'launcher', combatCue: 'launcher' as const, swordQi: true, stunTier: 3 as const, armorMul: 1.25, startup: 6, active: 6, recovery: 16, box: { x: -4, y: -130, w: 70, h: 130 }, damage: 12, kbX: 1.2, kbY: -10.5, launch: true, heavy: true, hitstun: 40, hitstop: 7, shake: 6, rage: 6, swing: 'heavy' as const },
  sweep: { ...base, name: 'sweep', stunTier: 2 as const, startup: 6, active: 5, recovery: 18, box: { x: -6, y: -36, w: 88, h: 36 }, damage: 10, kbX: 3, kbY: -5.5, knockdown: true, low: true, otg: true, hitstop: 6, shake: 4 },
  dashKick: { ...base, name: 'dashKick', swordQi: true, stunTier: 3 as const, armorMul: 1.3, startup: 3, active: 8, recovery: 16, box: { x: 0, y: -70, w: 60, h: 50 }, damage: 14, kbX: 12, kbY: -3.5, knockdown: true, heavy: true, hitstop: 9, shake: 8, moveX: 9, moveFrames: 10, rage: 6, swing: 'kick' as const },
  airA: { ...base, name: 'airA', stunTier: 2 as const, startup: 3, active: 4, recovery: 11, box: { x: -6, y: -100, w: 80, h: 96 }, damage: 7, kbX: 1.3, kbY: -5.4, air: true, hitstun: 30, moveX: 1.4, moveFrames: 7 },
  airB: { ...base, name: 'airB', stunTier: 2 as const, startup: 3, active: 4, recovery: 11, box: { x: -6, y: -100, w: 80, h: 96 }, damage: 7, kbX: 1.3, kbY: -5.4, air: true, hitstun: 30, moveX: 1.4, moveFrames: 7 },
  rising: { ...base, name: 'rising', combatCue: 'rising' as const, stunTier: 3 as const, startup: 4, active: 7, recovery: 12, box: { x: -4, y: -130, w: 70, h: 130 }, damage: 11, kbX: 1, kbY: -9.5, launch: true, heavy: true, hitstop: 7, shake: 5, rage: 6, swing: 'heavy' as const },
  plunge: { ...base, name: 'plunge', combatCue: 'plunge' as const, stunTier: 3 as const, armorMul: 1.35, startup: 6, active: 2, recovery: 14, box: { x: -20, y: -80, w: 72, h: 90 }, damage: 14, kbX: 3, kbY: 10, spike: true, heavy: true, otg: true, hitstop: 8, shake: 8, rage: 6, swing: 'heavy' as const },
  counter: { ...base, name: 'counter', swordQi: true, stunTier: 3 as const, armorMul: 1.5, startup: 3, active: 6, recovery: 16, box: { x: -10, y: -110, w: 104, h: 104 }, damage: 30, kbX: 11, kbY: -6, knockdown: true, heavy: true, hitstun: 40, hitstop: 12, shake: 10, moveX: 9, moveFrames: 6, rage: 10, swing: 'heavy' as const, ultimate: true },
  /** →↓+攻 抓投 — beats guard, ignores armor briefly. */
  throw: { ...base, name: 'throw', startup: 5, active: 4, recovery: 20, box: { x: -8, y: -90, w: 56, h: 90 }, damage: 16, kbX: 5, kbY: -7, knockdown: true, heavy: true, unblockable: true, throw: true, stunTier: 3 as const, armorMul: 2, hitstun: 36, hitstop: 10, shake: 8, moveX: 4, moveFrames: 6, rage: 7, swing: 'bash' as const },
} satisfies Record<string, AttackDef>;

/** @deprecated Prefer BLADE_CHAIN_STYLE.groundKeys + resolveAttack (W3). Kept for debug __wep. */
export const GROUND_CHAIN: AttackDef[] = [PM.slash1, PM.slash2, PM.slash3, PM.finisher];

/** 空手拳掌爪 — short, spammy. */
export const BARE = {
  jab1: { ...base, name: 'jab1', startup: 3, active: 3, recovery: 8, box: { x: 4, y: -78, w: 42, h: 48 }, damage: 5, kbX: 1.4, moveX: 2.2, moveFrames: 5, stunTier: 1 as const, swing: 'kick' as const },
  jab2: { ...base, name: 'jab2', startup: 3, active: 3, recovery: 8, box: { x: 4, y: -82, w: 44, h: 52 }, damage: 5, kbX: 1.5, moveX: 2.4, moveFrames: 5, stunTier: 1 as const, swing: 'kick' as const },
  palm: { ...base, name: 'palm', startup: 5, active: 4, recovery: 12, box: { x: 0, y: -88, w: 54, h: 60 }, damage: 8, kbX: 4.5, kbY: -2, stunTier: 2 as const, hitstop: 6, shake: 4, moveX: 3.2, moveFrames: 7, swing: 'bash' as const },
  claw: { ...base, name: 'claw', startup: 4, active: 5, recovery: 11, box: { x: 2, y: -92, w: 50, h: 64 }, damage: 7, kbX: 2.0, stunTier: 2 as const, hitstop: 5, moveX: 2.6, moveFrames: 6, swing: 'claw' as const },
  hook: { ...base, name: 'hook', startup: 4, active: 4, recovery: 10, box: { x: -4, y: -86, w: 52, h: 56 }, damage: 7, kbX: 2.2, moveX: 2.8, moveFrames: 6, stunTier: 2 as const, hitstop: 5, swing: 'kick' as const },
  kick: { ...base, name: 'bareKick', startup: 6, active: 5, recovery: 14, box: { x: 0, y: -70, w: 58, h: 50 }, damage: 11, kbX: 6, kbY: -3, knockdown: true, heavy: true, stunTier: 3 as const, hitstun: 28, hitstop: 7, shake: 5, moveX: 3.5, moveFrames: 8, rage: 5, swing: 'kick' as const, armorMul: 0.85 },
  bengquan: { ...base, name: 'bengquan', startup: 7, active: 5, recovery: 18, box: { x: -6, y: -95, w: 62, h: 72 }, damage: 20, kbX: 9, kbY: -4, knockdown: true, heavy: true, stunTier: 3 as const, hyperArmor: true, armorMul: 1.6, hitstun: 36, hitstop: 10, shake: 9, moveX: 5, moveFrames: 8, rage: 8, swing: 'bash' as const },
  huzhua: { ...base, name: 'huzhua', startup: 4, active: 4, recovery: 8, box: { x: 0, y: -90, w: 56, h: 70 }, damage: 9, kbX: 3, stunTier: 2 as const, hitstop: 5, moveX: 3, moveFrames: 5, swing: 'claw' as const, armorMul: 1.2 },
  huzhua2: { ...base, name: 'huzhua2', startup: 3, active: 4, recovery: 8, box: { x: -4, y: -94, w: 58, h: 72 }, damage: 10, kbX: 3.5, stunTier: 2 as const, hitstop: 5, moveX: 3.2, moveFrames: 5, swing: 'claw' as const },
  huzhua3: { ...base, name: 'huzhua3', startup: 3, active: 5, recovery: 14, box: { x: -8, y: -100, w: 64, h: 80 }, damage: 14, kbX: 7, kbY: -5, knockdown: true, heavy: true, stunTier: 3 as const, hitstun: 32, hitstop: 8, shake: 7, moveX: 4, moveFrames: 6, swing: 'claw' as const, armorMul: 1.3 },
  daomang: { ...base, name: 'daomang', startup: 6, active: 5, recovery: 16, box: { x: 0, y: -100, w: 100, h: 80 }, damage: 18, kbX: 8, kbY: -3, knockdown: true, heavy: true, stunTier: 3 as const, hitstun: 32, hitstop: 9, shake: 8, moveX: 6, moveFrames: 8, rage: 7, swing: 'slash' as const, armorMul: 1.25 },
  qiangjue: { ...base, name: 'qiangjue', startup: 5, active: 6, recovery: 15, box: { x: 8, y: -88, w: 110, h: 48 }, damage: 17, kbX: 10, pierce: true, heavy: true, stunTier: 3 as const, hitstun: 30, hitstop: 8, shake: 7, moveX: 7, moveFrames: 7, rage: 7, swing: 'slash' as const, armorMul: 1.5 },
  huixuan: { ...base, name: 'huixuan', startup: 5, active: 7, recovery: 15, box: { x: -20, y: -95, w: 120, h: 90 }, damage: 15, kbX: 6, kbY: -2, knockdown: true, heavy: true, stunTier: 3 as const, hitstun: 28, hitstop: 8, shake: 7, moveX: 4, moveFrames: 8, rage: 6, swing: 'slash' as const, armorMul: 1.15 },
  zhanma: { ...base, name: 'zhanma', startup: 7, active: 5, recovery: 17, box: { x: -4, y: -140, w: 70, h: 140 }, damage: 19, kbX: 3, kbY: -8, launch: true, heavy: true, stunTier: 3 as const, hitstun: 36, hitstop: 9, shake: 8, moveX: 3, moveFrames: 7, rage: 7, swing: 'heavy' as const, armorMul: 1.3 },
  tuci: { ...base, name: 'tuci', startup: 4, active: 6, recovery: 14, box: { x: 12, y: -80, w: 130, h: 40 }, damage: 14, kbX: 11, pierce: true, heavy: true, stunTier: 2 as const, hitstun: 26, hitstop: 7, shake: 6, moveX: 9, moveFrames: 8, rage: 6, swing: 'slash' as const, armorMul: 1.4 },
  chuanxin: { ...base, name: 'chuanxin', startup: 6, active: 5, recovery: 16, box: { x: 10, y: -85, w: 118, h: 44 }, damage: 16, kbX: 9, pierce: true, heavy: true, stunTier: 3 as const, hitstun: 32, hitstop: 9, shake: 8, moveX: 8, moveFrames: 7, rage: 7, swing: 'slash' as const, armorMul: 1.55, poiseScale: 2.6 },
  hengsao: { ...base, name: 'hengsao', startup: 7, active: 6, recovery: 18, box: { x: -16, y: -90, w: 130, h: 80 }, damage: 17, kbX: 8, kbY: -3, knockdown: true, heavy: true, stunTier: 3 as const, hitstun: 34, hitstop: 10, shake: 9, moveX: 5, moveFrames: 9, rage: 7, swing: 'heavy' as const, armorMul: 1.45, poiseScale: 2.2 },
  kaitian: { ...base, name: 'kaitian', startup: 9, active: 5, recovery: 22, box: { x: -8, y: -115, w: 100, h: 115 }, damage: 24, kbX: 10, kbY: -5, knockdown: true, heavy: true, stunTier: 3 as const, hyperArmor: true, hitstun: 40, hitstop: 12, shake: 11, moveX: 4, moveFrames: 10, rage: 9, swing: 'heavy' as const, armorMul: 1.7, poiseScale: 2.8 },
  tieshan: { ...base, name: 'tieshan', startup: 5, active: 5, recovery: 14, box: { x: -4, y: -95, w: 58, h: 80 }, damage: 14, kbX: 10, kbY: -1, knockdown: true, heavy: true, stunTier: 3 as const, hyperArmor: true, hitstun: 30, hitstop: 8, shake: 7, moveX: 7, moveFrames: 8, rage: 6, swing: 'bash' as const, armorMul: 1.8 },
  fanyun: { ...base, name: 'fanyun', startup: 5, active: 6, recovery: 15, box: { x: 0, y: -120, w: 60, h: 110 }, damage: 13, kbX: 2, kbY: -11, launch: true, heavy: true, stunTier: 3 as const, hitstun: 38, hitstop: 8, shake: 7, moveX: 3, moveFrames: 6, rage: 6, swing: 'kick' as const, armorMul: 1.1 },
} satisfies Record<string, AttackDef>;

/** @deprecated Prefer BARE_CHAIN_STYLE.groundKeys + resolveAttack (W3). */
export const BARE_CHAIN: AttackDef[] = [BARE.jab1, BARE.jab2, BARE.palm, BARE.claw, BARE.kick];

/** Plunge landing shockwave. */
export const PLUNGE_WAVE: AttackDef = { ...base, name: 'plungeWave', startup: 0, active: 1, recovery: 0, box: { x: 0, y: 0, w: 0, h: 0 }, damage: 8, kbX: 4, kbY: -6, knockdown: true, otg: true, low: true, hitstop: 5, shake: 6 };

export const SUPER_SLASH: AttackDef = { ...base, name: 'superSlash', startup: 0, active: 1, recovery: 0, box: { x: 0, y: 0, w: 0, h: 0 }, damage: 16, kbX: 0.5, kbY: -2.5, hitstun: 70, hitstop: 3, shake: 6, ultimate: true, otg: true, heavy: true, rage: 0 };
export const SUPER_FINAL: AttackDef = { ...base, name: 'superFinal', startup: 0, active: 1, recovery: 0, box: { x: 0, y: 0, w: 0, h: 0 }, damage: 48, kbX: 6, kbY: -11, launch: true, hitstun: 60, hitstop: 14, shake: 16, ultimate: true, otg: true, heavy: true, rage: 0 };

/* ── W3: 普攻链风格（软引用 attackKeys = AttackDef.name / ctx.attacks id） ── */

export type CombatCue = NonNullable<AttackDef['combatCue']>;

/** Data-driven 普攻套路：换链只改本表，player.ts 不比对象身份。 */
export interface AttackChainStyle {
  id: string;
  /** Neutral ground combo steps (attackKeys). */
  groundKeys: readonly string[];
  branches: {
    dash: string;
    groundUp: string;
    groundDown: string;
    airDown: string;
    airUp: string;
    /** Alternating air neutrals. */
    airNeutral: readonly [string, string];
    finisherPoise?: string;
    finisherDrain?: string;
    throw: string;
  };
  /** Attack names that do not open the post-recovery chain window. */
  noChainOpen: readonly string[];
  /** Landing shockwave for plunge-cue moves. */
  plungeWaveKey?: string;
}

export const BLADE_CHAIN_STYLE: AttackChainStyle = {
  id: 'blade',
  groundKeys: ['slash1', 'slash2', 'slash3', 'finisher'],
  branches: {
    dash: 'dashKick',
    groundUp: 'launcher',
    groundDown: 'sweep',
    airDown: 'plunge',
    airUp: 'rising',
    airNeutral: ['airA', 'airB'],
    finisherPoise: 'finisherPoise',
    finisherDrain: 'finisherDrain',
    throw: 'throw',
  },
  noChainOpen: ['finisher', 'finisherPoise', 'finisherDrain', 'throw', 'plunge'],
  plungeWaveKey: 'plungeWave',
};

export const BARE_CHAIN_STYLE: AttackChainStyle = {
  id: 'bare',
  groundKeys: ['jab1', 'jab2', 'palm', 'claw', 'bareKick'],
  branches: {
    dash: 'dashKick',
    groundUp: 'claw',
    groundDown: 'palm',
    airDown: 'bareKick',
    airUp: 'claw',
    airNeutral: ['airA', 'airB'],
    throw: 'throw',
  },
  noChainOpen: ['bareKick', 'throw', 'plunge'],
  plungeWaveKey: 'plungeWave',
};

/** Core seed lookup by AttackDef.name (fallback when catalog miss). */
export const SEED_BY_NAME: Record<string, AttackDef> = {
  ...Object.fromEntries(Object.values(PM).map((d) => [d.name, d])),
  ...Object.fromEntries(Object.values(BARE).map((d) => [d.name, d])),
  [PLUNGE_WAVE.name]: PLUNGE_WAVE,
  [SUPER_SLASH.name]: SUPER_SLASH,
  [SUPER_FINAL.name]: SUPER_FINAL,
};

/** Catalog-facing name for AttackChainStyle (ctx.combatStyles). */
export type CombatStyleDef = AttackChainStyle;

/** Oc4: CORE_COMBAT_STYLES 字面量已迁 changye/seeds/combatStyles（勿从此文件 re-export，以免与 BLADE/BARE 循环依赖）。 */

/** Default style id from weapon category (bare → bare; else blade). */
export function categoryDefaultCombatStyleId(category: string | undefined): 'bare' | 'blade' {
  return category === 'bare' ? 'bare' : 'blade';
}

/**
 * Seed-only helper (no catalog). Prefer `resolveCombatStyle` from contentRegistry
 * so content-pack styles and WeaponDef.combatStyleId are honored.
 * @deprecated Use resolveCombatStyle / getCombatStyle.
 */
export function chainStyleFor(bare: boolean): AttackChainStyle {
  return bare ? BARE_CHAIN_STYLE : BLADE_CHAIN_STYLE;
}

export function hasCombatCue(def: AttackDef, cue: CombatCue): boolean {
  return def.combatCue === cue;
}
