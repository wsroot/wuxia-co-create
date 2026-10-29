/**
 * 场地词缀 — one active per act, seeded by actIndex so mid-act saves stay stable.
 * Temporary combat pressure; does not persist in SaveData.
 *
 * Catalog defs register via ctx.affixes. Combat/tick numbers live on AffixDef
 * (closed effect vocabulary). Core tickAffix / helpers read fields only — no
 * per-id branches for built-in feel. Still-dot "moving" tests stay two fixed
 * core conventions (primary vs secondary slot).
 */
import type { Game } from '../game';
import type { AttackDef } from '../combat/types';
import { getAffix, listAffixes, affixMapView } from '../meta/contentRegistry';

/** Built-in 场地词缀 ids. */
export type CoreAffixId =
  | 'duwu'      // 毒雾
  | 'nifeng'    // 逆风
  | 'huashi'    // 滑湿
  | 'yinhuo'    // 阴火
  | 'canyue'    // 残月
  | 'anhuenzhong' // 安魂钟
  | 'zhanghai';  // 瘴海 (毒雾进化)

/** Runtime id — any registered field affix. */
export type AffixId = string;

/**
 * Closed effect vocabulary on AffixDef.
 * Plugins fill these primitives; core applies them. No arbitrary JS.
 */
export interface AffixDef {
  id: AffixId;
  name: string;
  /** Fog name until the player has entered a stage with this affix (session). */
  fogName: string;
  desc: string;
  color: string;

  /* ── periodic outdoor DOT (毒雾 / 瘴海) ── */
  /** Frames between DOT ticks. */
  dotPeriod?: number;
  /** Base damage before setAffixDmgMul / 静咒. */
  dotDamage?: number;
  /** Show float text every N DOT ticks (default 1). */
  dotFloatEvery?: number;

  /* ── stand-still burn (阴火) ── */
  /** Primary-slot still DOT period (frames). */
  stillDotPeriod?: number;
  stillDotDamage?: number;
  /**
   * Softer still DOT when this affix is the secondary slot.
   * Moving test is the core secondary convention (vx / dash only).
   */
  secondaryStillDotPeriod?: number;
  secondaryStillDotDamage?: number;

  /* ── 安魂钟 cycle ── */
  bellCycle?: number;
  bellWindow?: number;
  bellBannerTitle?: string;
  bellBannerSub?: string;
  bellBannerDur?: number;
  bellRingSize?: number;

  /* ── evolve into another affix ── */
  evolveTo?: AffixId;
  /** playTime frames before evolve (e.g. 60*90). */
  evolveAfter?: number;
  evolveBannerTitle?: string;
  evolveBannerSub?: string;

  /* ── hit / knockback (逆风-style) ── */
  /** Player outgoing damage mul on "wide" / listed hits. */
  playerWideHitMul?: number;
  /** Attack box width ≥ this counts as wide (default 85). */
  playerWideHitMinW?: number;
  /** Attack names that always count as wide. */
  playerWideHitNames?: string[];
  /** Enemy → player knockback mul. */
  enemyIncomingKbMul?: number;
  /** Player → enemy knockback mul. */
  playerOutgoingKbMul?: number;

  /* ── movement buffs (残月-style) ── */
  dashCdMul?: number;
  dashIframeBonus?: number;
  jumpBoost?: number;
  dashKickBonus?: number;

  /* ── dash morph (滑湿-style) ── */
  dashLenMul?: number;
  dashSlideVx?: number;
  /** Dash travel speed while morph active (default core dash is 13). */
  dashSpeed?: number;

  /* ── pick pools (门派挂权重；框架不写 id 表) ── */
  /** Relative weight in primary act pick. Omit / 0 = not in primary pool. */
  primaryWeight?: number;
  /** Relative weight in secondary soft-affix pick. Omit / 0 = not eligible. */
  secondaryWeight?: number;
  /** Evolve-only (e.g. 瘴海): never rolled as primary/secondary. */
  evolveOnly?: boolean;
}

/** Built-in 场地词缀 — registered by the official 内容包 (src/content/core). */
/** Oc5: isCore* 查官方包 id 集（字面量在 changye/seeds；不对外 re-export）。 */
import { CORE_AFFIXES } from '../content/changye/seeds/affixes';

/** Live catalog backed by ctx.affixes. */
export const AFFIXES: AffixDef[] = listAffixes();
export const AFFIX_BY_ID: Record<string, AffixDef> = affixMapView();

export function isAffixId(id: string): id is AffixId {
  return getAffix(id) !== undefined;
}

export function isCoreAffixId(id: string): id is CoreAffixId {
  return CORE_AFFIXES.some((a) => a.id === id);
}

export { getAffix, listAffixes };

export function activeAffix(g: { stageAffix?: AffixId | null }): AffixDef | undefined {
  return g.stageAffix ? getAffix(g.stageAffix) : undefined;
}

/** Affixes eligible for primary act roll (catalog weights; no id table). */
export function primaryAffixPool(): AffixDef[] {
  return listAffixes().filter((a) => !a.evolveOnly && (a.primaryWeight ?? 0) > 0);
}

/** Affixes eligible for secondary soft slot. */
export function secondaryAffixPool(exclude?: AffixId | null): AffixDef[] {
  return listAffixes().filter(
    (a) => !a.evolveOnly && (a.secondaryWeight ?? 0) > 0 && a.id !== exclude,
  );
}

/** Deterministic weighted pick; seed from actIndex keeps mid-act saves stable. */
function pickWeightedAffix(
  pool: AffixDef[],
  weightOf: (a: AffixDef) => number,
  seed: number,
): AffixId | null {
  if (!pool.length) return null;
  const total = pool.reduce((s, a) => s + weightOf(a), 0);
  if (total <= 0) return pool[0]!.id;
  let r = ((seed % total) + total) % total;
  for (const a of pool) {
    r -= weightOf(a);
    if (r < 0) return a.id;
  }
  return pool[pool.length - 1]!.id;
}

/**
 * Arena.affixBias：listed ids that intersect primaryAffixPool become the pick pool
 * (still weighted by AffixDef.primaryWeight). Empty intersection → full primary pool.
 * Unknown / evolveOnly ids soft-ignored. No new effect vocabulary.
 */
export function pickAffixForAct(actIndex: number, bias?: readonly string[] | null): AffixId {
  const full = primaryAffixPool();
  const biasSet = new Set((bias ?? []).filter(Boolean));
  const preferred = biasSet.size ? full.filter((a) => biasSet.has(a.id)) : [];
  const pool = preferred.length ? preferred : full;
  const picked = pickWeightedAffix(pool, (a) => a.primaryWeight ?? 0, actIndex * 13 + 5);
  if (picked) return picked;
  // Empty primary pool — fall back to first registered affix (boot misconfig).
  return listAffixes()[0]?.id ?? '';
}

/** Union of Arena.affixBias across a stage (empty → null). Soft; unknown ids ignored at pick. */
export function collectStageAffixBias(
  arenas: ReadonlyArray<{ affixBias?: string[] }>,
): string[] | null {
  const out: string[] = [];
  for (const a of arenas) {
    if (a.affixBias?.length) out.push(...a.affixBias);
  }
  return out.length ? out : null;
}

export function affixDisplayName(id: AffixId, known: boolean): string {
  const d = AFFIX_BY_ID[id];
  if (!d) return id;
  return known ? d.name : d.fogName;
}

function affMulOf(g: Game): number {
  let affMul = g.player.mods.setAffixDmgMul ?? 1;
  if (g.player.jingzhouT > 0) affMul *= 0.55;
  return affMul;
}

function applyDotTick(g: Game, def: AffixDef, affMul: number): void {
  const period = def.dotPeriod;
  const base = def.dotDamage;
  if (period == null || base == null) return;
  if (g.affixSuppressT > 0) return;
  const p = g.player;
  const dmg = Math.max(1, Math.round(base * affMul));
  if (g.tick % period === 0 && p.invuln <= 0 && !p.god) {
    p.hp = Math.max(1, p.hp - dmg);
    g.stats.damageTaken += dmg;
    const every = def.dotFloatEvery ?? 1;
    if (g.tick % (period * every) === 0) {
      g.texts.add(def.name, p.x, p.y - 110, def.color, 12);
    }
  }
}

/** Primary still-dot moving: vx / dash / run / airborne. Skip hurt/down/getup. */
function isMovingPrimary(p: Game['player']): boolean {
  return Math.abs(p.body.vx) > 0.55 || p.state === 'dash' || p.state === 'run' || !p.body.onGround;
}

/** Secondary still-dot moving: vx / dash only (softer slot). */
function isMovingSecondary(p: Game['player']): boolean {
  return Math.abs(p.body.vx) > 0.55 || p.state === 'dash';
}

function applyStillDotPrimary(g: Game, def: AffixDef, affMul: number): void {
  const period = def.stillDotPeriod;
  const base = def.stillDotDamage;
  if (period == null || base == null) return;
  if (g.affixSuppressT > 0) return;
  const p = g.player;
  if (isMovingPrimary(p)) return;
  if (p.state === 'hurt' || p.state === 'down' || p.state === 'getup') return;
  if (p.invuln > 0 || p.god) return;
  if (g.tick % period !== 0) return;
  const dmg = Math.max(0, Math.round(base * affMul));
  if (dmg > 0) {
    p.hp = Math.max(1, p.hp - dmg);
    g.stats.damageTaken += dmg;
  }
  g.texts.add(def.name, p.x, p.y - 105, def.color, 12);
}

function applyStillDotSecondary(g: Game, def: AffixDef, affMul: number): void {
  const period = def.secondaryStillDotPeriod;
  const base = def.secondaryStillDotDamage ?? def.stillDotDamage ?? 1;
  if (period == null) return;
  if (g.affixSuppressT > 0) return;
  const p = g.player;
  if (isMovingSecondary(p)) return;
  if (p.invuln > 0 || p.god) return;
  if (g.tick % period !== 0) return;
  const d1 = Math.max(0, Math.round(base * affMul));
  if (d1 > 0) {
    p.hp = Math.max(1, p.hp - d1);
    g.stats.damageTaken += d1;
  }
}

function applyBell(g: Game, def: AffixDef): void {
  const cycle = def.bellCycle;
  const window = def.bellWindow;
  if (cycle == null || window == null) {
    g.affixBellWeak = false;
    return;
  }
  const phase = g.tick % cycle;
  g.affixBellWeak = phase < window;
  if (phase === 0) {
    const title = def.bellBannerTitle ?? def.name;
    const sub = def.bellBannerSub ?? '';
    g.showBanner(title, sub, def.bellBannerDur ?? 90);
    g.fx.ring(g.player.x, g.player.y - 40, def.bellRingSize ?? 120, def.color, 24);
  }
}

/** Soft outdoor DOT / still-drain / bell windows. Call once per sim step. */
export function tickAffix(g: Game): void {
  const id = g.stageAffix;
  if (!id) return;
  const p = g.player;
  if (p.dead || g.ended) return;
  const affMul = affMulOf(g);
  const primary = getAffix(id);

  if (primary) {
    applyDotTick(g, primary, affMul);
    applyStillDotPrimary(g, primary, affMul);
    if (primary.bellCycle != null) applyBell(g, primary);
    else g.affixBellWeak = false;
    maybeEvolveAffix(g);
  } else {
    g.affixBellWeak = false;
  }

  // Secondary soft still-dot (data: secondaryStillDot*)
  const secId = g.stageAffixSecondary;
  if (secId) {
    const sec = getAffix(secId);
    if (sec) applyStillDotSecondary(g, sec, affMul);
  }
}

/** 逆风-style: weaken wide / skill-ish player hits from def fields. */
export function nifengPlayerDmgMul(def: AttackDef, affixId?: AffixId | null): number {
  const a = affixId != null ? getAffix(affixId) : undefined;
  if (!a?.playerWideHitMul) return 1;
  const minW = a.playerWideHitMinW ?? 85;
  const names = a.playerWideHitNames;
  if (def.box.w >= minW || (names && names.includes(def.name))) {
    return a.playerWideHitMul;
  }
  return 1;
}

export function nifengEnemyKbMul(affixId?: AffixId | null): number {
  const a = affixId != null ? getAffix(affixId) : undefined;
  return a?.enemyIncomingKbMul ?? 1;
}

export function nifengPlayerKbMul(affixId?: AffixId | null): number {
  const a = affixId != null ? getAffix(affixId) : undefined;
  return a?.playerOutgoingKbMul ?? 1;
}

/** 残月-style movement helpers — read from active / given affix def. */
export function canyueDashCdMul(affixId?: AffixId | null): number {
  return getAffix(affixId ?? '')?.dashCdMul ?? 1;
}
export function canyueDashIframeBonus(affixId?: AffixId | null): number {
  return getAffix(affixId ?? '')?.dashIframeBonus ?? 0;
}
export function canyueJumpBoost(affixId?: AffixId | null): number {
  return getAffix(affixId ?? '')?.jumpBoost ?? 1;
}
export function canyueDashKickBonus(affixId?: AffixId | null): number {
  return getAffix(affixId ?? '')?.dashKickBonus ?? 0;
}

/** 滑湿-style dash morph — prefer reading AffixDef; constants mirror core 滑湿. */
export function huashiDashLenMul(affixId?: AffixId | null): number {
  return getAffix(affixId ?? '')?.dashLenMul ?? 1;
}
export function huashiSlideVx(affixId?: AffixId | null): number {
  return getAffix(affixId ?? '')?.dashSlideVx ?? 0;
}
export function huashiDashSpeed(affixId?: AffixId | null): number {
  return getAffix(affixId ?? '')?.dashSpeed ?? 13;
}
export function hasDashMorph(affixId?: AffixId | null): boolean {
  const a = affixId != null ? getAffix(affixId) : undefined;
  return !!(a && (a.dashLenMul != null || a.dashSlideVx != null));
}

/** @deprecated Use huashiDashLenMul(affixId); kept as core 滑湿 defaults for callers. */
export const HUASHI_DASH_LEN_MUL = 1.35;
/** @deprecated Use huashiSlideVx(affixId). */
export const HUASHI_SLIDE_VX = 3.2;

/** Rare dual secondary affix (soft) — catalog secondaryWeight only. */
export function pickSecondaryAffix(primary: AffixId, actIndex: number): AffixId | null {
  // Act 1+: ~2/3 of later acts get a soft secondary
  if (actIndex < 1) return null;
  if (((actIndex * 19 + 5) % 3) === 1) return null;
  const pool = secondaryAffixPool(primary);
  return pickWeightedAffix(pool, (a) => a.secondaryWeight ?? 0, actIndex * 5);
}

/** Evolve when primary def has evolveTo / evolveAfter (毒雾 → 瘴海). */
export function maybeEvolveAffix(g: Game): void {
  const id = g.stageAffix;
  if (!id || g.affixEvolved) return;
  const def = getAffix(id);
  if (!def?.evolveTo || def.evolveAfter == null) return;
  if (g.playTime < def.evolveAfter) return;
  g.affixEvolved = true;
  g.stageAffix = def.evolveTo;
  if (!g.knownAffixes.includes(def.evolveTo)) g.knownAffixes.push(def.evolveTo);
  g.showBanner(def.evolveBannerTitle ?? '词缀演化', def.evolveBannerSub ?? `${def.name} → ${def.evolveTo}`, 100);
  g.toastAffix();
}
