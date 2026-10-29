import type { WeaponId } from './weapons';
import type { CoreMaterialId, MaterialBag } from './materials';
import {
  type InherentQuality,
  type Quality,
  QUALITY_NAME,
  QUALITY_COLOR,
  qualityBonus,
  rollQuality,
  rollCraftQuality,
  QUALITY_DEFAULT_TIER,
} from './taxonomy';
import { getWeapon, listWeapons } from './contentRegistry';

export type { InherentQuality, Quality };
export {
  QUALITY_NAME, QUALITY_COLOR, qualityBonus, rollQuality, rollCraftQuality, QUALITY_DEFAULT_TIER,
};

/** 图纸锻造配方：数据挂在 WeaponDef.craft（门派登记）；核心只读表。 */
export interface CraftData {
  materials: MaterialBag;
  fee: number;
  /** 每级按 nextLevel 倍乘后取整。 */
  upgradeScale?: MaterialBag;
  /** 每次强化固定附加。 */
  upgradeFlat?: MaterialBag;
  /** nextLevel ≥ minLevel 时额外材料。 */
  upgradeAt?: Array<{ minLevel: number; mats: MaterialBag }>;
}

export interface CraftRecipe {
  weaponId: WeaponId;
  materials: MaterialBag;
  fee: number;
  upgradeMats: (nextLevel: number) => MaterialBag;
}

export type CraftableWeaponId = string;

export function craftUpgradeMats(data: CraftData, nextLevel: number): MaterialBag {
  const out: MaterialBag = {};
  for (const [k, v] of Object.entries(data.upgradeScale ?? {})) {
    const n = Math.floor((v ?? 0) * nextLevel);
    if (n > 0) out[k] = (out[k] ?? 0) + n;
  }
  for (const [k, v] of Object.entries(data.upgradeFlat ?? {})) {
    const n = v ?? 0;
    if (n > 0) out[k] = (out[k] ?? 0) + n;
  }
  for (const row of data.upgradeAt ?? []) {
    if (nextLevel < row.minLevel) continue;
    for (const [k, v] of Object.entries(row.mats)) {
      const n = v ?? 0;
      if (n > 0) out[k] = (out[k] ?? 0) + n;
    }
  }
  return out;
}

export function getCraftRecipe(id: string): CraftRecipe | undefined {
  const w = getWeapon(id);
  if (!w?.craft) return undefined;
  const data = w.craft;
  return {
    weaponId: id,
    materials: data.materials,
    fee: data.fee,
    upgradeMats: (n) => craftUpgradeMats(data, n),
  };
}

/** Live view：有 craft 的兵刃；缺目录则取不到（软跳过）。 */
export const CRAFT_RECIPES: Record<string, CraftRecipe> = new Proxy({} as Record<string, CraftRecipe>, {
  get(_t, prop) {
    if (typeof prop !== 'string') return undefined;
    return getCraftRecipe(prop);
  },
  has(_t, prop) {
    return typeof prop === 'string' && !!getWeapon(prop)?.craft;
  },
  ownKeys() {
    return listWeapons().filter((w) => w.craft).map((w) => w.id);
  },
  getOwnPropertyDescriptor(_t, prop) {
    if (typeof prop !== 'string' || !getWeapon(prop)?.craft) return undefined;
    return { configurable: true, enumerable: true, value: getCraftRecipe(prop) };
  },
});

/** 鉴定手续费（血晶）。品质越好略贵——未鉴定时先收基础费。 */
export const IDENTIFY_FEE = 20;

/** Special ground-loot tints (not gear qualities). */
export const LOOT_TINT = {
  /** Unidentified gear — purple mystery glow. */
  unidentified: '#c060ff',
  /** Blueprint / unique. */
  blueprint: '#ffd27a',
  crystal: '#ff6a8a',
  potion: '#ff3050',
} as const;

/**
 * Material rarity → inherent quality tint for ground loot.
 * iron/bone/herb/hide = 凡 · silk/cinnabar/coal = 黄 · xuaniron/spiritjade = 玄 · yaohe = 地
 */
const _MATERIAL_QUALITY = {
  iron: 'fan',
  bone: 'fan',
  herb: 'fan',
  hide: 'fan',
  silk: 'huang',
  cinnabar: 'huang',
  coal: 'huang',
  xuaniron: 'xuan',
  spiritjade: 'xuan',
  yaohe: 'di',
} as const satisfies Record<CoreMaterialId, InherentQuality>;

export const MATERIAL_QUALITY: Record<string, InherentQuality> = _MATERIAL_QUALITY;

/** Per-copy base-stat variance (damage / poise), ±8%, bell-shaped. */
export const STAT_ROLL_SPREAD = 0.08;
export const STAT_ROLL_MIN = 1 - STAT_ROLL_SPREAD;
export const STAT_ROLL_MAX = 1 + STAT_ROLL_SPREAD;

export function rollStatMul(rng = Math.random): number {
  const t = (rng() + rng()) / 2; // 0..1, peaks at 0.5
  const v = STAT_ROLL_MIN + t * (STAT_ROLL_MAX - STAT_ROLL_MIN);
  return Math.round(v * 100) / 100;
}

/** Sanitize a stored roll (missing → neutral 1.00). */
export function statRoll(v: number | undefined): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 1;
  return Math.max(STAT_ROLL_MIN, Math.min(STAT_ROLL_MAX, Math.round(v * 100) / 100));
}

