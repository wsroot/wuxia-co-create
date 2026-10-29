/**
 * 兵器实例词缀 + 锻造重roll.
 */
import type { MaterialId } from './materials';
import { getWepAffix, listWepAffixes, wepAffixMapView } from './contentRegistry';

/** Built-in 兵器词缀 ids. */
export type CoreWepAffixId = 'poshi' | 'yinixue' | 'chouqi' | 'kuaijie' | 'zhongji' | 'qingling';

/** Runtime id — any registered weapon instance affix. */
export type WepAffixId = string;

export interface WepAffixDef {
  id: WepAffixId;
  name: string;
  fogName: string;
  tip: string;
  /** Combat hooks. */
  poiseMul?: number;
  lifesteal?: number;
  neiliOnHit?: number;
  speedMul?: number;
  heavyDmgMul?: number;
  staminaRefund?: number;
}

/** Oc5: isCore* 查官方包 id 集（字面量在 changye/seeds；不对外 re-export）。 */
import { CORE_WEP_AFFIXES } from '../content/changye/seeds/wepAffixes';

/** Live catalog backed by ctx.wepAffixes. */
export const WEP_AFFIXES: WepAffixDef[] = listWepAffixes();
export const WEP_AFFIX_BY_ID: Record<string, WepAffixDef> = wepAffixMapView();

export function isWepAffixId(id: string): id is WepAffixId {
  return getWepAffix(id) !== undefined;
}

/** Oc4: 查官方包 id 集。 */
export function isCoreWepAffixId(id: string): id is CoreWepAffixId {
  return CORE_WEP_AFFIXES.some((a) => a.id === id);
}

export { getWepAffix, listWepAffixes };

export function rollWepAffix(rng = Math.random): WepAffixId {
  return WEP_AFFIXES[Math.floor(rng() * WEP_AFFIXES.length)]!.id;
}

export function wepAffixDisplay(id: WepAffixId | undefined, known: boolean): string {
  if (!id) return '';
  const d = WEP_AFFIX_BY_ID[id];
  if (!d) return id;
  return known ? `${d.name}（${d.tip}）` : d.fogName;
}

/** Reforge cost. */
export const REFORGE_FEE = 30;
export const REFORGE_MATS: Partial<Record<MaterialId, number>> = { iron: 2, coal: 1, cinnabar: 1 };

/** 重锻词缀次数上限（按固有品质）。 */
export const REFORGE_MAX: Record<import('./taxonomy').InherentQuality, number> = {
  lie: 1,
  fan: 2,
  huang: 3,
  xuan: 4,
  di: 5,
  tian: 6,
};

export function reforgeMax(q: import('./taxonomy').InherentQuality | undefined): number {
  return REFORGE_MAX[q ?? 'fan'];
}

/** Remaining reforge attempts on a weapon (missing → full allowance, so old saves aren't punished). */
export function reforgeLeft(item: { quality?: import('./taxonomy').InherentQuality; reforgeLeft?: number }): number {
  const max = reforgeMax(item.quality);
  if (typeof item.reforgeLeft !== 'number' || !Number.isFinite(item.reforgeLeft)) return max;
  return Math.max(0, Math.min(max, Math.floor(item.reforgeLeft)));
}
