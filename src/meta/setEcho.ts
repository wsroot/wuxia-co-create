/**
 * 品质「影」残响 — 无具名套装 2 件时的微弱兜底。
 * 具名套装见 armorSets.ts。
 */
import type { InherentQuality } from './taxonomy';
import type { GearItem } from './types';
import { QUALITY_NAME, INHERENT_QUALITIES, qualityRank } from './taxonomy';

export interface SetEchoState {
  quality: InherentQuality | null;
  count: number;
  revealed: boolean;
}

export function computeSetEcho(
  equipped: GearItem[],
  knownSets: InherentQuality[],
): SetEchoState {
  const counts: Partial<Record<InherentQuality, number>> = {};
  for (const g of equipped) {
    if (!g.identified || !g.quality || g.kind !== 'armor') continue;
    counts[g.quality] = (counts[g.quality] ?? 0) + 1;
  }
  let best: InherentQuality | null = null;
  let n = 0;
  // Prefer higher qualities when tied on count (iterate high→low).
  const order = [...INHERENT_QUALITIES].sort((a, b) => qualityRank(b) - qualityRank(a));
  for (const q of order) {
    const c = counts[q] ?? 0;
    if (c > n) { n = c; best = q; }
  }
  if (!best || n < 2) return { quality: null, count: 0, revealed: false };
  const revealed = knownSets.includes(best) || n >= 3;
  return { quality: best, count: n, revealed };
}

export function setEchoLabel(s: SetEchoState): string {
  if (!s.quality || s.count < 2) return '';
  if (!s.revealed) return `影·??（${s.count}）`;
  return `${QUALITY_NAME[s.quality]}·影（${s.count}）`;
}

/** Tiny fallback only — half the old values. */
export function setEchoBonuses(s: SetEchoState): { def: number; atk: number } {
  if (!s.quality || s.count < 2) return { def: 0, atk: 0 };
  const tier =
    s.quality === 'tian' ? 1.22
    : s.quality === 'di' ? 1.15
    : s.quality === 'xuan' ? 1.08
    : 1;
  if (s.count >= 4) return { def: 0.02 * tier, atk: 0.02 * tier };
  if (s.count >= 3) return { def: 0.012 * tier, atk: 0.015 * tier };
  return { def: 0.01 * tier, atk: 0 };
}
