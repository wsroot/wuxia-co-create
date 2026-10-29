/**
 * 武器克制环 — category vs elite mods / poise rules.
 *
 * Elite matchups read EliteModDef.weaponCounters (registered by 门派).
 * Spear-vs-non-elite spacing bonus stays a framework combat baseline (no content id).
 */
import type { WeaponCategory } from '../meta/weapons';
import type { EliteModId } from '../level/eliteMods';
import { getEliteMod } from '../meta/contentRegistry';

export interface CounterHit {
  label: string;
  /** Extra damage multiplier (1.15 = +15%). */
  dmgMul: number;
  /** Extra poise damage mul. */
  poiseMul: number;
  /** Cancel elite 闪步 briefly / ignore reflect portion. */
  cancelShanbu?: boolean;
  ignoreReflect?: boolean;
  pierceTongpi?: boolean;
}

/** blade vs 闪步; spear spacing vs archer/adds; heavy vs 铜皮/poise; bare vs 反伤 */
export function weaponCounterElite(
  cat: WeaponCategory,
  eliteMod: EliteModId | null | undefined,
): CounterHit | null {
  if (!eliteMod) {
    // Framework baseline — spear spacing vs non-elite (no content id).
    if (cat === 'spear') return { label: '克制·控距', dmgMul: 1.08, poiseMul: 1.1 };
    return null;
  }
  const def = getEliteMod(eliteMod);
  const hit = def?.weaponCounters?.find((c) => c.category === cat);
  if (!hit) return null;
  return {
    label: hit.label,
    dmgMul: hit.dmgMul,
    poiseMul: hit.poiseMul,
    cancelShanbu: hit.cancelShanbu,
    ignoreReflect: hit.ignoreReflect,
    pierceTongpi: hit.pierceTongpi,
  };
}
