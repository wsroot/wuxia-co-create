/**
 * 市集兑价（血晶）。
 *
 * Gear prices stay modest — well below what was invested — so clearing clutter
 * does not become a crystal farm:
 *   - identified: quality base (劣 3 / 凡 6 / 黄 10 / 玄 18 / 地 32 / 天 48)
 *                 + 15% of the crystals spent on 强化 (Lv2..current)
 *   - unidentified: not accepted by the market (辨物 first)
 * Materials: under-value sell / marked-up buy so the NPC market stays a sink.
 */
import type { GearItem } from './types';
import type { InherentQuality } from './taxonomy';
import { isRareQuality } from './taxonomy';
import type { CoreMaterialId, MaterialId } from './materials';
import { weaponUpgradeCost } from './weapons';
import { armorUpgradeCost } from './gear';

export const SELL_QUALITY_BASE: Record<InherentQuality, number> = {
  lie: 3,
  fan: 6,
  huang: 10,
  xuan: 18,
  di: 32,
  tian: 48,
};

/** Legacy flat rate — market refuses unidentified; kept for reference only. */
export const SELL_UNIDENTIFIED = 5;
/** Share of 强化 crystals refunded on sale. */
export const SELL_UPGRADE_REFUND = 0.15;

/** Per-unit material sell-to-market prices (血晶). */
const _MAT_SELL = {
  iron: 2,
  bone: 2,
  hide: 2,
  herb: 3,
  silk: 3,
  cinnabar: 3,
  coal: 3,
  xuaniron: 8,
  spiritjade: 10,
  yaohe: 14,
} as const satisfies Record<CoreMaterialId, number>;

export const MAT_SELL: Record<string, number> = _MAT_SELL;

/** Buy markup over sell (NPC stock). */
export const MAT_BUY_MUL = 2.5;

export function sellPrice(g: GearItem): number {
  if (!g.identified) return 0;
  const base = SELL_QUALITY_BASE[g.quality ?? 'fan'];
  const lv = Math.max(1, Math.min(5, g.level ?? 1));
  let spent = 0;
  for (let n = 2; n <= lv; n++) {
    spent += g.kind === 'armor' ? armorUpgradeCost(n) : weaponUpgradeCost(n);
  }
  return base + Math.round(spent * SELL_UPGRADE_REFUND);
}

/** 玄/地/天 or well-reinforced pieces ask before 兑出. */
export function sellNeedsConfirm(g: GearItem): boolean {
  if (!g.identified) return false;
  const q = g.quality ?? 'fan';
  return isRareQuality(q) || (g.level ?? 1) >= 3;
}

export function matSellPrice(id: MaterialId, n = 1): number {
  return (MAT_SELL[id] ?? 1) * Math.max(0, Math.floor(n));
}

export function matBuyPrice(id: MaterialId, n = 1): number {
  const unit = Math.max(1, Math.ceil((MAT_SELL[id] ?? 1) * MAT_BUY_MUL));
  return unit * Math.max(0, Math.floor(n));
}
