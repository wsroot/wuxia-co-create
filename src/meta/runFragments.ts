/**
 * 局内心法残页 — tags互斥; 含可选黑残页（诅咒）.
 *
 * Catalog via ctx.fragments. Effects are closed schema fields on the def;
 * apply helpers read live catalog (missing id → no-op / skip).
 */
import { getFragment, listFragments, fragmentMapView } from './contentRegistry';

export type FragmentTag = 'qi' | 'body' | 'speed' | 'sustain' | 'curse';

/** Built-in 残页 ids. */
export type CoreFragmentId =
  | 'lieqi' | 'guixi' | 'toujia' | 'jiying' | 'yaoli' | 'tieyi'
  | 'heican';

/** Runtime id — any registered fragment. */
export type FragmentId = string;

export interface FragmentDef {
  id: FragmentId;
  name: string;
  fogName: string;
  desc: string;
  color: string;
  tag: FragmentTag;
  /** Curse downside description (if any). */
  curse?: string;
  /** Event-only (e.g. 黑残页) — excluded from normal drop/roll pools. */
  eventOnly?: boolean;
  /** Closed effect fields (core multiplies / adds from active fragments). */
  skillDmgMul?: number;
  neiliRegenMul?: number;
  armorPierceBonus?: number;
  dashCdMul?: number;
  pillHealMul?: number;
  pillRageBonus?: number;
  dmgTakenMul?: number;
  atkMul?: number;
}

/** Built-in 残页 — registered by 门派「长夜」. */
/** Oc5: isCore* 查官方包 id 集（字面量在 changye/seeds；不对外 re-export）。 */
import { CORE_FRAGMENTS } from '../content/changye/seeds/fragments';

/** Live catalog backed by ctx.fragments. */
export const FRAGMENTS: FragmentDef[] = listFragments();
export const FRAGMENT_BY_ID: Record<string, FragmentDef> = fragmentMapView();

export function isFragmentId(id: string): boolean {
  return getFragment(id) !== undefined;
}

export function isCoreFragmentId(id: string): id is CoreFragmentId {
  return CORE_FRAGMENTS.some((f) => f.id === id);
}

export { getFragment, listFragments };

export const MAX_ACTIVE_FRAGMENTS = 2;

export function fragmentDropChance(elite: boolean): number {
  return elite ? 0.18 : 0.045;
}

export function rollFragmentId(exclude: FragmentId[], rng = Math.random): FragmentId | null {
  // Normal drops never roll eventOnly (e.g. heican curse is event-only)
  const pool = FRAGMENTS.filter((f) => !f.eventOnly && !exclude.includes(f.id)).map((f) => f.id);
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)]!;
}

export interface FragmentRuntime {
  active: FragmentId[];
  known: FragmentId[];
}

export function emptyFragments(): FragmentRuntime {
  return { active: [], known: [] };
}

export function hasFragment(rt: FragmentRuntime, id: FragmentId): boolean {
  return rt.active.includes(id);
}

export function tryAddFragment(rt: FragmentRuntime, id: FragmentId): 'added' | 'full' | 'dup' | 'tag' {
  const def = getFragment(id);
  if (!def) return 'dup'; // missing from live catalog — skip
  if (rt.active.includes(id)) return 'dup';
  if (rt.active.length >= MAX_ACTIVE_FRAGMENTS) return 'full';
  for (const a of rt.active) {
    const other = getFragment(a);
    if (other && other.tag === def.tag) return 'tag';
  }
  rt.active.push(id);
  if (!rt.known.includes(id)) rt.known.push(id);
  return 'added';
}

export function clearFragments(rt: FragmentRuntime): void {
  rt.active.length = 0;
  rt.known.length = 0;
}

function activeDefs(rt: FragmentRuntime): FragmentDef[] {
  return rt.active.map((id) => getFragment(id)).filter((d): d is FragmentDef => !!d);
}

export function fragmentSkillDmgMul(rt: FragmentRuntime): number {
  // Product of skillDmgMul on active defs (裂气 only historically; 黑残页 uses atkMul)
  let m = 1;
  for (const d of activeDefs(rt)) {
    if (d.skillDmgMul) m *= d.skillDmgMul;
  }
  return m;
}

export function fragmentNeiliRegenMul(rt: FragmentRuntime): number {
  let m = 1;
  for (const d of activeDefs(rt)) {
    if (d.neiliRegenMul) m *= d.neiliRegenMul;
  }
  return m;
}

export function fragmentArmorPierceBonus(rt: FragmentRuntime): number {
  let b = 0;
  for (const d of activeDefs(rt)) {
    if (d.armorPierceBonus) b += d.armorPierceBonus;
  }
  return b;
}

export function fragmentDashCdMul(rt: FragmentRuntime): number {
  let m = 1;
  for (const d of activeDefs(rt)) {
    if (d.dashCdMul) m *= d.dashCdMul;
  }
  return m;
}

export function fragmentPillHealMul(rt: FragmentRuntime): number {
  let m = 1;
  for (const d of activeDefs(rt)) {
    if (d.pillHealMul) m *= d.pillHealMul;
  }
  return m;
}

export function fragmentPillRageBonus(rt: FragmentRuntime): number {
  let b = 0;
  for (const d of activeDefs(rt)) {
    if (d.pillRageBonus) b += d.pillRageBonus;
  }
  return b;
}

export function fragmentDmgTakenMul(rt: FragmentRuntime): number {
  let m = 1;
  for (const d of activeDefs(rt)) {
    if (d.dmgTakenMul) m *= d.dmgTakenMul;
  }
  return m;
}

export function fragmentDisplayName(id: FragmentId, known: boolean): string {
  const d = getFragment(id);
  if (!d) return known ? id : '残页·??';
  return known ? d.name : d.fogName;
}

export function fragmentAtkMul(rt: FragmentRuntime): number {
  let m = 1;
  for (const d of activeDefs(rt)) {
    if (d.atkMul) m *= d.atkMul;
  }
  return m;
}
