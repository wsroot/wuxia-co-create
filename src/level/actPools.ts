/**
 * 四幕专属：Boss 套路权重 / 精英词条权重 / 掉落偏向.
 *
 * Built-in pools are registered by the official 门派 via ctx.acts.pool().
 * actPool(i) reads the ctx.acts service.
 *
 * Boss move weights register via ctx.bossKits (kit id → close/far tables).
 * Affix / elite / enemy *defs* register via ctx.affixes / ctx.eliteMods / ctx.enemies.
 */
import type { EliteModId } from './eliteMods';
import type { MaterialId } from '../meta/materials';
import type { WeaponId } from '../meta/weapons';
import type { BossTint } from '../entities/boss/gargoyle';
import type { ArmorSetId } from '../meta/armorSets';
import {
  listActPools, getActPoolByIndex, getBossKit, listBossKits, bossKitMapView,
} from '../meta/contentRegistry';

/** Official kit ids (长夜包四套默认：stone/rain/tomb/night). */
export type BossKit = 'stone' | 'rain' | 'tomb' | 'night';

export interface BossMoveWeight {
  move: string;
  weight: number;
}

/** Cordis catalog entry — official 长夜 registers one per core BossKit; packs may add more. */
export interface BossKitDef {
  id: string;
  /** Close-range move weights. `roar` weight is the ready value (runtime zeros on CD). */
  close: BossMoveWeight[];
  /** Far-range move weights. */
  far: BossMoveWeight[];
}

export interface ActPool {
  /** Soft-ref ctx.bossKits id (open string; Stage/Enemy aligned — Act1.5). */
  kit: string;
  tint: BossTint;
  /** Relative weights for elite mods. */
  eliteWeights: Partial<Record<EliteModId, number>>;
  /** Materials favored in act chests / clears. */
  dropLean: MaterialId[];
  /** Blueprint lean for rare drops. */
  blueprintLean: WeaponId[];
  /** Named armor set bias for drops. */
  setLean: ArmorSetId[];
  loreLine: string;
}

/** Live act-pool catalog (actIndex slot === list index; 字面量由 changye 登记). */
export const ACT_POOLS: ActPool[] = listActPools();

/** Live boss-kit catalog. */
export const BOSS_KITS: BossKitDef[] = listBossKits();
export const BOSS_KIT_BY_ID: Record<string, BossKitDef> = bossKitMapView();

export function actPool(actIndex: number): ActPool {
  return getActPoolByIndex(actIndex);
}

export function rollEliteModForAct(
  actIndex: number,
  rng = Math.random,
  weightOverride?: Record<string, number> | null,
): EliteModId {
  const base = actPool(actIndex).eliteWeights as Record<string, number>;
  const w = weightOverride && Object.keys(weightOverride).length
    ? { ...base, ...weightOverride }
    : base;
  const entries = (Object.entries(w) as [EliteModId, number][]).filter(([, n]) => n > 0);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  let r = rng() * total;
  for (const [id, n] of entries) {
    r -= n;
    if (r <= 0) return id;
  }
  return entries[0]?.[0] ?? 'tongpi';
}

/**
 * Boss AI move weights by kit (close / far).
 * Reads ctx.bossKits; zeros roar when not ready. Missing kit → walk fallback.
 */
export function bossMoveWeights(kit: string, close: boolean, roarReady: boolean): Array<[string, number]> {
  const def = getBossKit(kit);
  const rows = def ? (close ? def.close : def.far) : [];
  if (!rows.length) return [['walk', 1]];
  return rows.map(({ move, weight }) => [
    move,
    move === 'roar' && !roarReady ? 0 : weight,
  ]);
}

export { getActPoolByIndex, listActPools, getBossKit, listBossKits } from '../meta/contentRegistry';
