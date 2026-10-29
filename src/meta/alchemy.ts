import type { MaterialBag } from './materials';
import { getPill, listPills, pillMapView } from './contentRegistry';

/** 丹药 / 符箓。 */
/** Built-in pill ids (type-safe helpers). */
export type CorePillId =
  | 'heal' | 'rage' | 'atkIncense' | 'qingxin' | 'baofa' | 'xuhang' | 'jiekongdan' | 'porendan'
  | 'hutidan' | 'jingzhou' | 'baoqi' | 'yingbu' | 'xuming' | 'pojia';

/** Runtime / save id — any registered pill (core or a loaded 内容包). */
export type PillId = string;

export interface PillDef {
  id: PillId;
  name: string;
  lore: string;
  /** Hub craft cost. */
  cost: MaterialBag;
  fee: number;
  /** Max carried into a run. */
  carryCap: number;
  tip: string;
  /** 固有品质 tag. */
  quality?: import('./taxonomy').InherentQuality;
  /** 品级 上/中/下. */
  grade?: import('./taxonomy').ConsumableGrade;
  /** Closed combat effect; usePillSlot applies these via engine primitives. */
  effect?: PillEffect;
  /** When true, may be packed into run sortie slots (hub 备战). */
  sortie?: boolean;
}

/**
 * Closed pill combat schema — no arbitrary JS.
 * Timed buffs are in seconds (×60 frames at apply). Optional *WithFrag
 * multiplies the matching amount by fragmentPillHealMul / adds rage bonus.
 */
export interface PillEffect {
  heal?: number;
  healWithFrag?: boolean;
  rage?: number;
  rageWithFrag?: boolean;
  neili?: number;
  neiliWithFrag?: boolean;
  stamina?: number;
  armor?: number;
  /** Invulnerability frames. */
  invuln?: number;
  clearControl?: boolean;
  atkBuffSec?: number;
  defBuffSec?: number;
  /** Math.max with existing defBuffT instead of overwrite. */
  defBuffMax?: boolean;
  porenBuffSec?: number;
  pojiaBuffSec?: number;
  jingzhouSec?: number;
  affixSuppressSec?: number;
  baoqiSec?: number;
  yingbuSec?: number;
  xuhangSec?: number;
  xuhangTicks?: number;
  /** Scale timed buff seconds ×1.2 when fragmentPillHealMul > 1. */
  durScaleWithPillMul?: boolean;
  floatText?: string;
  floatColor?: string;
  sfx?: 'potion' | 'ui';
  /** On-use feel (hitstop / shake / flash). Core applies; no timeScale. */
  castFeel?: PillCastFeel;
  /** Continuous aura while timed buffs from this pill last. */
  whileActive?: PillWhileActive;
}

/** Closed cast feel for pills (and mirrored by talisman hitstop steps). */
export interface PillCastFeel {
  hitstop?: number;
  shake?: { amp: number; frames: number };
  flash?: { color: string; a: number };
}

export type PillAuraPreset = 'ring' | 'qi' | 'ember' | 'tint';

/** Drawn by core while pillAuraT > 0. */
export interface PillWhileActive {
  auraPreset: PillAuraPreset;
  color?: string;
  /** Frames between aura pulse (default 18). */
  period?: number;
  hudTint?: string;
  rimGlow?: boolean;
}


/** Official 丹药 data — registered only by 门派「长夜」(src/menpai/core). */
/** Oc5: isCore* 查官方包 id 集（字面量在 changye/seeds；不对外 re-export）。 */
import { CORE_PILLS } from '../content/changye/seeds/pills';

/** Live catalog backed by the ctx.pills service (core + loaded 内容包). */
export const PILLS: PillDef[] = listPills();
export const PILL_BY_ID: Record<string, PillDef> = pillMapView();

export function isPillId(id: string): id is PillId {
  return getPill(id) !== undefined;
}

export function isCorePillId(id: string): id is CorePillId {
  return CORE_PILLS.some((p) => p.id === id);
}

export { getPill, listPills };

export type PillBag = Partial<Record<PillId, number>>;

/** Short HUD label (1–2 chars). */
export const PILL_SHORT: Record<string, string> = {
  heal: '血',
  rage: '气',
  atkIncense: '香',
  qingxin: '清',
  baofa: '爆',
  xuhang: '续',
  jiekongdan: '解',
  porendan: '韧',
  hutidan: '护',
  jingzhou: '咒',
  baoqi: '气',
  yingbu: '影',
  xuming: '命',
  pojia: '甲',
};

/** Distinct combat / HUD tint per pill type. */
export const PILL_COLOR: Record<string, string> = {
  heal: '#ff6a7a',
  rage: '#ff90b0',
  atkIncense: '#ffd27a',
  qingxin: '#a0d0ff',
  baofa: '#ff5030',
  xuhang: '#70d090',
  jiekongdan: '#c0a0ff',
  porendan: '#e8c070',
  hutidan: '#a8c0d8',
  jingzhou: '#b0a0ff',
  baoqi: '#ff7090',
  yingbu: '#90a0ff',
  xuming: '#ff8098',
  pojia: '#d0b070',
};

/** One sortie slot: a pill type + packed count (null = empty). */
export type PillSlot = { id: PillId; n: number } | null;

export const PILL_SLOT_COUNT = 4;

/** Prefer sortie pills when migrating bag → slots (derived from catalog). */
export function pillSlotMigrateOrder(): PillId[] {
  const sortie = PILLS.filter((p) => p.sortie).map((p) => p.id);
  if (sortie.length) return sortie;
  return PILLS.map((p) => p.id);
}

/** @deprecated use pillSlotMigrateOrder() — static fallback for early parse before boot. */
export const PILL_SLOT_MIGRATE_ORDER: PillId[] = [
  'heal', 'rage', 'baofa', 'xuming', 'porendan', 'pojia', 'jiekongdan', 'hutidan',
  'yingbu', 'baoqi', 'jingzhou', 'xuhang', 'atkIncense', 'qingxin',
];

export function emptyPillSlots(): PillSlot[] {
  return [null, null, null, null];
}

/** Total count of a pill type across sortie slots. */
export function pillSlotsCount(slots: PillSlot[], id: PillId): number {
  let n = 0;
  for (const s of slots) if (s && s.id === id) n += s.n;
  return n;
}
