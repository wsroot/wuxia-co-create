/**
 * Schemastery validators for content-pack / 门派 definitions.
 *
 * Validation only: a definition that passes is registered as-is (the original
 * object is kept, so nothing is reshaped). A definition that fails is rejected
 * by the owning service with a console warning — the game keeps running.
 *
 * The TypeScript interfaces (WeaponDef / PillDef / …) stay the source of truth;
 * these schemas guard data coming from plugins at runtime.
 */
import { Schema } from 'cordis';
import type { Sfx } from '../audio/sfx';
import type { ScriptStep, FxPreset } from '../meta/talismanScripts';
import type { AnimStep } from '../meta/animScripts';
import { ANIM_STEP_KINDS } from '../meta/animScripts';
import { WEAPON_LOOK_PART_KINDS, BLADE_PROFILES } from '../meta/weaponLooks';

const req = {
  str: () => Schema.string().required(),
  num: () => Schema.number().required(),
};
const lit = <T extends string>(values: readonly T[]) => Schema.union(values.map((v) => Schema.const(v)));

/* ── shared enums ──────────────────────────────────────────── */

const AFFINITIES = ['bossGargoyle', 'shieldBreak', 'antiArmor', 'juggle', 'dashFocus', 'rage'] as const;
const SHAPES = ['sword', 'dagger', 'axe', 'spear', 'twin', 'greatsword'] as const;
const WEIGHTS = ['light', 'medium', 'heavy'] as const;
const CATEGORIES = ['bare', 'blade', 'spear', 'heavy'] as const;
const ENEMY_TYPES = ['axe', 'shield', 'archer', 'spear'] as const;
/** Closed body/AI/draw kits plugins may pick (no custom Canvas). */
const ENEMY_BODIES = ['axe', 'shield', 'archer', 'spear', 'gargoyle'] as const;
const BACKDROPS = ['night', 'dock', 'ash', 'eclipse'] as const;
const BEAT_WHEN = ['enter', 'afterArena', 'beforeBoss', 'afterBoss', 'betweenActs'] as const;
const BOSS_TINTS = ['jade', 'ink', 'blood', 'ash'] as const;
/** Core boss kit ids (stone|rain|tomb|night); ActPoolSchema.kit is open string (soft-ref bossKits). */
const _CORE_BOSS_KITS = ['stone', 'rain', 'tomb', 'night'] as const;
void _CORE_BOSS_KITS;
/** Built-in elite / set ids (reference; ActPoolSchema accepts any string id). */
const _CORE_ELITE_MODS = ['tongpi', 'shixue', 'shanbu', 'fanshang', 'zhongji', 'xiehuo'] as const;
const _CORE_ARMOR_SETS = ['yexing', 'tiegu', 'yinixue', 'pojunrui', 'qingxinding', 'anhunling', 'yingzhi'] as const;
void _CORE_ELITE_MODS; void _CORE_ARMOR_SETS;
const FX_PRESETS = ['flare', 'ring', 'spark', 'qi', 'fire', 'dust', 'swordQi'] as const satisfies readonly FxPreset[];
const VOLLEY_STYLES = ['skySword', 'thunder', 'waterPulse'] as const;
const SFX_IDS = [
  'slash', 'heavy', 'kick', 'hit', 'hitHeavy', 'clang', 'parry', 'block', 'bone', 'jump', 'land',
  'hurt', 'dash', 'roar', 'arrow', 'fire', 'boom', 'potion', 'super', 'superSlash', 'telegraph',
  'shieldBang', 'claw', 'whip', 'bash', 'ui', 'death', 'wave', 'stagger', 'flap',
] as const satisfies readonly Sfx[];
// Compile-time completeness checks (fail typecheck if an engine enum grows).
type _SfxMissing = Exclude<Sfx, (typeof SFX_IDS)[number]>;
type _FxMissing = Exclude<FxPreset, (typeof FX_PRESETS)[number]>;
const _sfxComplete: [_SfxMissing] extends [never] ? true : never = true;
const _fxComplete: [_FxMissing] extends [never] ? true : never = true;
void _sfxComplete; void _fxComplete;

const MaterialBag = Schema.dict(Schema.natural());

/* ── framework rulers (plugins tag only; do not invent new tiers) ── */
const INHERENT_Q = ['tian', 'di', 'xuan', 'huang', 'fan', 'lie'] as const;
const CONSUMABLE_G = ['shang', 'zhong', 'xia'] as const;
const InherentQuality = lit(INHERENT_Q);
const ConsumableGrade = lit(CONSUMABLE_G);
/** EquipTier 1..9 — out-of-range rejected by Schema (service warns, no crash). */
const EquipTier = Schema.number().min(1).max(9).step(1);


/* ── weapons / pills / materials ───────────────────────────── */

const Unlock = Schema.union([
  Schema.object({ type: Schema.const('starter').required() }),
  Schema.object({ type: Schema.const('bossClear').required(), hint: Schema.string() }),
  Schema.object({ type: Schema.const('blueprint').required(), hint: req.str() }),
  Schema.object({ type: Schema.const('eliteDrop').required(), hint: req.str() }),
]);

const WeaponFeelBoxTuneSchema = Schema.object({
  tipXPush: Schema.number(),
  tipWFloorMul: Schema.number(),
  moveBoxWMul: Schema.dict(Schema.number()),
  moveBoxHMul: Schema.dict(Schema.number()),
});
const WeaponFeelSchema = Schema.object({
  dmgMul: Schema.number(),
  airDmgMul: Schema.number(),
  moveDmgMul: Schema.dict(Schema.number()),
  moveSpeedMul: Schema.dict(Schema.number()),
  boxTune: WeaponFeelBoxTuneSchema,
});
const CraftDataSchema = Schema.object({
  materials: MaterialBag.required(),
  fee: Schema.natural().required(),
  /** May be fractional (floored × nextLevel at craft time). */
  upgradeScale: Schema.dict(Schema.number()),
  upgradeFlat: MaterialBag,
  upgradeAt: Schema.array(Schema.object({
    minLevel: Schema.natural().required(),
    mats: MaterialBag.required(),
  })),
});

export const WeaponSchema = Schema.object({
  id: req.str(), name: req.str(), lore: req.str(), tip: req.str(),
  unlock: Unlock.required(),
  damage: req.num(), speed: req.num(), reach: req.num(), poise: req.num(),
  rage: req.num(), airHover: req.num(),
  weight: lit(WEIGHTS).required(),
  category: lit(CATEGORIES).required(),
  affinities: Schema.array(lit(AFFINITIES)).required(),
  affinityBonus: req.num(),
  blade: req.str(), trail: req.str(), edge: req.str(),
  length: req.num(),
  shape: lit(SHAPES).required(),
  quality: InherentQuality,
  tier: EquipTier,
  feel: WeaponFeelSchema,
  craft: CraftDataSchema,
  sprite: Schema.object({
    // Nested optional: avoid .required() so weapons without sprite aren't coerced+rejected.
    // Open string: must match a registered ctx.sheets id (bundled 6 still pack-registered).
    sheetId: Schema.string(),
    frame: Schema.natural(),
    pivot: Schema.object({ x: Schema.number(), y: Schema.number() }),
    scale: Schema.number(),
  }),
  lookId: Schema.string(),
  parts: Schema.array(Schema.any()),
  /** Soft ref → ctx.combatStyles; missing id soft-skips to category default. */
  combatStyleId: Schema.string(),
});

const PillEffectSchema = Schema.object({
  heal: Schema.number(), healWithFrag: Schema.boolean(),
  rage: Schema.number(), rageWithFrag: Schema.boolean(),
  neili: Schema.number(), neiliWithFrag: Schema.boolean(),
  stamina: Schema.number(), armor: Schema.number(),
  invuln: Schema.natural(), clearControl: Schema.boolean(),
  atkBuffSec: Schema.number(), defBuffSec: Schema.number(), defBuffMax: Schema.boolean(),
  porenBuffSec: Schema.number(), pojiaBuffSec: Schema.number(),
  jingzhouSec: Schema.number(), affixSuppressSec: Schema.number(),
  baoqiSec: Schema.number(), yingbuSec: Schema.number(),
  xuhangSec: Schema.number(), xuhangTicks: Schema.natural(),
  durScaleWithPillMul: Schema.boolean(),
  floatText: Schema.string(), floatColor: Schema.string(),
  sfx: lit(['potion', 'ui'] as const),
  castFeel: Schema.object({
    hitstop: Schema.natural(),
    shake: Schema.object({ amp: Schema.number(), frames: Schema.natural() }),
    flash: Schema.object({ color: Schema.string(), a: Schema.number().min(0).max(1) }),
  }),
  whileActive: Schema.object({
    auraPreset: lit(['ring', 'qi', 'ember', 'tint'] as const),
    color: Schema.string(),
    period: Schema.natural(),
    hudTint: Schema.string(),
    rimGlow: Schema.boolean(),
  }),
});

export const PillSchema = Schema.object({
  id: req.str(), name: req.str(), lore: req.str(), tip: req.str(),
  cost: MaterialBag.required(),
  fee: Schema.natural().required(),
  carryCap: Schema.natural().required(),
  quality: InherentQuality,
  grade: ConsumableGrade,
  effect: PillEffectSchema,
  sortie: Schema.boolean(),
});

export const MaterialSchema = Schema.object({
  id: req.str(), name: req.str(), lore: req.str(),
  weight: Schema.number().min(0).required(),
  rare: Schema.boolean(),
});

/* ── talismans + data-only effect timelines ────────────────── */

const At = lit(['caster', 'ground', 'boss'] as const);

/** One validator per step kind — unknown kinds are rejected (no custom code). */
export const STEP_SCHEMAS: Record<ScriptStep['kind'], Schema> = {
  wait: Schema.object({ kind: Schema.const('wait').required(), frames: Schema.natural().required() }),
  banner: Schema.object({
    kind: Schema.const('banner').required(), text: req.str(), sub: Schema.string(), dur: Schema.natural(),
  }),
  float: Schema.object({
    kind: Schema.const('float').required(), text: req.str(), color: Schema.string(),
    size: Schema.number(), bold: Schema.boolean(), where: lit(['caster', 'eachElite', 'boss'] as const),
  }),
  fx: Schema.object({
    kind: Schema.const('fx').required(),
    // Legacy preset name OR catalog recipeId (aliases registered in core/menpai).
    preset: lit(FX_PRESETS),
    recipeId: Schema.string(),
    at: At,
    ox: Schema.number(), oy: Schema.number(), size: Schema.number(), color: Schema.string(),
    life: Schema.number(), n: Schema.natural(), heavy: Schema.boolean(),
  }),
  shake: Schema.object({ kind: Schema.const('shake').required(), amp: req.num(), frames: Schema.natural().required() }),
  hitstop: Schema.object({ kind: Schema.const('hitstop').required(), frames: Schema.natural().required() }),
  flash: Schema.object({ kind: Schema.const('flash').required(), color: req.str(), a: Schema.number().min(0).max(1).required() }),
  sfx: Schema.object({ kind: Schema.const('sfx').required(), id: req.str() }),
  damageRadius: Schema.object({
    kind: Schema.const('damageRadius').required(), rx: req.num(), ry: Schema.number(), damage: req.num(),
    kbX: Schema.number(), kbY: Schema.number(), hitstun: Schema.number(), hitstop: Schema.number(),
    shake: Schema.number(), heavy: Schema.boolean(), ox: Schema.number(), oy: Schema.number(),
  }),
  damageCone: Schema.object({
    kind: Schema.const('damageCone').required(), reach: req.num(), halfH: req.num(), damage: req.num(),
    kbX: Schema.number(), kbY: Schema.number(), hitstun: Schema.number(), heavy: Schema.boolean(),
  }),
  spawnVolley: Schema.object({
    kind: Schema.const('spawnVolley').required(),
    style: lit(VOLLEY_STYLES),
    volleyId: Schema.string(),
    count: Schema.natural().required(), interval: Schema.natural().required(), damage: req.num(),
    spread: Schema.number(), radius: Schema.number(),
  }),
  knockback: Schema.object({ kind: Schema.const('knockback').required(), r: req.num(), kbX: req.num(), kbY: req.num() }),
  status: Schema.object({
    kind: Schema.const('status').required(),
    affixSuppress: Schema.number(), clearHazards: Schema.boolean(), eliteSuppress: Schema.number(),
    clearControl: Schema.boolean(), invuln: Schema.number(), heal: Schema.number(), stamina: Schema.number(),
    hushen: Schema.number(), poshi: Schema.boolean(), dingshen: Schema.number(), anhun: Schema.number(),
    floatEachElite: Schema.string(),
    root: Schema.number(), rootRadius: Schema.number(),
  }),
  damageBox: Schema.object({
    kind: Schema.const('damageBox').required(),
    w: req.num(), h: req.num(), damage: req.num(),
    ox: Schema.number(), oy: Schema.number(),
    kbX: Schema.number(), kbY: Schema.number(),
    hitstun: Schema.number(), hitstop: Schema.number(), shake: Schema.number(), heavy: Schema.boolean(),
  }),
  damageDonut: Schema.object({
    kind: Schema.const('damageDonut').required(),
    rInner: req.num(), rOuter: req.num(), damage: req.num(),
    kbX: Schema.number(), kbY: Schema.number(), hitstun: Schema.number(), heavy: Schema.boolean(),
  }),
  zone: Schema.object({
    kind: Schema.const('zone').required(),
    shape: lit(['circle', 'box'] as const).required(),
    duration: Schema.natural().required(),
    tickDamage: Schema.number(),
    status: lit(['root', 'slow', 'burn'] as const),
    radius: Schema.number(), w: Schema.number(), h: Schema.number(),
    ox: Schema.number(), oy: Schema.number(), color: Schema.string(),
  }),
  pull: Schema.object({
    kind: Schema.const('pull').required(),
    radius: req.num(), strength: req.num(), frames: Schema.natural(),
  }),
  root: Schema.object({
    kind: Schema.const('root').required(),
    duration: Schema.natural().required(), radius: Schema.number(),
  }),
  multihit: Schema.object({
    kind: Schema.const('multihit').required(),
    times: Schema.natural().min(1).required(),
    gapFrames: Schema.natural().required(),
    step: Schema.any().required(),
  }),
};

/** Validate a timeline; throws with the failing step index. */
const DAMAGE_NEST_KINDS = new Set(['damageRadius', 'damageCone', 'damageBox', 'damageDonut']);

export function validateSteps(steps: unknown, where: string): void {
  if (!Array.isArray(steps)) throw new TypeError(`${where} 必须是步骤数组`);
  steps.forEach((step, i) => {
    const kind = (step as { kind?: unknown } | null)?.kind;
    const schema = typeof kind === 'string' ? STEP_SCHEMAS[kind as ScriptStep['kind']] : undefined;
    if (!schema) throw new TypeError(`${where}[${i}] 未知步骤 kind=${String(kind)}`);
    try {
      schema(step);
    } catch (e) {
      throw new TypeError(`${where}[${i}] (${String(kind)}) ${(e as Error).message}`);
    }
    if (kind === 'multihit') {
      const nested = (step as { step?: { kind?: string } }).step;
      const nk = nested?.kind;
      if (!nk || !DAMAGE_NEST_KINDS.has(nk)) {
        throw new TypeError(`${where}[${i}] multihit.step 须为 damageRadius|damageCone|damageBox|damageDonut`);
      }
      validateSteps([nested], `${where}[${i}].step`);
    }
  });
}

/* ── AnimStep whitelist (look-only; no damage) ─────────────── */

export const ANIM_STEP_SCHEMAS: Record<AnimStep['kind'], Schema> = {
  wait: Schema.object({ kind: Schema.const('wait').required(), frames: Schema.natural().required() }),
  playPose: Schema.object({
    kind: Schema.const('playPose').required(), poseId: req.str(), frames: Schema.natural(),
    timeline: lit(['strike', 'full'] as const),
  }),
  holdPose: Schema.object({
    kind: Schema.const('holdPose').required(), poseId: req.str(), frames: Schema.natural().required(),
  }),
  afterimage: Schema.object({
    kind: Schema.const('afterimage').required(),
    count: Schema.natural(), life: Schema.natural(), color: Schema.string(), alpha: Schema.number(),
  }),
  weaponTrail: Schema.object({
    kind: Schema.const('weaponTrail').required(),
    frames: Schema.natural(), color: Schema.string(), width: Schema.number(),
  }),
  swingArc: Schema.object({
    kind: Schema.const('swingArc').required(),
    radius: Schema.number(), sweep: Schema.number(), color: Schema.string(), frames: Schema.natural(),
  }),
  sealGlyph: Schema.object({
    kind: Schema.const('sealGlyph').required(),
    text: Schema.string(), color: Schema.string(), frames: Schema.natural(), scale: Schema.number(),
  }),
  inkBurst: Schema.object({
    kind: Schema.const('inkBurst').required(),
    size: Schema.number(), color: Schema.string(), n: Schema.natural(), recipeId: Schema.string(),
  }),
  tintCaster: Schema.object({
    kind: Schema.const('tintCaster').required(),
    color: req.str(), frames: Schema.natural().required(), alpha: Schema.number(),
  }),
  sfx: Schema.object({ kind: Schema.const('sfx').required(), id: req.str() }),
  flash: Schema.object({ kind: Schema.const('flash').required(), color: req.str(), a: Schema.number().min(0).max(1).required() }),
  hitstop: Schema.object({ kind: Schema.const('hitstop').required(), frames: Schema.natural().required() }),
  shake: Schema.object({ kind: Schema.const('shake').required(), amp: req.num(), frames: Schema.natural().required() }),
  hop: Schema.object({
    kind: Schema.const('hop').required(),
    vy: Schema.number().min(-16).max(16),
    vx: Schema.number().min(-10).max(10),
    faceMul: Schema.boolean(),
  }),
  bounce: Schema.object({
    kind: Schema.const('bounce').required(),
    hops: Schema.natural().min(1).max(6).required(),
    vy: Schema.number().min(-16).max(16),
    gapFrames: Schema.natural().max(60),
    vx: Schema.number().min(-10).max(10),
  }),
  hover: Schema.object({
    kind: Schema.const('hover').required(),
    frames: Schema.natural().min(1).max(90).required(),
    vy: Schema.number().min(-16).max(16),
  }),
  fallStrike: Schema.object({
    kind: Schema.const('fallStrike').required(),
    vy: Schema.number().min(0).max(16),
  }),
  /* A. skill / general */
  dash: Schema.object({
    kind: Schema.const('dash').required(),
    dist: Schema.number().min(8).max(160),
    frames: Schema.natural().min(1).max(20),
    faceMul: Schema.boolean(),
  }),
  face: Schema.object({
    kind: Schema.const('face').required(),
    dir: Schema.union([Schema.const(1), Schema.const(-1), Schema.const('player'), Schema.const('away')]),
  }),
  scalePunch: Schema.object({
    kind: Schema.const('scalePunch').required(),
    scale: Schema.number().min(0.75).max(1.35),
    frames: Schema.natural().min(2).max(30),
  }),
  landDust: Schema.object({
    kind: Schema.const('landDust').required(),
    n: Schema.natural().min(1).max(20), color: Schema.string(),
  }),
  sparkBurst: Schema.object({
    kind: Schema.const('sparkBurst').required(),
    color: Schema.string(), n: Schema.natural().min(1).max(16),
  }),
  flareBurst: Schema.object({
    kind: Schema.const('flareBurst').required(),
    size: Schema.number().min(10).max(140), color: Schema.string(), frames: Schema.natural().max(40),
  }),
  ringPulse: Schema.object({
    kind: Schema.const('ringPulse').required(),
    size: Schema.number().min(10).max(160), color: Schema.string(), frames: Schema.natural().max(40),
  }),
  swordQiFlash: Schema.object({
    kind: Schema.const('swordQiFlash').required(), color: Schema.string(),
  }),
  camZoom: Schema.object({
    kind: Schema.const('camZoom').required(),
    z: Schema.number().min(1.01).max(1.2), frames: Schema.natural().max(60),
  }),
  slowmo: Schema.object({
    kind: Schema.const('slowmo').required(),
    rate: Schema.number().min(0.15).max(0.95), frames: Schema.natural().min(4).max(90),
  }),
  parryFlash: Schema.object({
    kind: Schema.const('parryFlash').required(), color: Schema.string(),
  }),
  guardGlow: Schema.object({
    kind: Schema.const('guardGlow').required(),
    color: Schema.string(), frames: Schema.natural().min(4).max(40),
  }),
  chainPose: Schema.object({
    kind: Schema.const('chainPose').required(),
    poseIds: Schema.array(Schema.string()).required(),
    frameEach: Schema.natural().min(1).max(30),
  }),
  loopPose: Schema.object({
    kind: Schema.const('loopPose').required(),
    poseId: req.str(), frames: Schema.natural().min(1).max(120).required(),
  }),
  pullIn: Schema.object({
    kind: Schema.const('pullIn').required(),
    n: Schema.natural().min(2).max(16), color: Schema.string(), frames: Schema.natural().max(40),
  }),
  orbitRing: Schema.object({
    kind: Schema.const('orbitRing').required(),
    n: Schema.natural().min(2).max(12), color: Schema.string(),
    frames: Schema.natural().max(60), radius: Schema.number().min(16).max(100),
  }),
  beamLine: Schema.object({
    kind: Schema.const('beamLine').required(),
    length: Schema.number().min(30).max(200), color: Schema.string(), frames: Schema.natural().max(24),
  }),
  crescentSlash: Schema.object({
    kind: Schema.const('crescentSlash').required(),
    radius: Schema.number(), color: Schema.string(), frames: Schema.natural(),
  }),
  groundCrack: Schema.object({
    kind: Schema.const('groundCrack').required(),
    width: Schema.number().min(30).max(180), frames: Schema.natural().max(60), color: Schema.string(),
  }),
  riseMist: Schema.object({
    kind: Schema.const('riseMist').required(),
    frames: Schema.natural().max(60), color: Schema.string(),
  }),
  /* B. talisman / seal */
  sealPaper: Schema.object({
    kind: Schema.const('sealPaper').required(),
    frames: Schema.natural().max(48), color: Schema.string(),
    w: Schema.number().min(16).max(80), h: Schema.number().min(20).max(100),
  }),
  sealStamp: Schema.object({
    kind: Schema.const('sealStamp').required(),
    text: Schema.string(), frames: Schema.natural().max(40), scale: Schema.number().min(0.6).max(2.5),
  }),
  sealSpin: Schema.object({
    kind: Schema.const('sealSpin').required(),
    text: Schema.string(), frames: Schema.natural().max(60), revs: Schema.number().min(0.25).max(4),
  }),
  sealRain: Schema.object({
    kind: Schema.const('sealRain').required(),
    count: Schema.natural().min(1).max(12), text: Schema.string(), color: Schema.string(),
  }),
  sealChain: Schema.object({
    kind: Schema.const('sealChain').required(),
    count: Schema.natural().min(1).max(8), gap: Schema.natural().max(20), text: Schema.string(),
  }),
  talismanTrail: Schema.object({
    kind: Schema.const('talismanTrail').required(),
    frames: Schema.natural().max(40), color: Schema.string(),
  }),
  inkSplash: Schema.object({
    kind: Schema.const('inkSplash').required(),
    size: Schema.number().min(10).max(80), color: Schema.string(),
  }),
  baguaRing: Schema.object({
    kind: Schema.const('baguaRing').required(),
    frames: Schema.natural().max(60), color: Schema.string(), radius: Schema.number().min(30).max(140),
  }),
  runeOrbit: Schema.object({
    kind: Schema.const('runeOrbit').required(),
    count: Schema.natural().min(2).max(10), frames: Schema.natural().max(60), color: Schema.string(),
  }),
  paperBurn: Schema.object({
    kind: Schema.const('paperBurn').required(),
    frames: Schema.natural().max(48), color: Schema.string(),
  }),
  exorcismWave: Schema.object({
    kind: Schema.const('exorcismWave').required(),
    radius: Schema.number().min(40).max(200), frames: Schema.natural().max(48), color: Schema.string(),
  }),
  bindThreads: Schema.object({
    kind: Schema.const('bindThreads').required(),
    frames: Schema.natural().max(48), color: Schema.string(),
  }),
  soulBell: Schema.object({
    kind: Schema.const('soulBell').required(),
    frames: Schema.natural().max(40),
  }),
};

/** Validate AnimStep timeline; unknown kind → reject at register. */
export function validateAnimSteps(steps: unknown, where: string): void {
  if (!Array.isArray(steps)) throw new TypeError(`${where} 必须是步骤数组`);
  steps.forEach((step, i) => {
    const kind = (step as { kind?: unknown } | null)?.kind;
    const schema = typeof kind === 'string' ? ANIM_STEP_SCHEMAS[kind as AnimStep['kind']] : undefined;
    if (!schema) {
      throw new TypeError(`${where}[${i}] 未知 AnimStep kind=${String(kind)}（白名单: ${ANIM_STEP_KINDS.join('|')}）`);
    }
    try {
      schema(step);
    } catch (e) {
      throw new TypeError(`${where}[${i}] (${String(kind)}) ${(e as Error).message}`);
    }
  });
}

export const AnimRecipeSchema = Schema.object({
  id: req.str(),
  steps: Schema.array(Schema.any()).required(),
  label: Schema.string(),
});


export const TalismanScriptSchema = Schema.object({
  id: req.str(),
  steps: Schema.array(Schema.any()).required(),
  anim: Schema.union([Schema.string(), Schema.array(Schema.any())]),
});

export const TalismanSchema = Schema.object({
  id: req.str(), name: req.str(), fogName: req.str(), lore: req.str(), tip: req.str(), color: req.str(),
  cost: MaterialBag.required(),
  fee: Schema.natural().required(),
  stockCap: Schema.natural().required(),
  runCharges: Schema.natural().required(),
  scriptId: Schema.string(),
  scriptParams: Schema.dict(Schema.union([Schema.number(), Schema.string(), Schema.boolean()])),
  timeline: Schema.array(Schema.any()),
  anim: Schema.union([Schema.string(), Schema.array(Schema.any())]),
  quality: InherentQuality,
  grade: ConsumableGrade,
  icon: Schema.string(),
});

/* ── stages / acts ─────────────────────────────────────────── */

const Platform = Schema.object({
  x: req.num(), y: req.num(), w: req.num(), h: req.num(),
  kind: lit(['roof', 'bridge', 'pavilion'] as const),
});

const Beat = Schema.object({
  id: req.str(), when: lit(BEAT_WHEN).required(), arenaIndex: Schema.natural(),
  title: req.str(), subtitle: Schema.string(), holdFrames: Schema.natural(), slowmo: Schema.number(),
});
export const BeatSchema = Beat;

const Spawn = Schema.object({
  // Open id: skirmish archetypes from ctx.enemies (axe/shield/archer/spear built-in).
  type: req.str(), side: lit(['L', 'R'] as const).required(), delay: req.num(),
});
void ENEMY_TYPES; // referenced by EnemySchema body kits / docs

export const StageSchema = Schema.object({
  actIndex: Schema.natural().required(),
  id: req.str(), title: req.str(), subtitle: Schema.string().required(),
  length: req.num(), start: req.num(),
  arenas: Schema.array(Schema.object({
    name: req.str(), x0: req.num(), trigger: req.num(),
    waves: Schema.array(Schema.array(Spawn)).required(),
    platforms: Schema.array(Platform),
  })).required(),
  boss: Schema.object({
    name: req.str(), x0: req.num(), trigger: req.num(),
    bossName: req.str(), bossSubtitle: Schema.string().required(),
    // Open id: Boss archetype from ctx.enemies (built-in 'gargoyle').
    bossId: req.str(),
    hpScale: req.num(), dmgScale: req.num(), tint: lit(BOSS_TINTS),
    // Open kit id (ctx.bossKits); G3 enterBoss priority over actPool.kit
    kit: Schema.string(),
  }).required(),
  platforms: Schema.array(Platform).required(),
  /** Catalog BackdropDef id (soft; unknown → night generator). */
  backdropTheme: req.str(),
  beats: Schema.array(Beat).required(),
});

export const ActPoolSchema = Schema.object({
  // Open kit id (ctx.bossKits); soft-ref — align Stage.boss.kit / EnemyDef.kitId (Act1.5)
  kit: Schema.string().required(),
  tint: lit(BOSS_TINTS).required(),
  // Open dict: elite mod ids come from ctx.eliteMods (plugins may add).
  eliteWeights: Schema.dict(Schema.number().min(0)).required(),
  dropLean: Schema.array(String).required(),
  blueprintLean: Schema.array(String).required(),
  // Open ids: armor set ids come from ctx.armorSets.
  setLean: Schema.array(Schema.string()).required(),
  loreLine: Schema.string().required(),
});


/* ── skills / neigong / armor sets / affixes / titles ───── */

const SKILL_KINDS = ['passive', 'active'] as const;
const SKILL_TRACKS = ['combat'] as const;
const WEAPON_GATES = ['bare', 'blade', 'spear', 'heavy', 'any'] as const;
const ARMOR_SLOTS = ['head', 'body', 'arms', 'legs', 'neck', 'ring', 'waist'] as const;

const MaterialCost = Schema.dict(Schema.natural());

const NumTable = Schema.array(Schema.number());
const SkillEffectsTableSchema = Schema.object({
  defBonus: NumTable, jumpBoost: NumTable, doubleJump: Schema.boolean(),
  canDash: Schema.boolean(), dashKickBonus: NumTable,
  pojunMult: NumTable, pojunDurationSec: NumTable, pojunCdSec: NumTable,
  healAmt: NumTable, healCdSec: NumTable,
  skillDmgMult: NumTable, skillCdSec: NumTable,
});
const SKILL_CAST_KINDS = ['heal', 'pojun', 'ningqi', 'attack'] as const;
/** Historical skill attack keys (now open catalog ids; kept for docs). */
const SKILL_ATTACK_KEYS = [
  'daomang', 'qiangjue', 'bengquan', 'huzhua', 'huixuan', 'zhanma',
  'tuci', 'chuanxin', 'hengsao', 'kaitian', 'tieshan', 'fanyun',
] as const;
void SKILL_ATTACK_KEYS;

export const SkillSchema = Schema.object({
  id: req.str(), name: req.str(), fogName: req.str(),
  kind: lit(SKILL_KINDS).required(),
  track: lit(SKILL_TRACKS).required(),
  lore: req.str(), tip: req.str(), profHint: req.str(),
  meditateCost: MaterialCost.required(),
  fee: Schema.natural().required(),
  weaponGate: lit(WEAPON_GATES),
  neiliCost: Schema.number().min(0),
  quality: InherentQuality,
  effects: SkillEffectsTableSchema,
  profOn: Schema.array(lit(['jump', 'dash', 'block', 'hitTaken', 'dashKickHit', 'poiseBuffHit'] as const)),
  castKind: lit(SKILL_CAST_KINDS),
  /** Catalog AttackBoxDef id (soft; missing → skip cast). */
  attackKey: Schema.string(),
  commandSeq: Schema.array(lit(['D', 'F', 'B', 'U'] as const)),
  commandLabel: Schema.string(),
  hudHint: Schema.string(),
  touchPriority: Schema.number(),
  attackChain: Schema.array(Schema.string()),
  castFx: Schema.array(Schema.any()),
  castAnim: Schema.union([Schema.string(), Schema.array(Schema.any())]),
});

const NeigongEffectsTableSchema = Schema.object({
  damageBonus: Schema.array(Schema.number()).required(),
  rageBonus: Schema.array(Schema.number()).required(),
  defBonus: Schema.array(Schema.number()).required(),
  neiliRegenMul: Schema.array(Schema.number()).required(),
  executeMulBonus: Schema.number(),
  lifestealMax: Schema.number(),
  parryWindowBonusMax: Schema.number(),
  parryRageBonusMax: Schema.number(),
  poiseMulBonus: Schema.number(),
});

export const NeigongSchema = Schema.object({
  id: req.str(), name: req.str(), lore: req.str(), tip: req.str(),
  signature: req.str(), style: req.str(),
  meditateCost: MaterialCost.required(),
  fee: Schema.natural().required(),
  quality: InherentQuality,
  effects: NeigongEffectsTableSchema,
});

const SetBonusNums = Schema.object({
  def: Schema.number(), atk: Schema.number(),
  dashCdMul: Schema.number(), dashIframes: Schema.number(),
  dmgTakenMul: Schema.number(), lifesteal: Schema.number(),
  executeMul: Schema.number(), poiseMul: Schema.number(),
  neiliRegenMul: Schema.number(), parryWindowBonus: Schema.number(),
  affixDmgMul: Schema.number(), curseTakenMul: Schema.number(),
  rage: Schema.number(),
});

export const ArmorSetSchema = Schema.object({
  id: req.str(), fogName: req.str(), name: req.str(), lore: req.str(),
  slots: Schema.array(lit(ARMOR_SLOTS)).required(),
  weight: Schema.number().min(0).required(),
  two: SetBonusNums.required(),
  full: SetBonusNums.required(),
  twoTip: req.str(), fullTip: req.str(),
});

export const WepAffixSchema = Schema.object({
  id: req.str(), name: req.str(), fogName: req.str(), tip: req.str(),
  poiseMul: Schema.number(), lifesteal: Schema.number(),
  neiliOnHit: Schema.number(), speedMul: Schema.number(),
  heavyDmgMul: Schema.number(), staminaRefund: Schema.number(),
});


const ENEMY_LOOT_KINDS = [
  'material', 'blueprint', 'skill', 'neigong',
  'pillRecipe', 'talismanRecipe', 'gear', 'crystal',
] as const;

/** Per-kill loot entry — soft id refs validated only at roll time (skip if absent). */
export const EnemyLootEntrySchema = Schema.object({
  kind: lit(ENEMY_LOOT_KINDS).required(),
  id: Schema.string(),
  chance: Schema.number().min(0).max(1).required(),
  amount: Schema.natural(),
  slot: lit(ARMOR_SLOTS),
  setId: Schema.string(),
  quality: InherentQuality,
});

/** Enemy soft loadout — shared catalog ids; missing at runtime → skip. */
export const EnemySkillLoadoutSchema = Schema.object({
  id: req.str(),
  weight: Schema.number().min(0),
  minRange: Schema.number().min(0),
  maxRange: Schema.number().min(0),
  cooldown: Schema.natural(),
});
export const EnemyGearLoadoutSchema = Schema.object({
  slot: Schema.string(),
  id: Schema.string(),
  setId: Schema.string(),
});
export const EnemyPillLoadoutSchema = Schema.object({
  id: req.str(),
  when: lit(['spawn', 'hpBelow', 'elite'] as const),
  hpFrac: Schema.number().min(0).max(1),
  once: Schema.boolean(),
});
export const EnemyTalismanLoadoutSchema = Schema.object({
  id: req.str(),
  weight: Schema.number().min(0),
  minRange: Schema.number().min(0),
  maxRange: Schema.number().min(0),
  cooldown: Schema.natural(),
});

/**
 * ColliderProfile — physical Body w/h (+ optional hurtInset / gravityScale).
 * Illegal defs are rejected at register (warn, never enter game).
 * Interpreter only sets Body size; does not change AI or draw.
 */
export const ColliderSchema = Schema.object({
  id: req.str(),
  /** Body width px; must be ≥1. */
  w: Schema.number().min(1).required(),
  /** Body height px; must be ≥1. */
  h: Schema.number().min(1).required(),
  /** Hurt-box inset ≥0 (stored in P0; may not be consumed yet). */
  hurtInset: Schema.number().min(0),
  /** Gravity scale >0 (written once at assemble; Enemy.update may overwrite). */
  gravityScale: Schema.number().min(0.0001),
  label: Schema.string(),
});

/** Inline collider on EnemyDef (no id). Same numeric rules as ColliderSchema. */
export const InlineColliderSchema = Schema.object({
  w: Schema.number().min(1).required(),
  h: Schema.number().min(1).required(),
  hurtInset: Schema.number().min(0),
  gravityScale: Schema.number().min(0.0001),
});

export const EnemySchema = Schema.object({
  id: req.str(), name: req.str(),
  /**
   * C-tier P3: optional soft alias → built-in axe/shield/archer/spear/gargoyle kits
   * (collider / behavior / draw). Prefer silhouetteId + behaviorId + collider.
   */
  body: lit(ENEMY_BODIES),
  hp: Schema.natural().required(),
  dropChance: Schema.number().min(0).max(1),
  eliteEligible: Schema.boolean(),
  /** Soft material-id lean (optional; designated drops use loot[]). */
  dropBias: Schema.array(Schema.string()),
  /**
   * Closed loot table. Each entry is an independent chance roll on kill
   * (additional to global loot). Cross-plugin ids are soft: missing at roll → skip.
   */
  loot: Schema.array(EnemyLootEntrySchema),
  cooldown: Schema.natural(),
  parriedDur: Schema.natural(),
  isBoss: Schema.boolean(),
  /** Soft loadout — shared skills/armor/weapons/pills/talismans catalog ids. */
  skills: Schema.array(EnemySkillLoadoutSchema),
  gear: Schema.array(EnemyGearLoadoutSchema),
  pills: Schema.array(EnemyPillLoadoutSchema),
  talismans: Schema.array(EnemyTalismanLoadoutSchema),
  /** 长相：silhouette catalog id（无 body 时必填，见 validateEnemyAssembly）。 */
  silhouetteId: Schema.string(),
  /** 怎么打：behavior catalog id（无 body 时必填，见 validateEnemyAssembly）。 */
  behaviorId: Schema.string(),
  /**
   * 碰撞：soft collider catalog id. Missing → soft-skip when body present.
   * If both colliderId and inline collider are set, **inline wins** (soft compat).
   */
  colliderId: Schema.string(),
  /**
   * 碰撞：inline collider {w,h,...} without id; takes priority over colliderId.
   * Must union undefined: Cordis Schema.object nests coerce missing → {} and then
   * reject required w/h (same pitfall as WeaponDef.sprite — see comment there).
   */
  collider: Schema.union([InlineColliderSchema, Schema.const(undefined)]),
  /**
   * Boss 怎么凶：bossKits catalog id（软引用；缺失 → walk 权重）.
   * G3：enterBoss 解析 stage.boss.kit → kitId → actPool.kit → 'stone'.
   */
  kitId: Schema.string(),
});

/**
 * C-tier P3 pack rule: without `body`, require assembly keys
 * 碰撞 (colliderId | inline) + 长相 (silhouetteId) + 怎么打 (behaviorId).
 * With `body`, soft-alias path — no extra keys required (compat window).
 */
export function validateEnemyAssembly(def: {
  body?: string;
  silhouetteId?: string;
  behaviorId?: string;
  colliderId?: string;
  collider?: { w?: number; h?: number } | null;
}): void {
  if (def.body) return;
  const c = def.collider;
  const hasInline = !!(c
    && typeof c.w === 'number' && Number.isFinite(c.w) && c.w >= 1
    && typeof c.h === 'number' && Number.isFinite(c.h) && c.h >= 1);
  const hasColId = typeof def.colliderId === 'string' && def.colliderId.length > 0;
  if (!hasInline && !hasColId) {
    throw new TypeError('无 body 时须提供碰撞：colliderId 或内联 collider（w/h≥1）');
  }
  if (!(typeof def.silhouetteId === 'string' && def.silhouetteId.length > 0)) {
    throw new TypeError('无 body 时须提供 silhouetteId（长相）；可引用 CORE 剪影 id 作合理默认');
  }
  if (!(typeof def.behaviorId === 'string' && def.behaviorId.length > 0)) {
    throw new TypeError('无 body 时须提供 behaviorId（怎么打）；可引用 CORE 行为 id 作合理默认');
  }
}

export const AffixSchema = Schema.object({
  id: req.str(), name: req.str(), fogName: req.str(), desc: req.str(), color: req.str(),
  // Closed tick / combat effect vocabulary (core reads fields only).
  dotPeriod: Schema.natural(), dotDamage: Schema.number(), dotFloatEvery: Schema.natural(),
  stillDotPeriod: Schema.natural(), stillDotDamage: Schema.number(),
  secondaryStillDotPeriod: Schema.natural(), secondaryStillDotDamage: Schema.number(),
  bellCycle: Schema.natural(), bellWindow: Schema.natural(),
  bellBannerTitle: Schema.string(), bellBannerSub: Schema.string(),
  bellBannerDur: Schema.natural(), bellRingSize: Schema.number(),
  evolveTo: Schema.string(), evolveAfter: Schema.natural(),
  evolveBannerTitle: Schema.string(), evolveBannerSub: Schema.string(),
  playerWideHitMul: Schema.number(), playerWideHitMinW: Schema.number(),
  playerWideHitNames: Schema.array(Schema.string()),
  enemyIncomingKbMul: Schema.number(), playerOutgoingKbMul: Schema.number(),
  dashCdMul: Schema.number(), dashIframeBonus: Schema.number(),
  jumpBoost: Schema.number(), dashKickBonus: Schema.number(),
  dashLenMul: Schema.number(), dashSlideVx: Schema.number(), dashSpeed: Schema.number(),
  // Pick pools — 门派挂权重；框架 pickers 只读 catalog
  primaryWeight: Schema.number().min(0),
  secondaryWeight: Schema.number().min(0),
  evolveOnly: Schema.boolean(),
});

const WeaponCounterEntry = Schema.object({
  category: lit(CATEGORIES).required(),
  label: req.str(),
  dmgMul: req.num(),
  poiseMul: req.num(),
  cancelShanbu: Schema.boolean(),
  ignoreReflect: Schema.boolean(),
  pierceTongpi: Schema.boolean(),
});

export const EliteModSchema = Schema.object({
  id: req.str(), name: req.str(), color: req.str(), tag: req.str(),
  dmgTakenMul: Schema.number(), reflect: Schema.number(), lifesteal: Schema.number(),
  heavyMul: Schema.number(), startupMul: Schema.number(),
  dashAway: Schema.boolean(), fireOnDeath: Schema.boolean(),
  summonMinion: Schema.boolean(), summonEnemyId: Schema.string(), summonFire: Schema.boolean(),
  /** 兵器克制：门派在词条上挂 category 克制数据；战斗读表。 */
  weaponCounters: Schema.array(WeaponCounterEntry),
});

export const TitleSchema = Schema.object({
  id: req.str(), name: req.str(), desc: req.str(), qol: req.str(),
  startPotions: Schema.natural(),
  parryWindowBonus: Schema.number(),
  shopDiscount: Schema.number(),
});

const FRAGMENT_TAGS = ['qi', 'body', 'speed', 'sustain', 'curse'] as const;
const BossMoveWeight = Schema.object({
  move: req.str(),
  weight: req.num(),
});

/**
 * Boss AI kit move weights (close / far). Roar weight is the "ready" value; runtime zeros when on CD.
 * move ids stay open strings here; BossKitService.add soft-filters against ctx.bossMoves (warn + drop).
 */
export const BossKitSchema = Schema.object({
  id: req.str(),
  close: Schema.array(BossMoveWeight).required(),
  far: Schema.array(BossMoveWeight).required(),
});

/** 局内残页 — closed effect fields; eventOnly skips normal drop/roll pools. */
export const FragmentSchema = Schema.object({
  id: req.str(), name: req.str(), fogName: req.str(), desc: req.str(), color: req.str(),
  tag: lit(FRAGMENT_TAGS).required(),
  curse: Schema.string(),
  eventOnly: Schema.boolean(),
  skillDmgMul: Schema.number(),
  neiliRegenMul: Schema.number(),
  armorPierceBonus: Schema.number(),
  dashCdMul: Schema.number(),
  pillHealMul: Schema.number(),
  pillRageBonus: Schema.number(),
  dmgTakenMul: Schema.number(),
  atkMul: Schema.number(),
});

const GearBonusSchema = Schema.object({
  hp: Schema.number(), atk: Schema.number(), def: Schema.number(),
  rage: Schema.number(), wugong: Schema.number(),
});

/** 单件防具底表（与套装 armorSets 分开）. */
export const ArmorPieceSchema = Schema.object({
  id: req.str(), name: req.str(),
  slot: lit(ARMOR_SLOTS).required(),
  lore: req.str(),
  base: GearBonusSchema.required(),
  weight: Schema.number().min(0).required(),
  common: Schema.boolean(),
  quality: InherentQuality,
  tier: EquipTier,
  fogName: Schema.string(),
});


/* ── B-tier catalogs (plugins fill; core interprets) ─────── */

const PoseNums = Schema.object({
  y: Schema.number(), lean: Schema.number(), head: Schema.number(), rot: Schema.number(),
  ft: Schema.number(), fk: Schema.number(), bt: Schema.number(), bk: Schema.number(),
  fa: Schema.number(), fe: Schema.number(), ba: Schema.number(), be: Schema.number(),
  w: Schema.number(),
});

const HitBox = Schema.object({
  x: req.num(), y: req.num(), w: req.num(), h: req.num(),
});

export const AttackBoxSchema = Schema.object({
  id: req.str(), name: req.str(),
  startup: Schema.natural().required(), active: Schema.natural().required(), recovery: Schema.natural().required(),
  box: HitBox.required(),
  damage: req.num(), kbX: req.num(), kbY: req.num(),
  hitstun: Schema.number(), hitstop: Schema.number(), shake: Schema.number(),
  launch: Schema.boolean(), knockdown: Schema.boolean(), spike: Schema.boolean(),
  otg: Schema.boolean(), low: Schema.boolean(), parryable: Schema.boolean(),
  unblockable: Schema.boolean(), guardBreak: Schema.boolean(), heavy: Schema.boolean(),
  air: Schema.boolean(), moveX: Schema.number(), moveFrames: Schema.number(),
  rage: Schema.number(),
  swing: lit(['slash', 'heavy', 'claw', 'bash', 'kick', 'whip', 'none'] as const),
  ultimate: Schema.boolean(), pierce: Schema.boolean(), poiseScale: Schema.number(),
  stunTier: Schema.union([Schema.const(1), Schema.const(2), Schema.const(3)]),
  armorMul: Schema.number(), throw: Schema.boolean(), hyperArmor: Schema.boolean(),
  combatCue: lit(['plunge', 'rising', 'launcher'] as const),
  swordQi: Schema.boolean(),
});

/** 普攻链 Style（闭集；禁止任意 JS）。attackKeys 软引用 ctx.attacks id。 */
const CombatStyleBranchesSchema = Schema.object({
  dash: req.str(),
  groundUp: req.str(),
  groundDown: req.str(),
  airDown: req.str(),
  airUp: req.str(),
  /** Alternating air neutrals — must be length 2 (service extra-check). */
  airNeutral: Schema.array(Schema.string()).required(),
  finisherPoise: Schema.string(),
  finisherDrain: Schema.string(),
  throw: req.str(),
});

export const CombatStyleSchema = Schema.object({
  id: req.str(),
  groundKeys: Schema.array(Schema.string()).required(),
  branches: CombatStyleBranchesSchema.required(),
  noChainOpen: Schema.array(Schema.string()).required(),
  plungeWaveKey: Schema.string(),
});

export const PoseSchema = Schema.object({
  id: req.str(),
  wind: PoseNums.required(),
  strike: PoseNums.required(),
  rec: PoseNums.required(),
});

export const ProjectileSchema = Schema.object({
  id: req.str(),
  drawKind: lit(['arrow', 'fireball'] as const).required(),
  hitW: req.num(), hitH: req.num(),
  life: Schema.natural(),
  /** Soft AttackBox id (default 'arrow' at rangedAttack). ArrowProj1. */
  attackKey: Schema.string(),
  explodeOnGround: Schema.boolean(),
  trailEvery: Schema.natural(),
  hitSfx: Schema.string(),
  explodeSfx: Schema.string(),
});

export const FxRecipeSchema = Schema.object({
  id: req.str(),
  emitter: lit(FX_PRESETS).required(),
  color: Schema.string(),
  size: Schema.number(),
  life: Schema.number(),
  n: Schema.natural(),
  heavy: Schema.boolean(),
});

/** Bundled / pack sheet — relative ./art/ path only (no remote URL). */
export const SheetSchema = Schema.object({
  id: req.str(),
  src: req.str(),
  frameW: Schema.natural(),
  frameH: Schema.natural(),
  frames: Schema.natural(),
  maxBytes: Schema.natural(),
});

export const SfxSchema = Schema.object({
  id: req.str(),
  synth: Schema.string(),
  src: Schema.string(),
  format: lit(['wav', 'ogg', 'mp3'] as const),
});

export const VolleySchema = Schema.object({
  id: req.str(),
  style: lit(VOLLEY_STYLES).required(),
  defaultCount: Schema.natural(),
  defaultInterval: Schema.natural(),
  defaultSpread: Schema.number(),
  defaultRadius: Schema.number(),
  color: Schema.string(),
});


/* ── weapon looks (appearance building blocks) ───────────── */

const GUARD_STYLES = ['cross', 'disk', 'wing', 'none'] as const;
const TIP_STYLES = ['point', 'chisel', 'hook', 'blunt', 'fork', 'leaf', 'barbed', 'crescent'] as const;
const HEAD_STYLES = ['axe', 'spear', 'hammer', 'halberd', 'crescent'] as const;
const TASSEL_STYLES = ['short', 'long', 'knot'] as const;
const CHAIN_STYLES = ['links', 'line'] as const;

export const WEAPON_LOOK_PART_KIND_LIST = WEAPON_LOOK_PART_KINDS;

/** Flat part — kind whitelist; unknown rejected by lit / validateWeaponLookParts. */
const WeaponLookPartSchema = Schema.object({
  kind: lit(WEAPON_LOOK_PART_KINDS).required(),
  // grip / haft
  length: Schema.number(),
  width: Schema.number(),
  color: Schema.string(),
  // guard / tsuba
  style: lit([
    ...GUARD_STYLES, ...TIP_STYLES, ...HEAD_STYLES, ...TASSEL_STYLES, ...CHAIN_STYLES,
  ] as const),
  radius: Schema.number(),
  // pommel
  size: Schema.number(),
  ring: Schema.boolean(),
  // blade
  profile: lit(BLADE_PROFILES),
  lengthFrac: Schema.number(),
  curveAmount: Schema.number(),
  taper: Schema.number(),
  fuller: Schema.number(),
  // tip / head already use style/size/color
  // chain / tassel sway
  links: Schema.natural(),
  swayAmp: Schema.number(),
  // grip wrap
  wrapStyle: lit(['cord', 'leather', 'silk', 'none'] as const),
  // twinOffset
  dx: Schema.number(),
  dy: Schema.number(),
  scale: Schema.number(),
  mirror: Schema.boolean(),
  // palette
  blade: Schema.string(),
  trail: Schema.string(),
  edge: Schema.string(),
  grip: Schema.string(),
  metal: Schema.string(),
  // glow / ink / trails
  alpha: Schema.number(),
  // rune
  text: Schema.string(),
  along: Schema.number(),
  // ring.at
  at: lit(['pommel', 'guard'] as const),
  // spriteOverlay
  sheetId: Schema.string(),
  frame: Schema.natural(),
  pivot: Schema.object({ x: Schema.number(), y: Schema.number() }),
});

export const WeaponLookSchema = Schema.object({
  id: req.str(),
  label: Schema.string(),
  baseShape: lit(SHAPES),
  parts: Schema.array(Schema.any()).required(),
});

export function validateWeaponLookParts(parts: unknown[], where: string): void {
  if (!Array.isArray(parts)) throw new TypeError(`${where} 须为数组`);
  parts.forEach((part, i) => {
    const kind = (part as { kind?: string } | null)?.kind;
    if (!kind || !(WEAPON_LOOK_PART_KINDS as readonly string[]).includes(kind)) {
      throw new TypeError(`${where}[${i}] 未知 kind「${kind}」（白名单: ${WEAPON_LOOK_PART_KINDS.join('|')}）`);
    }
    try {
      WeaponLookPartSchema(part as never);
    } catch (e) {
      throw new TypeError(`${where}[${i}] (${kind}) ${(e as Error).message}`);
    }
    if (kind === 'spriteOverlay') {
      const sid = (part as { sheetId?: string }).sheetId;
      if (!sid) throw new TypeError(`${where}[${i}] spriteOverlay.sheetId 必填`);
      if (/^https?:\/\//i.test(sid) || sid.includes('://')) {
        throw new TypeError(`${where}[${i}] spriteOverlay.sheetId 禁止外链 URL`);
      }
    }
  });
}

const SILHOUETTE_PART_KINDS = [
  'headgear', 'torso', 'offhand', 'mainhand', 'palette', 'scale',
  'cloak', 'armorLayer', 'ornament', 'faceMark', 'stanceBias',
] as const;
/** Flat part object — kind whitelist; unknown kind rejected by lit(). */
const SilhouettePartSchema = Schema.object({
  kind: lit(SILHOUETTE_PART_KINDS).required(),
  // mainhand
  fromWeapon: Schema.boolean(),
  weaponId: Schema.string(),
  shape: lit(SHAPES),
  length: Schema.number(),
  blade: Schema.string(),
  trail: Schema.string(),
  edge: Schema.string(),
  // headgear / torso / offhand / cloak / armor / ornament / faceMark styles
  style: lit([
    'bandit', 'hat', 'topknot', 'hood', 'none',
    'robe', 'light', 'heavy',
    'blade', 'shield',
    'short', 'long', 'ragged',
    'plate', 'cloth',
    'pendant', 'sashKnot', 'banner', 'bell', 'feather',
    'scar', 'mask', 'veil',
  ] as const),
  // cloak / armorLayer / ornament
  slot: lit(['chest', 'shoulder', 'skirt', 'waist', 'back', 'neck', 'ear'] as const),
  sway: Schema.number(),
  color: Schema.string(),
  // stanceBias
  lean: Schema.number(),
  crouch: Schema.number(),
  // palette
  cloak: Schema.string(),
  coat: Schema.string(),
  arm: Schema.string(),
  armB: Schema.string(),
  leg: Schema.string(),
  legB: Schema.string(),
  boot: Schema.string(),
  skin: Schema.string(),
  sash: Schema.string(),
  collar: Schema.string(),
  eye: Schema.string(),
  // scale
  value: Schema.number(),
});

export const SilhouetteSchema = Schema.object({
  id: req.str(),
  body: lit(ENEMY_BODIES).required(),
  baseRig: lit(ENEMY_BODIES),
  label: Schema.string(),
  parts: Schema.array(SilhouettePartSchema),
});

/** Whitelist BehaviorStep kinds — unknown rejected at register (no custom AI code). */
export const BEHAVIOR_STEP_KIND_LIST = [
  'keepDistance', 'meleeAttack', 'rangedAttack', 'block', 'charge',
  'useLoadout', 'idlePace', 'facePlayer',
  'dodge', 'circleStrafe', 'flank', 'callAlly',
  'phaseAtHp', 'phaseGate', 'comboChain', 'retreatBurst',
  'taunt', 'idleEmote',
] as const;

export const BEHAVIOR_STEP_SCHEMAS: Record<(typeof BEHAVIOR_STEP_KIND_LIST)[number], Schema> = {
  keepDistance: Schema.object({
    kind: Schema.const('keepDistance').required(),
    idealMin: req.num(),
    idealMax: req.num(),
    chase: req.num(),
    retreatSpeed: Schema.number(),
  }),
  meleeAttack: Schema.object({
    kind: Schema.const('meleeAttack').required(),
    attackKey: Schema.string(),
    rangeMax: req.num(),
    rangeMin: Schema.number(),
    weight: Schema.number(),
    cooldown: Schema.natural(),
  }),
  rangedAttack: Schema.object({
    kind: Schema.const('rangedAttack').required(),
    projectileId: Schema.string(),
    rangeMin: req.num(),
    rangeMax: req.num(),
    cooldown: Schema.natural(),
    weight: Schema.number(),
    aimFrames: Schema.natural(),
  }),
  block: Schema.object({
    kind: Schema.const('block').required(),
    holdFrames: Schema.natural(),
    weight: Schema.number(),
    cooldown: Schema.natural(),
  }),
  charge: Schema.object({
    kind: Schema.const('charge').required(),
    speed: Schema.number(),
    frames: Schema.natural(),
    rangeMin: Schema.number(),
    rangeMax: Schema.number(),
    weight: Schema.number(),
    cooldown: Schema.natural(),
  }),
  useLoadout: Schema.object({
    kind: Schema.const('useLoadout').required(),
    prefer: lit(['skill', 'talisman', 'any'] as const),
    weight: Schema.number(),
  }),
  idlePace: Schema.object({
    kind: Schema.const('idlePace').required(),
    speed: Schema.number(),
  }),
  facePlayer: Schema.object({
    kind: Schema.const('facePlayer').required(),
  }),
  dodge: Schema.object({
    kind: Schema.const('dodge').required(),
    range: Schema.number(), cooldown: Schema.natural(), weight: Schema.number(),
    direction: lit(['away', 'side'] as const),
  }),
  circleStrafe: Schema.object({
    kind: Schema.const('circleStrafe').required(),
    radius: Schema.number(), speed: Schema.number(), weight: Schema.number(),
  }),
  flank: Schema.object({
    kind: Schema.const('flank').required(),
    weight: Schema.number(), preferBehind: Schema.boolean(),
  }),
  callAlly: Schema.object({
    kind: Schema.const('callAlly').required(),
    enemyId: Schema.string(), max: Schema.natural(), cooldown: Schema.natural(), weight: Schema.number(),
  }),
  phaseAtHp: Schema.object({
    kind: Schema.const('phaseAtHp').required(),
    below: Schema.number().min(0).max(1).required(),
    setPhase: req.str(),
  }),
  phaseGate: Schema.object({
    kind: Schema.const('phaseGate').required(),
    phase: req.str(),
    steps: Schema.array(Schema.any()),
  }),
  comboChain: Schema.object({
    kind: Schema.const('comboChain').required(),
    attackKeys: Schema.array(Schema.string()).required(),
    gapFrames: Schema.natural(), weight: Schema.number(),
    rangeMin: Schema.number(), rangeMax: Schema.number(),
  }),
  retreatBurst: Schema.object({
    kind: Schema.const('retreatBurst').required(),
    dist: Schema.number(), frames: Schema.natural(), weight: Schema.number(),
  }),
  taunt: Schema.object({
    kind: Schema.const('taunt').required(),
    weight: Schema.number(), cooldown: Schema.natural(), text: Schema.string(),
  }),
  idleEmote: Schema.object({
    kind: Schema.const('idleEmote').required(),
    weight: Schema.number(), cooldown: Schema.natural(), text: Schema.string(),
  }),
};

/** Validate BehaviorDef.steps; throws with failing index. */
export function validateBehaviorSteps(steps: unknown, where: string): void {
  if (!Array.isArray(steps)) throw new TypeError(`${where} 必须是步骤数组`);
  steps.forEach((step, i) => {
    const kind = (step as { kind?: unknown } | null)?.kind;
    const schema = typeof kind === 'string'
      ? BEHAVIOR_STEP_SCHEMAS[kind as (typeof BEHAVIOR_STEP_KIND_LIST)[number]]
      : undefined;
    if (!schema) throw new TypeError(`${where}[${i}] 未知行为步骤 kind=${String(kind)}`);
    try {
      schema(step);
    } catch (e) {
      throw new TypeError(`${where}[${i}] (${String(kind)}) ${(e as Error).message}`);
    }
    if (kind === 'phaseGate') {
      const nested = (step as { steps?: unknown }).steps;
      if (nested != null) validateBehaviorSteps(nested, `${where}[${i}].steps`);
    }
  });
}

export const BehaviorSchema = Schema.object({
  id: req.str(),
  body: lit(ENEMY_BODIES).required(),
  label: Schema.string(),
  steps: Schema.array(Schema.any()),
});

export const BackdropSchema = Schema.object({
  id: req.str(),
  theme: lit(BACKDROPS).required(),
  skyTint: Schema.string(),
  fogTint: Schema.string(),
  groundTint: Schema.string(),
  label: Schema.string(),
});

export const BossMoveSchema = Schema.object({
  id: req.str(),
  kind: lit([
    'claw', 'charge', 'fireball', 'dive', 'roar', 'walk',
    'slam', 'sweep', 'summonAdds', 'inkNova',
  ] as const).required(),
  label: Schema.string(),
  radius: Schema.number(),
  damage: Schema.number(),
  hitstop: Schema.number(),
  width: Schema.number(),
  enemyId: Schema.string(),
  /** summonAdds count; Dfr2 fireball phase1 shot count (absent = 3). */
  count: Schema.natural(),
  side: lit(['L', 'R', 'both'] as const),
  /** inkNova/walk/roar active/fireball rise/dive recover — see kind notes. */
  frames: Schema.natural(),
  color: Schema.string(),
  /** Gsm3 claw soft rhythm (absent = today). */
  startupMul: Schema.number(),
  recoveryMul: Schema.number(),
  damageMul: Schema.number(),
  /** Gsm4 charge/slam/sweep + Dfr1 roar wind-up; Dfr2 fireball phase1 cast gap; Dfr3 diveAim cutdown (absent = today literals). */
  windFrames: Schema.natural(),
  /** Dfr2 fireball soft projectile catalog id (absent/missing Def → fireball). */
  projectileId: Schema.string(),
  /** Dfr3 dive soft AttackDef id for body+wave (absent → gDive/gDiveWave; missing box soft-skip). */
  attackKey: Schema.string(),
});
