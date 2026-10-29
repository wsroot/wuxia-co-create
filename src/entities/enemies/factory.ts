/**
 * Enemy factory + Cordis archetype catalog.
 *
 * Plugins register EnemyDef via ctx.enemies. Skirmish trash uses a single Enemy shell.
 * Assembly keys: silhouetteId (look) + behaviorId (AI) + colliderId|inline (collision).
 * Optional `body` soft-aliases to built-in axe/shield/archer/spear/gargoyle kits.
 * Boss uses makeBoss → Gargoyle runtime shell; makeEnemy must not return null.
 */
import { Enemy } from './enemy';
import type { SkelKind } from '../../render/drawSkeleton';
import { Gargoyle, type GargoyleParams } from '../boss/gargoyle';
import { applyEliteMod, ELITE_CHANCE, rollEliteMod, type EliteModId } from '../../level/eliteMods';
import { getEnemy, listEnemies, enemyMapView, getSilhouette, getBehavior, getCollider } from '../../meta/contentRegistry';
import { attachEnemyLoadout } from './loadout';

/** Closed body / AI / draw kits (no plugin Canvas injection). */
export type EnemyBodyKit = 'axe' | 'shield' | 'archer' | 'spear' | 'gargoyle';

/** Built-in skirmish ids (backward compat with stage Spawn.type). */
export type CoreEnemyId = 'axe' | 'shield' | 'archer' | 'spear' | 'gargoyle';

/** Runtime spawn id — any registered non-boss (or boss meta) archetype. */
export type EnemyType = string;

/** Closed loot kinds for EnemyDef.loot (soft id refs; missing at roll → skip). */
export type EnemyLootKind =
  | 'material' | 'blueprint' | 'skill' | 'neigong'
  | 'pillRecipe' | 'talismanRecipe' | 'gear' | 'crystal';

/**
 * Per-kill loot table entry on an EnemyDef.
 * Catalog kinds need `id` (soft string — skipped if absent from live catalog at roll time).
 * `gear` may use slot/setId/quality hints instead of (or with) id.
 * Rolls are **additional** to global onKill / secret skill-neigong rates.
 */
export interface EnemyLootEntry {
  kind: EnemyLootKind;
  /** Soft catalog id (material / weapon blueprint / skill / neigong / pill / talisman / armor). */
  id?: string;
  /** 0..1 chance per kill. */
  chance: number;
  /** Stack size for material / crystal (default 1 / 3). */
  amount?: number;
  /** Gear hint: armor slot kind. */
  slot?: import('../../meta/gear').ArmorSlotKind;
  /** Gear hint: named armor set id (soft). */
  setId?: string;
  /** Gear hint: inherent quality (soft; applied on identify path if set). */
  quality?: import('../../meta/taxonomy').InherentQuality;
}

/** Soft skill entry on an EnemyDef — cast in AI gaps via loadout helper. */
export interface EnemySkillLoadout {
  id: string;
  /** Relative pick weight (default 1). */
  weight?: number;
  minRange?: number;
  maxRange?: number;
  /** Cooldown frames override (else SkillDef effects / 90). */
  cooldown?: number;
}

/** Soft gear ref — armorPieces / weapons id, or armorSets setId. Stats + weapon look for silhouette. */
export interface EnemyGearLoadout {
  slot?: string;
  id?: string;
  setId?: string;
}

/** Soft pill entry — applied to this enemy (spawn / hp threshold / elite). */
export interface EnemyPillLoadout {
  id: string;
  when?: 'spawn' | 'hpBelow' | 'elite';
  /** HP fraction threshold when when==='hpBelow' (default 0.4). */
  hpFrac?: number;
  /** Consume at most once (default true). */
  once?: boolean;
}

/** Soft talisman entry — script played with enemy as caster, toward player. */
export interface EnemyTalismanLoadout {
  id: string;
  weight?: number;
  minRange?: number;
  maxRange?: number;
  /** Cooldown frames (default 160). */
  cooldown?: number;
}

export interface EnemyDef {
  id: EnemyType;
  /** Score / HUD name. */
  name: string;
  /**
   * Optional soft alias → built-in axe/shield/archer/spear/gargoyle
   * (collider / behavior / draw kit). Prefer silhouetteId + behaviorId + collider.
   */
  body?: EnemyBodyKit;
  /** Base HP before stage enemyScale. */
  hp: number;
  /** Potion drop chance (skirmish default ~0.22). Preserved separately from loot table. */
  dropChance?: number;
  /** Eligible for elite mod roll (default true for skirmish kits). */
  eliteEligible?: boolean;
  /** Soft material-id lean (optional; loot table covers designated mats). */
  dropBias?: string[];
  /**
   * Closed per-enemy loot table. Each entry is an independent chance roll on kill
   * (additional to global random loot). Soft refs: missing live-catalog id → skip.
   * blueprint / gear / pillRecipe only roll on elite or boss kills (core taxonomy ruler).
   */
  loot?: EnemyLootEntry[];
  /** Initial AI cooldown frames. */
  cooldown?: number;
  /** Parry stun duration override. */
  parriedDur?: number;
  /** Boss meta entry — spawn via makeBoss (not makeEnemy trash path). */
  isBoss?: boolean;
  /**
   * Soft loadout: skills / gear / pills / talismans (shared catalog ids).
   * Missing live-catalog id → soft skip + warn once.
   * BossLoad1: makeBoss attaches via LoadoutHost (gear/spawn pills + mul);
   * skill/talisman cast on Boss is BossLoad2 (not yet).
   */
  skills?: EnemySkillLoadout[];
  gear?: EnemyGearLoadout[];
  pills?: EnemyPillLoadout[];
  talismans?: EnemyTalismanLoadout[];
  /** Look: silhouette catalog id (required when body omitted). */
  silhouetteId?: string;
  /** AI: behavior catalog id (required when body omitted). */
  behaviorId?: string;
  /**
   * C-tier P0: soft collider catalog id. Missing → soft-skip (keep class default).
   * If both colliderId and inline `collider` are set, **inline wins**.
   */
  colliderId?: string;
  /** C-tier P0: inline collider (no id); takes priority over colliderId. */
  collider?: { w: number; h: number; hurtInset?: number; gravityScale?: number };
  /**
   * Boss kit catalog id (ctx.bossKits). Soft: missing kit → walk weights.
   * G3: enterBoss / makeBoss resolve stage.boss.kit → kitId → actPool.kit → 'stone'.
   */
  kitId?: string;
}

/** Built-in archetypes — registered by content-core (src/content/core). */
/** Oc5: isCore* 查官方包 id 集（字面量在 changye/seeds；不对外 re-export）。 */
import { CORE_ENEMIES } from '../../content/changye/seeds/enemies';

/** Live catalog backed by ctx.enemies. */
export const ENEMIES: EnemyDef[] = listEnemies();
export const ENEMY_BY_ID: Record<string, EnemyDef> = enemyMapView();

export function isEnemyId(id: string): boolean {
  return getEnemy(id) !== undefined;
}

export function isCoreEnemyId(id: string): id is CoreEnemyId {
  return CORE_ENEMIES.some((e) => e.id === id);
}

export { getEnemy, listEnemies };

export interface MakeEnemyOpts {
  scale?: number;
  /** Force elite modifier; omit to roll by chance. */
  eliteMod?: EliteModId | null;
  /** Override elite roll chance (0 = never). */
  eliteChance?: number;
}

/** Soft warn once when makeEnemy is pointed at a Boss archetype. */
let _makeEnemyBossWarn = false;
/** Soft warn once when makeBoss cannot find EnemyDef. */
let _makeBossMissingWarn = false;

export type ColliderNums = { w: number; h: number; hurtInset?: number; gravityScale?: number };

/**
 * Resolve ColliderProfile / inline collider numbers from an EnemyDef.
 * Order: inline collider → colliderId catalog → body soft-alias →
 * silhouette/behavior body soft-alias → undefined.
 */
export function resolveColliderProfile(def?: EnemyDef | null): ColliderNums | undefined {
  if (!def) return undefined;
  if (def.collider && Number.isFinite(def.collider.w) && Number.isFinite(def.collider.h)
      && def.collider.w > 0 && def.collider.h > 0) {
    return def.collider;
  }
  if (def.colliderId) {
    const c = getCollider(def.colliderId);
    if (c) return c;
  }
  if (def.body) {
    const c = getCollider(def.body);
    if (c) return c;
  }
  // Soft: silhouette / behavior body kit → CORE collider (no body on EnemyDef).
  if (def.silhouetteId) {
    const sil = getSilhouette(def.silhouetteId);
    if (sil?.body) {
      const c = getCollider(sil.body);
      if (c) return c;
    }
  }
  if (def.behaviorId) {
    const beh = getBehavior(def.behaviorId);
    if (beh?.body) {
      const c = getCollider(beh.body);
      if (c) return c;
    }
  }
  return undefined;
}

/** Write w/h (and optional gravityScale) onto a Body-like object. */
export function applyColliderProfile(
  body: { w: number; h: number; gravityScale?: number },
  profile: ColliderNums,
): void {
  body.w = profile.w;
  body.h = profile.h;
  if (profile.gravityScale != null && profile.gravityScale > 0) {
    body.gravityScale = profile.gravityScale;
  }
  // hurtInset: stored on profile only; no runtime hurt-box consumer yet.
  void profile.hurtInset;
}

/**
 * Apply ColliderProfile / inline collider to an Enemy Body.
 * Resolve order: inline collider → colliderId catalog → CORE id matching def.body → no-op.
 * Only sets body.w / body.h (and optional gravityScale once). Does not touch AI or draw.
 * Missing refs soft-skip (no throw) so legacy body path keeps working.
 */
export function assembleEnemyCollider(e: Enemy, def?: EnemyDef | null): void {
  const profile = resolveColliderProfile(def);
  if (!profile) return;
  applyColliderProfile(e.body, profile);
}

/** True when catalog / spawn id should route through makeBoss (not trash Enemy). */
export function isBossArchetype(def: EnemyDef | null | undefined, type?: string): boolean {
  return !!(def?.isBoss || def?.body === 'gargoyle' || type === 'gargoyle');
}

const TRASH_KITS: readonly SkelKind[] = ['axe', 'shield', 'archer', 'spear'];

function asTrashKit(v: string | undefined | null): SkelKind | null {
  return (TRASH_KITS as readonly string[]).includes(v ?? '') ? (v as SkelKind) : null;
}

/**
 * Resolve trash draw/pose kit from def + silhouette/behavior (+ optional body soft-alias).
 * Never returns 'gargoyle' — Boss kits must use makeBoss; trash path soft-aliases to axe.
 * Order: silhouette.body → behavior.body → def.body → type string → axe.
 */
export function resolveBodyKit(def: EnemyDef | null | undefined, type: string): SkelKind {
  if (isBossArchetype(def, type)) return 'axe';

  if (def?.silhouetteId) {
    const sil = getSilhouette(def.silhouetteId);
    const k = asTrashKit(sil?.body);
    if (k) return k;
  }
  if (def?.behaviorId) {
    const beh = getBehavior(def.behaviorId);
    const k = asTrashKit(beh?.body);
    if (k) return k;
  }
  const fromBody = asTrashKit(def?.body);
  if (fromBody) return fromBody;
  const fromType = asTrashKit(type);
  if (fromType) return fromType;
  return 'axe';
}

/**
 * Resolve which bossKits id drives Gargoyle.chooseMove.
 * Priority: stage.boss.kit → EnemyDef.kitId → actPool.kit → `'stone'`.
 * Empty / whitespace strings are skipped (soft).
 */
export function resolveBossKit(opts: {
  stageKit?: string | null;
  defKitId?: string | null;
  poolKit?: string | null;
}): string {
  for (const raw of [opts.stageKit, opts.defKitId, opts.poolKit]) {
    if (typeof raw === 'string') {
      const id = raw.trim();
      if (id) return id;
    }
  }
  return 'stone';
}

/**
 * Spawn Boss by archetype id via Gargoyle runtime shell (A-tier interpreter).
 * Does **not** push into g.enemies — director assigns g.boss.
 * Soft-missing catalog → Gargoyle defaults + warn once.
 * HP = def.hp (CORE 900) × params.hpScale → then attach loadout gear (BossLoad1).
 * Collider from same resolve as trash. Cast runs in Gargoyle idle/walk (BossLoad2).
 * Gsm1: non-empty behaviorId steps → idle/walk tickBossBehaviorGap; kit chooseMove unchanged.
 */
export function makeBoss(enemyId: string, x: number, params: GargoyleParams = {}): Gargoyle {
  const id = enemyId || 'gargoyle';
  const def = getEnemy(id) ?? ENEMY_BY_ID[id];
  if (!def && !_makeBossMissingWarn) {
    _makeBossMissingWarn = true;
    console.warn(`[makeBoss] missing EnemyDef '${id}', using Gargoyle defaults`);
  }
  // params.kit (caller / stage) wins over EnemyDef.kitId; else Gargoyle defaults 'stone'
  const kit = resolveBossKit({ stageKit: params.kit, defKitId: def?.kitId });
  const boss = new Gargoyle(x, {
    ...params,
    displayName: params.displayName ?? def?.name,
    baseHp: params.baseHp ?? def?.hp ?? 900,
    kit,
  });
  const profile = resolveColliderProfile(def);
  if (profile) applyColliderProfile(boss.body, profile);
  boss.archetypeId = def?.id ?? id;
  boss.silhouetteId = def?.silhouetteId ?? null;
  boss.behaviorId = def?.behaviorId ?? null;
  // Gsm1: attach non-empty BehaviorDef.steps for idle/walk gap loco; empty/core stub → null (bit-identical shell).
  boss.behaviorSteps = null;
  boss.behaviorRt = null;
  if (def?.behaviorId) {
    const beh = getBehavior(def.behaviorId);
    if (beh?.steps?.length) {
      boss.behaviorSteps = beh.steps;
    }
  }
  // Soft loadout after catalog baseHp × hpScale (constructor); same order as trash.
  // BossLoad1 gear/spawn; BossLoad2 cast in Gargoyle think (idle/walk).
  if (def) attachEnemyLoadout(boss, def);
  return boss;
}

/**
 * Spawn a skirmish enemy by archetype id.
 * `scale` comes from meta enemyScale so late levels stay fair.
 * Unknown ids soft-alias to axe body kit when possible; missing catalog → soft defaults (no CORE_* hard fallback).
 *
 * Boss / gargoyle: **must** use makeBoss. If makeEnemy is pointed at isBoss or
 * body==='gargoyle', warn once and soft-alias kit to 'axe' (keep spawn non-null).
 */
export function makeEnemy(type: EnemyType, x: number, scaleOrOpts: number | MakeEnemyOpts = 1): Enemy {
  const def = getEnemy(type) ?? ENEMY_BY_ID[type];
  const bossRoute = isBossArchetype(def, type);

  if (bossRoute) {
    if (!_makeEnemyBossWarn) {
      _makeEnemyBossWarn = true;
      console.warn(`[makeEnemy] Boss archetype '${type}' must use makeBoss; falling back to axe body`);
    }
  }

  const body = resolveBodyKit(def, type);
  const e = new Enemy(x, 60, body);

  // Apply catalog stats (preserve feel when def matches class defaults).
  if (def && !bossRoute) {
    e.archetypeId = def.id;
    e.scoreName = def.name;
    e.maxHp = def.hp;
    e.hp = def.hp;
    if (def.dropChance != null) e.dropChance = def.dropChance;
    if (def.parriedDur != null) e.parriedDur = def.parriedDur;
    if (def.cooldown != null) e.cooldown = def.cooldown;
  } else {
    e.archetypeId = bossRoute ? 'axe' : type;
  }

  const opts: MakeEnemyOpts = typeof scaleOrOpts === 'number' ? { scale: scaleOrOpts } : scaleOrOpts;
  const scale = opts.scale ?? 1;
  if (scale !== 1) {
    e.maxHp = Math.round(e.maxHp * scale);
    e.hp = e.maxHp;
  }

  const eliteOk = def?.eliteEligible !== false && !bossRoute;
  let mod: EliteModId | null | undefined = opts.eliteMod;
  if (mod === undefined) {
    const chance = eliteOk ? (opts.eliteChance ?? ELITE_CHANCE) : 0;
    mod = chance > 0 && Math.random() < chance ? rollEliteMod() : null;
  }
  if (mod && eliteOk) applyEliteMod(e, mod);
  // Soft silhouette id for parts interpreter.
  e.silhouetteId = (def && !bossRoute) ? (def.silhouetteId ?? null) : null;
  // Soft behavior: prefer def.behaviorId steps, else body soft-alias / kit CORE recipe.
  e.behaviorId = (def && !bossRoute) ? (def.behaviorId ?? null) : null;
  e.behaviorSteps = null;
  e.behaviorRt = null;
  const behaviorCandidates = [
    e.behaviorId,
    def && !bossRoute ? def.body : null,
    body,
  ].filter((id): id is string => !!id);
  for (const id of behaviorCandidates) {
    const beh = getBehavior(id);
    if (beh?.steps?.length) {
      e.behaviorSteps = beh.steps;
      if (!e.behaviorId) e.behaviorId = id;
      break;
    }
  }
  // Collider: inline → colliderId → body soft-alias → silhouette/behavior kit.
  // Boss mis-route → axe collider.
  if (def && !bossRoute) {
    assembleEnemyCollider(e, def);
  } else {
    assembleEnemyCollider(e, getEnemy('axe') ?? ENEMY_BY_ID['axe'] ?? null);
  }
  // Soft loadout (skills/gear/pills/talismans) — after elite so HP scale is final base.
  if (def && !bossRoute) {
    attachEnemyLoadout(e, def);
  }
  return e;
}
