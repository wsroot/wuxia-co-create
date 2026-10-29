/**
 * 具名防具套装 — 掉落赋 setId；鉴定雾名；2/4 件激活。
 * 品质「影」见 setEcho.ts，仅在无具名 2 件时作微弱兜底。
 */
import type { ArmorSlotKind } from './gear';
import type { GearItem } from './types';
import { getArmorSet, listArmorSets, armorSetMapView } from './contentRegistry';

/** Built-in 套装 ids. */
export type CoreArmorSetId =
  | 'yexing'      // 夜行残响
  | 'tiegu'       // 铁骨僧衣
  | 'yinixue'     // 饮血罗刹
  | 'pojunrui'    // 破军锐意
  | 'qingxinding' // 清心定魂
  | 'anhunling'   // 安魂铃绪
  | 'yingzhi';    // 影织（泛用）

/** Runtime id — any registered armor set. */
export type ArmorSetId = string;

export interface SetBonusNums {
  def?: number;
  atk?: number;
  dashCdMul?: number;
  dashIframes?: number;
  dmgTakenMul?: number;
  lifesteal?: number;
  executeMul?: number;
  poiseMul?: number;
  neiliRegenMul?: number;
  parryWindowBonus?: number;
  /** Affix / hazard DOT taken multiplier (<1 = resist). */
  affixDmgMul?: number;
  /** Soft curse (黑残页) taken mul. */
  curseTakenMul?: number;
  rage?: number;
}

export interface ArmorSetDef {
  id: ArmorSetId;
  fogName: string;
  name: string;
  lore: string;
  /** Slots this set can roll onto. */
  slots: ArmorSlotKind[];
  /** Relative drop weight when rolling setId. */
  weight: number;
  two: SetBonusNums;
  /** Full set (4 pieces; 3 also grants a soft step toward full if only 3 slots worn — we use >=4 or >=3 for small sets). */
  full: SetBonusNums;
  twoTip: string;
  fullTip: string;
}

/** Built-in 防具套装 — registered by the official 内容包 (src/content/core). */
/** Oc5: isCore* 查官方包 id 集（字面量在 changye/seeds；不对外 re-export）。 */
import { CORE_ARMOR_SETS } from '../content/changye/seeds/armorSets';

/** Live catalog backed by ctx.armorSets. */
export const ARMOR_SETS: ArmorSetDef[] = listArmorSets();
export const ARMOR_SET_BY_ID: Record<string, ArmorSetDef> = armorSetMapView();

export function isArmorSetId(id: string): id is ArmorSetId {
  return getArmorSet(id) !== undefined;
}

export function isCoreArmorSetId(id: string): id is CoreArmorSetId {
  return CORE_ARMOR_SETS.some((s) => s.id === id);
}

export { getArmorSet, listArmorSets };

/** Weighted roll; null = no set (plain armor). ~62% get a set. */
export function rollArmorSetId(
  slot: ArmorSlotKind,
  opts: { bias?: ArmorSetId[]; elite?: boolean; rng?: () => number } = {},
): ArmorSetId | null {
  const rng = opts.rng ?? Math.random;
  const chance = opts.elite ? 0.78 : 0.58;
  if (rng() > chance) return null;
  let pool = ARMOR_SETS.filter((s) => s.slots.includes(slot));
  if (!pool.length) return null;
  if (opts.bias?.length) {
    const biased = pool.filter((s) => opts.bias!.includes(s.id));
    if (biased.length && rng() < 0.55) pool = biased;
  }
  let total = 0;
  for (const s of pool) total += s.weight;
  let r = rng() * total;
  for (const s of pool) {
    r -= s.weight;
    if (r <= 0) return s.id;
  }
  return pool[pool.length - 1]!.id;
}

export interface NamedSetState {
  id: ArmorSetId | null;
  count: number;
  revealed: boolean;
  /** pieces equipped of this set */
  pieces: number;
}

/** Best named set among equipped armor (by count, then full bonus priority). */
export function computeNamedSet(
  equippedArmor: GearItem[],
  known: ArmorSetId[],
): NamedSetState {
  const counts: Partial<Record<ArmorSetId, number>> = {};
  for (const g of equippedArmor) {
    if (!g.identified || g.kind !== 'armor' || !g.setId) continue;
    if (!isArmorSetId(g.setId)) continue;
    counts[g.setId] = (counts[g.setId] ?? 0) + 1;
  }
  let best: ArmorSetId | null = null;
  let n = 0;
  for (const s of ARMOR_SETS) {
    const c = counts[s.id] ?? 0;
    if (c > n) { n = c; best = s.id; }
  }
  if (!best || n < 2) return { id: null, count: 0, revealed: false, pieces: 0 };
  const revealed = known.includes(best) || n >= 3;
  return { id: best, count: n, revealed, pieces: n };
}

export function mergeSetBonuses(a: SetBonusNums, b: SetBonusNums): SetBonusNums {
  const out: SetBonusNums = {};
  const def = (a.def ?? 0) + (b.def ?? 0); if (def) out.def = def;
  const atk = (a.atk ?? 0) + (b.atk ?? 0); if (atk) out.atk = atk;
  const dcd = (a.dashCdMul ?? 1) * (b.dashCdMul ?? 1); if (dcd !== 1) out.dashCdMul = dcd;
  const dif = (a.dashIframes ?? 0) + (b.dashIframes ?? 0); if (dif) out.dashIframes = dif;
  const dtm = (a.dmgTakenMul ?? 1) * (b.dmgTakenMul ?? 1); if (dtm !== 1) out.dmgTakenMul = dtm;
  const ls = (a.lifesteal ?? 0) + (b.lifesteal ?? 0); if (ls) out.lifesteal = ls;
  const ex = (a.executeMul ?? 1) * (b.executeMul ?? 1); if (ex !== 1) out.executeMul = ex;
  const pm = (a.poiseMul ?? 1) * (b.poiseMul ?? 1); if (pm !== 1) out.poiseMul = pm;
  const nr = (a.neiliRegenMul ?? 1) * (b.neiliRegenMul ?? 1); if (nr !== 1) out.neiliRegenMul = nr;
  const pw = (a.parryWindowBonus ?? 0) + (b.parryWindowBonus ?? 0); if (pw) out.parryWindowBonus = pw;
  const af = (a.affixDmgMul ?? 1) * (b.affixDmgMul ?? 1); if (af !== 1) out.affixDmgMul = af;
  const cu = (a.curseTakenMul ?? 1) * (b.curseTakenMul ?? 1); if (cu !== 1) out.curseTakenMul = cu;
  const rg = (a.rage ?? 0) + (b.rage ?? 0); if (rg) out.rage = rg;
  return out;
}

export function activeSetBonuses(state: NamedSetState): SetBonusNums {
  if (!state.id || state.count < 2) return {};
  const def = ARMOR_SET_BY_ID[state.id];
  if (!def) return {};
  if (state.count >= 4) return mergeSetBonuses(def.two, def.full);
  // 3pc: two + half step toward full (soft)
  if (state.count >= 3) {
    const f = def.full;
    const half: SetBonusNums = {};
    if (f.def) half.def = f.def * 0.5;
    if (f.atk) half.atk = f.atk * 0.5;
    if (f.dashCdMul != null) half.dashCdMul = 1 - (1 - f.dashCdMul) * 0.5;
    if (f.dashIframes) half.dashIframes = Math.floor(f.dashIframes / 2);
    if (f.dmgTakenMul != null) half.dmgTakenMul = 1 - (1 - f.dmgTakenMul) * 0.5;
    if (f.lifesteal) half.lifesteal = f.lifesteal * 0.5;
    if (f.executeMul != null) half.executeMul = 1 + (f.executeMul - 1) * 0.5;
    if (f.poiseMul != null) half.poiseMul = 1 + (f.poiseMul - 1) * 0.5;
    if (f.neiliRegenMul != null) half.neiliRegenMul = 1 + (f.neiliRegenMul - 1) * 0.5;
    if (f.parryWindowBonus) half.parryWindowBonus = Math.floor(f.parryWindowBonus / 2);
    if (f.affixDmgMul != null) half.affixDmgMul = 1 - (1 - f.affixDmgMul) * 0.5;
    if (f.curseTakenMul != null) half.curseTakenMul = 1 - (1 - f.curseTakenMul) * 0.5;
    if (f.rage) half.rage = f.rage * 0.5;
    return mergeSetBonuses(def.two, half);
  }
  return { ...def.two };
}

export function namedSetLabel(state: NamedSetState): string {
  if (!state.id || state.count < 2) return '';
  const d = ARMOR_SET_BY_ID[state.id];
  if (!d) return '';
  const tier = state.count >= 4 ? '四件' : state.count >= 3 ? '三件' : '两件';
  if (!state.revealed) return `${d.fogName}（${state.count}）`;
  return `${d.name}·${tier}`;
}

export function setDisplayName(id: ArmorSetId, known: boolean): string {
  const d = ARMOR_SET_BY_ID[id];
  if (!d) return id;
  return known ? d.name : d.fogName;
}

/** Bag progress for hub: how many identified pieces per set. */
export function setProgressInBag(bag: GearItem[]): Record<ArmorSetId, number> {
  const out = Object.fromEntries(ARMOR_SETS.map((s) => [s.id, 0])) as Record<ArmorSetId, number>;
  for (const g of bag) {
    if (g.kind !== 'armor' || !g.identified || !g.setId || !isArmorSetId(g.setId)) continue;
    out[g.setId]++;
  }
  return out;
}
