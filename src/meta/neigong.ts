import type { MaterialId } from './materials';
import { getNeigong, listNeigongs, neigongMapView } from './contentRegistry';

/** Built-in 内功 ids (effect tables / starters). */
export type CoreNeigongId = 'hunyuan' | 'xueying' | 'qingxu' | 'lieshan';

/** Runtime / save id — any registered 心法 (core or a loaded 门派). */
export type NeigongId = string;

export const NEIGONG_RANK_MAX = 5;
export const NEIGONG_RETRAIN_FEE = 40;

export interface NeigongDef {
  id: NeigongId;
  name: string;
  lore: string;
  tip: string;
  /** Max-rank signature name (always shown in 满级). */
  signature: string;
  meditateCost: Partial<Record<MaterialId, number>>;
  fee: number;
  style: string;
  /** 固有品质 — tagged by core / 门派; framework owns the ladder. */
  quality?: import('./taxonomy').InherentQuality;
  /** Per-rank combat numbers + signature maxes; neigongEffects reads these. */
  effects?: NeigongEffectsTable;
}

/** Closed effect tables. Per-rank arrays index 0 = rank 1; signature fields scale with rank/max. */
export interface NeigongEffectsTable {
  damageBonus: number[];
  rageBonus: number[];
  defBonus: number[];
  neiliRegenMul: number[];
  /** Added to 1 as (bonus * rank/max). */
  executeMulBonus?: number;
  /** Max lifesteal at 化境 (scales * rank/max). */
  lifestealMax?: number;
  parryWindowBonusMax?: number;
  parryRageBonusMax?: number;
  /** Added to 1 as (bonus * rank/max). */
  poiseMulBonus?: number;
}


/** Official 内功 data — registered only by 门派「长夜」(src/menpai/core). */
/** Oc5: isCore* 查官方包 id 集（字面量在 changye/seeds；不对外 re-export）。 */
import { CORE_NEIGONGS } from '../content/changye/seeds/neigongs';

/** Live catalog backed by ctx.neigong. */
export const NEIGONGS: NeigongDef[] = listNeigongs();
export const NEIGONG_BY_ID: Record<string, NeigongDef> = neigongMapView();

export function isNeigongId(id: string): id is NeigongId {
  return getNeigong(id) !== undefined;
}

export function isCoreNeigongId(id: string): id is CoreNeigongId {
  return CORE_NEIGONGS.some((n) => n.id === id);
}

export { getNeigong, listNeigongs };


export interface NeigongEffects {
  damageBonus: number;
  rageBonus: number;
  defBonus: number;
  neiliRegenMul: number;
  /** Signature combat hooks (scale with rank; full at max). */
  parryWindowBonus: number;
  poiseMul: number;
  executeMul: number;
  lifesteal: number;
  parryRageBonus: number;
}

function rankPick(table: number[] | undefined, i: number, fallback: number): number {
  if (!table || table.length === 0) return fallback;
  return table[Math.min(i, table.length - 1)] ?? fallback;
}

export function neigongEffects(id: NeigongId, rank: number): NeigongEffects {
  const z: NeigongEffects = {
    damageBonus: 0, rageBonus: 0, defBonus: 0, neiliRegenMul: 1,
    parryWindowBonus: 0, poiseMul: 1, executeMul: 1, lifesteal: 0, parryRageBonus: 0,
  };
  if (rank < 1) return z;
  const i = Math.min(NEIGONG_RANK_MAX, rank) - 1;
  const t = (i + 1) / NEIGONG_RANK_MAX; // 0.2..1
  const table = getNeigong(id)?.effects;
  if (!table) return z;
  return {
    damageBonus: rankPick(table.damageBonus, i, 0),
    rageBonus: rankPick(table.rageBonus, i, 0),
    defBonus: rankPick(table.defBonus, i, 0),
    neiliRegenMul: rankPick(table.neiliRegenMul, i, 1),
    parryWindowBonus: Math.round((table.parryWindowBonusMax ?? 0) * t),
    poiseMul: 1 + (table.poiseMulBonus ?? 0) * t,
    executeMul: 1 + (table.executeMulBonus ?? 0) * t,
    lifesteal: (table.lifestealMax ?? 0) * t,
    parryRageBonus: Math.round((table.parryRageBonusMax ?? 0) * t),
  };
}

export function formatNeigongEffects(e: NeigongEffects): string {
  const bits = [
    `武功 +${Math.round(e.damageBonus * 100)}%`,
    `气势 +${Math.round(e.rageBonus * 100)}%`,
    `减伤 +${Math.round(e.defBonus * 100)}%`,
    `内力回复 ×${e.neiliRegenMul.toFixed(2)}`,
  ];
  if (e.parryWindowBonus) bits.push(`弹反时机放宽（+${e.parryWindowBonus}）`);
  if (e.poiseMul > 1.01) bits.push(`破韧 ×${e.poiseMul.toFixed(2)}`);
  if (e.executeMul > 1.01) bits.push(`处决 ×${e.executeMul.toFixed(2)}`);
  if (e.lifesteal > 0) bits.push(`吸血 ${(e.lifesteal * 100).toFixed(1)}%`);
  return bits.join(' · ');
}

export function neigongTip(id: NeigongId, rank: number): string {
  if (rank < 1) return '未修炼（已知）· 重修后从入门起';
  return formatNeigongEffects(neigongEffects(id, rank));
}

export function neigongMaxTip(id: NeigongId): string {
  const sig = NEIGONG_BY_ID[id]?.signature ?? '';
  return `化境：${formatNeigongEffects(neigongEffects(id, NEIGONG_RANK_MAX))}｜门派：${sig}`;
}

export function neigongMeditateCost(id: NeigongId, nextRank: number): { mats: Partial<Record<MaterialId, number>>; fee: number } {
  const def = NEIGONG_BY_ID[id];
  if (!def) return { mats: {}, fee: 0 };
  const scale = nextRank;
  const mats: Partial<Record<MaterialId, number>> = {};
  for (const [k, n] of Object.entries(def.meditateCost)) {
    mats[k as MaterialId] = Math.max(1, Math.round((n ?? 1) * (0.6 + scale * 0.5)));
  }
  if (nextRank >= 3) mats.xuaniron = (mats.xuaniron ?? 0) + 1;
  if (nextRank >= 5) mats.yaohe = (mats.yaohe ?? 0) + 1;
  return { mats, fee: def.fee + (nextRank - 1) * 20 };
}
