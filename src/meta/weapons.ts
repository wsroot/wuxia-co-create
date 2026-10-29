/**
 * Weapon catalog — main growth axis (Never Gone–style).
 *
 * === Balance table (Lv.1 base, post-tune 2026-10) ===
 * id      dmg   spd   reach  poise  rage  air   aff%   craft
 * silver  1.00  1.00  1.00   1.00   1.00  1.00  —      starter
 * thorn   0.70  0.70  0.70   0.62   1.12  1.40  18     70
 * spear   0.86  0.92  1.48   0.98   0.88  0.88  22     95
 * axe     1.40  1.40  1.06   1.90   0.82  0.52  18     115
 * twin    0.84  0.82  0.90   0.82   1.55  1.12  18     140*
 * bell    1.10  1.20  1.14   1.42   0.98  0.72  22†    boss clear
 *   * eliteDrop ~8% or craftFallback 140
 *   † bossGargoyle (+ antiArmor); trash hits also ×0.90 in runtime
 *
 * Weight → hitstop/shake/kb + cancel window (see weaponRuntime / player.canChain).
 * Upgrade Lv2–5 costs: 25 / 50 / 85 / 130 / 185 血晶
 *   each level: +3.5% damage, +6% poise, +2.5% rage (on that weapon only)
 *
 * Power band intent:
 *   - fresh silver clears stage with parries/skill
 *   - maxed craft weapons help but do not delete boss without defense
 *   - bell affinity rewarding (~+22%) but not a 5-hit delete
 */

import { getWeapon, listWeapons, weaponMapView } from './contentRegistry';
import type { CraftData } from './craft';

/** Built-in weapon ids (type-safe helpers / craft tables). */
export type CoreWeaponId =
  | 'ironfist' | 'clawglove' | 'silver' | 'thorn' | 'twin' | 'dao' | 'softsword'
  | 'spear' | 'halberd' | 'pike' | 'axe' | 'hammer' | 'guandao' | 'bell';

/** Runtime / save id — any registered weapon (core or a loaded 内容包). */
export type WeaponId = string;

export type Affinity =
  | 'bossGargoyle'
  | 'shieldBreak'
  | 'antiArmor'
  | 'juggle'
  | 'dashFocus'
  | 'rage';

export type BladeShape = 'sword' | 'dagger' | 'axe' | 'spear' | 'twin' | 'greatsword';
export type WeaponWeight = 'light' | 'medium' | 'heavy';

/** Gates combo 外功. */
export type WeaponCategory = 'bare' | 'blade' | 'spear' | 'heavy';

export const CATEGORY_NAME: Record<WeaponCategory, string> = {
  bare: '空手',
  blade: '刀剑',
  spear: '枪系',
  heavy: '重兵',
};

export type Unlock =
  | { type: 'starter' }
  | { type: 'blueprint'; hint: string }
  | { type: 'bossClear'; hint?: string }
  | { type: 'eliteDrop'; hint: string };

export interface WeaponDef {
  id: WeaponId;
  name: string;
  lore: string;
  unlock: Unlock;
  /** Outgoing damage multiplier at weapon level 1. */
  damage: number;
  /** Timing mult: <1 faster startup/recovery. */
  speed: number;
  /** Hitbox width / forward reach. */
  reach: number;
  /** Poise damage mult (boss stagger bar). */
  poise: number;
  /** Rage gain mult from this weapon's hits. */
  rage: number;
  /** Air combo hover sustain (1 = default). */
  airHover: number;
  weight: WeaponWeight;
  category: WeaponCategory;
  affinities: Affinity[];
  /** Bonus damage when affinity matches. */
  affinityBonus: number;
  blade: string;
  trail: string;
  edge: string;
  length: number;
  shape: BladeShape;
  tip: string;
  /** 固有品质 tag (plugins set; framework owns ladder). */
  quality?: import('./taxonomy').InherentQuality;
  /** 装备阶位 1..9 (plugins set; framework owns ladder). */
  tier?: import('./taxonomy').EquipTier;
  /**
   * 手感/数值/盒形微调（取代核心按兵刃 id / shape 分支）。
   * weight 基线仍由框架处理；tip 推盒 / axe 盒扩等走 feel.boxTune。
   */
  feel?: WeaponFeel;
  /** 锻造配方（门派挂数据；核心读表）。缺则不可锻。 */
  craft?: CraftData;
  /**
   * Optional sprite. sheetId must be a registered ctx.sheets id (bundled 6 pack-registered).
   * Missing / unknown sheet → parametric shape/length/三色 fallback.
   */
  sprite?: WeaponSprite;
  /**
   * Soft ref to ctx.weaponLooks recipe. Prefer lookId for shared recipes;
   * inline `parts` override lookId when both present.
   */
  lookId?: string;
  /** Inline WeaponVisualPart[] (whitelist). Unknown kind rejected at register. */
  parts?: import('./weaponLooks').WeaponVisualPart[];
  /**
   * Soft ref to ctx.combatStyles id (普攻链套路).
   * Resolve: combatStyleId → else category bare/blade default → CORE seed fallback.
   * Missing id soft-skips to category default (does not throw).
   */
  combatStyleId?: string;
}

/** Plugin-facing weapon sprite ref (no URL / no arbitrary PNG). */
export interface WeaponSprite {
  sheetId: string;
  frame?: number;
  /** Pixel offset from hand toward tip-axis origin inside the frame. */
  pivot?: { x: number; y: number };
  scale?: number;
}

/** Closed-set hitbox geometry tweaks (no arbitrary JS). */
export interface WeaponFeelBoxTune {
  /**
   * Tip-forward hitbox: box.x = base.box.x + round(tipXPush * reach).
   * Replaces the normal short-reach x shrink when set.
   */
  tipXPush?: number;
  /**
   * With tipXPush: floor box.w to base.box.w * reach * tipWFloorMul
   * (default 0.92 when omitted).
   */
  tipWFloorMul?: number;
  /** Per-move box width mul keyed by AttackDef.name. */
  moveBoxWMul?: Record<string, number>;
  /** Per-move box height mul keyed by AttackDef.name. */
  moveBoxHMul?: Record<string, number>;
}

/** Per-weapon hit-feel tweaks (plugin data; no core id / shape branches). */
export interface WeaponFeel {
  /** Global outgoing damage mul. */
  dmgMul?: number;
  /** Extra mul when attack is aerial. */
  airDmgMul?: number;
  /** Per-move damage mul keyed by AttackDef.name. */
  moveDmgMul?: Record<string, number>;
  /** Per-move speed mul (startup/recovery scale). */
  moveSpeedMul?: Record<string, number>;
  /** Optional hitbox geometry (spear tip / axe box widen, etc.). */
  boxTune?: WeaponFeelBoxTune;
}

export const WEAPON_LEVEL_MAX = 5;

export function weaponUpgradeCost(nextLevel: number): number {
  // nextLevel is 2..5 (level 1 is free on unlock)
  const table = [0, 0, 25, 50, 85, 130, 185];
  return table[nextLevel] ?? 9999;
}

/** Stat bump per weapon level above 1. */
export function weaponLevelBonus(level: number): { damage: number; poise: number; rage: number } {
  const n = Math.max(0, level - 1);
  return { damage: 1 + n * 0.035, poise: 1 + n * 0.06, rage: 1 + n * 0.025 };
}

/** Official 兵刃 data — registered only by 门派「长夜」(src/menpai/core). No bare/fist id. */
/** Oc5: isCore* 查官方包 id 集（字面量在 changye/seeds；不对外 re-export）。 */
import { CORE_WEAPONS } from '../content/changye/seeds/weapons';

/** Live catalog backed by the ctx.weapons service (core + loaded 内容包). */
export const WEAPONS: WeaponDef[] = listWeapons();
export const WEAPON_BY_ID: Record<string, WeaponDef> = weaponMapView();


export function isWeaponId(id: string): id is WeaponId {
  return getWeapon(id) !== undefined;
}

export function isCoreWeaponId(id: string): id is CoreWeaponId {
  return CORE_WEAPONS.some((w) => w.id === id);
}

export { getWeapon, listWeapons };

/** Hit-feel multipliers by weight class. */
export function weightFeel(w: WeaponWeight): { hitstop: number; shake: number; kb: number } {
  switch (w) {
    case 'light': return { hitstop: 0.72, shake: 0.68, kb: 0.78 };
    case 'heavy': return { hitstop: 1.28, shake: 1.4, kb: 1.22 };
    default: return { hitstop: 1, shake: 1, kb: 1 };
  }
}

export function weaponCategory(id: WeaponId): WeaponCategory {
  if (!id) return 'bare';
  return WEAPON_BY_ID[id]?.category ?? 'bare';
}

/** Weapons that can drop as blueprints / unidentified (excludes unequipped bare). */
export function blueprintEligibleWeapons(): WeaponDef[] {
  return WEAPONS.filter((w) => w.unlock.type !== 'starter' || w.id !== '');
}

/** Drop-pool candidates not yet known as blueprints. */
export function unknownBlueprintPool(knows: (id: WeaponId) => boolean): WeaponId[] {
  return WEAPONS
    .filter((w) => (w.unlock.type === 'blueprint' || w.unlock.type === 'eliteDrop' || w.unlock.type === 'bossClear') && !knows(w.id))
    .map((w) => w.id);
}
