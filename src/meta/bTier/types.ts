/**
 * B-tier catalog definitions — content recipes plugins may register.
 * Core keeps interpreters (hitbox runner, bone solver, particle emitters,
 * sheet decode, mix bus, volley primitives, baseRig). No plugin JS/Canvas/URLs.
 */
import type { AttackDef } from '../../combat/types';
import type { Pose, AttackPoses } from '../../render/rig';
import type { EnemyBodyKit } from '../../entities/enemies/factory';
import type { FxPreset } from '../talismanScripts';

/** Hitbox timeline + damage params. id is the soft key (SkillDef.attackKey / feel). */
export type AttackBoxDef = AttackDef & { id: string };

/** Keyframe trio for an attack pose. Missing → fallback slash1. */
export interface PoseDef extends AttackPoses {
  id: string;
}

/** Projectile recipe. drawKind selects core drawer; collision/fx are data. */
export type ProjDrawKind = 'arrow' | 'fireball';
export interface ProjectileDef {
  id: string;
  drawKind: ProjDrawKind;
  hitW: number;
  hitH: number;
  life?: number;
  /** Soft AttackBox id for hit damage/kb. Soft default: fireball→'gFire', else 'arrow'. ArrowProj1/3. */
  attackKey?: string;
  /** Fireball-like: explode + trail. */
  explodeOnGround?: boolean;
  trailEvery?: number;
  /** Soft sfx catalog id on confirmed hit. Whitelist synth via resolveProjectileHitSfx; replaces hit/hitHeavy. */
  hitSfx?: string;
  explodeSfx?: string;
}

/** Parametric particle recipe composing core emitters. */
export type FxEmitter = FxPreset;
export interface FxRecipeDef {
  id: string;
  emitter: FxEmitter;
  color?: string;
  size?: number;
  life?: number;
  n?: number;
  heavy?: boolean;
}

/**
 * Pack-registered weapon sheet. `src` must be a relative path under ./art/
 * (no http/https). Size/format/byte limits enforced at register time.
 */
export interface SheetDef {
  id: string;
  /** Relative asset path, e.g. ./art/weapons/blade_ink.png */
  src: string;
  frameW?: number;
  frameH?: number;
  frames?: number;
  /** Soft byte budget hint (validated when Image metadata available). */
  maxBytes?: number;
}

/**
 * Sound id. Built-in synth keys use `synth` (= core playSfx interpreter).
 * Pack files use relative src under ./art/audio/ with format whitelist.
 */
export type SfxFormat = 'wav' | 'ogg' | 'mp3';
export interface SfxDef {
  id: string;
  /** Core synth recipe name (same as historical Sfx union). */
  synth?: string;
  /** Relative path under ./art/ (no remote URL). */
  src?: string;
  format?: SfxFormat;
}

/** Volley template — style picks core spawnVolley primitive. */
export type VolleyStyle = 'skySword' | 'thunder' | 'waterPulse';
export interface VolleyDef {
  id: string;
  style: VolleyStyle;
  defaultCount?: number;
  defaultInterval?: number;
  defaultSpread?: number;
  defaultRadius?: number;
  color?: string;
}

/**
 * Collider profile (C-tier P0). Data-only body box baseline.
 * Interpreter applies w/h (and optional gravityScale once at assemble).
 * hurtInset is validated/stored; P0 runtime may not consume hurt boxes yet.
 * No arbitrary JS — plugins only register numbers.
 */
export interface ColliderProfile {
  id: string;
  /** Body width in px; must be > 0. */
  w: number;
  /** Body height in px; must be > 0. */
  h: number;
  /** Optional hurt-box inset (≥0). Stored in P0; not required to affect combat yet. */
  hurtInset?: number;
  /**
   * Optional gravity scale (>0). Written once onto body at assemble.
   * Note: Enemy.update often overwrites gravityScale per state — easy to clobber.
   */
  gravityScale?: number;
  label?: string;
}

/**
 * Whitelist silhouette part kinds. Unknown kind → reject at register or soft-skip + warn at draw.
 * Plugins compose these; core interprets. No arbitrary JS/Canvas/URL PNG.
 */
export const SILHOUETTE_PART_KINDS = [
  'headgear', 'torso', 'offhand', 'mainhand', 'palette', 'scale',
  /* C-tier expand */
  'cloak', 'armorLayer', 'ornament', 'faceMark', 'stanceBias',
] as const;
export type SilhouettePartKind = (typeof SILHOUETTE_PART_KINDS)[number];

export type SilhouetteHeadgearStyle = 'bandit' | 'hat' | 'topknot' | 'hood' | 'none';
export type SilhouetteTorsoStyle = 'robe' | 'light' | 'heavy';
export type SilhouetteOffhandStyle = 'blade' | 'shield' | 'none';

/** Blade shapes mirrored from WeaponDef (framework ruler). */
export type SilhouetteBladeShape = 'sword' | 'dagger' | 'axe' | 'spear' | 'twin' | 'greatsword';

/**
 * One composable silhouette part. `mainhand` may pull from gear WeaponDef,
 * a soft weaponId, or inline shape/length/三色.
 */
export type SilhouettePart =
  | {
      kind: 'mainhand';
      /** Prefer enemy loadout gear WeaponDef when present. */
      fromWeapon?: boolean;
      /** Soft weapons-catalog id. */
      weaponId?: string;
      shape?: SilhouetteBladeShape;
      length?: number;
      blade?: string;
      trail?: string;
      edge?: string;
    }
  | { kind: 'headgear'; style?: SilhouetteHeadgearStyle }
  | { kind: 'torso'; style?: SilhouetteTorsoStyle }
  | { kind: 'offhand'; style?: SilhouetteOffhandStyle }
  | {
      kind: 'palette';
      cloak?: string;
      coat?: string;
      arm?: string;
      armB?: string;
      leg?: string;
      legB?: string;
      boot?: string;
      skin?: string;
      sash?: string;
      collar?: string;
      eye?: string;
    }
  | { kind: 'scale'; value: number }
  | {
      kind: 'cloak';
      style?: 'short' | 'long' | 'ragged' | 'none';
      /** Program sway amplitude (not physics). */
      sway?: number;
      color?: string;
    }
  | {
      kind: 'armorLayer';
      slot?: 'chest' | 'shoulder' | 'skirt';
      style?: 'light' | 'plate' | 'cloth';
      color?: string;
    }
  | {
      kind: 'ornament';
      slot?: 'waist' | 'back' | 'neck' | 'ear';
      style?: 'pendant' | 'sashKnot' | 'banner' | 'bell' | 'feather' | 'none';
      color?: string;
    }
  | {
      kind: 'faceMark';
      style?: 'none' | 'scar' | 'mask' | 'veil';
      color?: string;
    }
  | {
      kind: 'stanceBias';
      /** Visual lean -1..1 (toward facing). */
      lean?: number;
      /** Visual crouch 0..1. */
      crouch?: number;
    };

/**
 * Silhouette kit (P1+). `body` still drives AI/collision remapping;
 * optional `baseRig` + `parts` drive appearance via core interpreter.
 * No parts → legacy kind-hardcoded look (compat).
 */
export interface SilhouetteDef {
  id: string;
  /** Core body kit this silhouette clones (AI / collision). */
  body: EnemyBodyKit;
  /**
   * Visual base rig for default palette / headgear / offhand.
   * Defaults to `body`. Gait still follows the instantiated body class.
   */
  baseRig?: EnemyBodyKit;
  label?: string;
  /** Composable whitelist parts. Absent → legacy kind-hardcoded weapons/gear look. */
  parts?: SilhouettePart[];
}

/**
 * Whitelist behavior step kinds. Unknown kind → reject at register or soft-skip + warn at tick.
 * Plugins compose recipes; core interpreter runs them. No arbitrary JS.
 * New kinds remain C-tier rare expand.
 */
export const BEHAVIOR_STEP_KINDS = [
  'keepDistance', 'meleeAttack', 'rangedAttack', 'block', 'charge',
  'useLoadout', 'idlePace', 'facePlayer',
  /* C-tier expand */
  'dodge', 'circleStrafe', 'flank', 'callAlly',
  'phaseAtHp', 'phaseGate', 'comboChain', 'retreatBurst',
  'taunt', 'idleEmote',
] as const;
export type BehaviorStepKind = (typeof BEHAVIOR_STEP_KINDS)[number];

export type BehaviorStep =
  | {
      kind: 'keepDistance';
      idealMin: number;
      idealMax: number;
      chase: number;
      /** Retreat speed multiplier (default ~2.4). */
      retreatSpeed?: number;
    }
  | {
      kind: 'meleeAttack';
      /** Soft AttackBoxDef id in ctx.attacks (thrust/lunge/axeChop/bash/whip/…); miss → soft-skip. */
      attackKey?: string;
      rangeMax: number;
      rangeMin?: number;
      weight?: number;
      /** Cooldown frames after this step fires (default ~50). */
      cooldown?: number;
    }
  | {
      kind: 'rangedAttack';
      /** Soft ProjectileDef id (default arrow). */
      projectileId?: string;
      rangeMin: number;
      rangeMax: number;
      cooldown?: number;
      weight?: number;
      /** Aim wind-up frames (default 38). */
      aimFrames?: number;
    }
  | {
      kind: 'block';
      /** Hold frames (default 40). Only effective on shield body; else soft-skip. */
      holdFrames?: number;
      weight?: number;
      cooldown?: number;
    }
  | {
      kind: 'charge';
      /** Dash speed (default 6). */
      speed?: number;
      /** Dash duration frames (default 18). */
      frames?: number;
      rangeMin?: number;
      rangeMax?: number;
      weight?: number;
      cooldown?: number;
    }
  | {
      kind: 'useLoadout';
      prefer?: 'skill' | 'talisman' | 'any';
      weight?: number;
    }
  | {
      kind: 'idlePace';
      /** Walk speed while pacing (default 0.9). */
      speed?: number;
    }
  | { kind: 'facePlayer' }
  | {
      kind: 'dodge';
      range?: number;
      cooldown?: number;
      weight?: number;
      direction?: 'away' | 'side';
    }
  | {
      kind: 'circleStrafe';
      radius?: number;
      speed?: number;
      weight?: number;
    }
  | {
      kind: 'flank';
      weight?: number;
      preferBehind?: boolean;
    }
  | {
      kind: 'callAlly';
      /** Soft enemy catalog id; missing → soft-skip. */
      enemyId?: string;
      max?: number;
      cooldown?: number;
      weight?: number;
    }
  | {
      kind: 'phaseAtHp';
      /** HP ratio 0–1. */
      below: number;
      setPhase: string;
    }
  | {
      kind: 'phaseGate';
      phase: string;
      /** Optional nested steps (same whitelist); absent → condition tag only. */
      steps?: BehaviorStep[];
    }
  | {
      kind: 'comboChain';
      attackKeys: string[];
      gapFrames?: number;
      weight?: number;
      rangeMin?: number;
      rangeMax?: number;
    }
  | {
      kind: 'retreatBurst';
      dist?: number;
      frames?: number;
      weight?: number;
    }
  | {
      kind: 'taunt';
      weight?: number;
      cooldown?: number;
      text?: string;
    }
  | {
      kind: 'idleEmote';
      weight?: number;
      cooldown?: number;
      text?: string;
    };

/**
 * Behavior kit. `body` selects pose / collider baseline (soft compat).
 * `steps` → data-driven AI via core interpreter; CORE trash kits always ship steps (P1).
 * New BehaviorStep kinds remain C-tier rare expand.
 */
export interface BehaviorDef {
  id: string;
  body: EnemyBodyKit;
  label?: string;
  /** Whitelist BehaviorStep recipe. Empty/absent → idle fallback think on Enemy. */
  steps?: BehaviorStep[];
}

/** Act atmosphere — palette hints; theme selects core backdrop generator. */
export type BackdropThemeId = 'night' | 'dock' | 'ash' | 'eclipse';
export interface BackdropDef {
  id: string;
  /** Core procedural generator key. */
  theme: BackdropThemeId;
  /** Optional ink-wash tint overlays (暗夜纸墨). */
  skyTint?: string;
  fogTint?: string;
  groundTint?: string;
  label?: string;
}

/**
 * Boss move catalog entry. `kind` selects a hard-coded high-risk primitive
 * in the boss runner (dive / roar / claw / …). Weights reference move ids.
 */
export type BossMoveKind =
  | 'claw' | 'charge' | 'fireball' | 'dive' | 'roar' | 'walk'
  /* C-tier expand */
  | 'slam' | 'sweep' | 'summonAdds' | 'inkNova'
  /* deferred if skeleton cannot support: perch | takeoff */
  ;

export interface BossMoveDef {
  id: string;
  kind: BossMoveKind;
  label?: string;
  /** slam / inkNova / Dfr1 roar ring max / Dfr3 dive landing wave half-width */
  radius?: number;
  /** slam / sweep / inkNova damage bridge */
  damage?: number;
  hitstop?: number;
  /** sweep width */
  width?: number;
  /** summonAdds soft enemy id */
  enemyId?: string;
  /**
   * summonAdds soft count;
   * Dfr2 fireball: phase1 shot count (default 3 when absent; phase2 = min(8, base+2)).
   * Clamp 1…8 at apply time for fireball.
   */
  count?: number;
  side?: 'L' | 'R' | 'both';
  /**
   * inkNova telegraph / life frames;
   * Gsm3 walk: soft walk cooldown (default 50 when absent);
   * Dfr1 roar: soft active duration (default 44 when absent);
   * Dfr2 fireball: fbRise frames (default 34 when absent);
   * Dfr3 dive: recover frames (default 60 when absent; still ÷ spd).
   */
  frames?: number;
  color?: string;
  /**
   * Gsm3 claw soft: multiply AttackDef.startup on claw1/2/3 (absent/1 = today).
   * Clamped ~0.25…4 at apply time.
   */
  startupMul?: number;
  /**
   * Gsm3 claw soft: multiply AttackDef.recovery (segment gap feel; absent/1 = today).
   * Clamped ~0.25…4 at apply time.
   */
  recoveryMul?: number;
  /**
   * Gsm3 claw soft: multiply AttackDef.damage on claw segments (absent/1 = today).
   * Clamped ~0.1…5 at apply time. Absolute `damage` still slam/sweep/inkNova only.
   */
  damageMul?: number;
  /**
   * Gsm4 charge/slam/sweep + Dfr1 roar soft: wind-up frames before active
   * (absent → today: charge 38, slam 28, sweep 22, roar 40);
   * Dfr2 fireball: phase1 cast gap between shots (absent → 20; phase2 gap still shell 14);
   * Dfr3 dive: diveAim cutdown before diveDown (absent → 68; still ÷ spd).
   * Clamped ~1…180 at apply time. Charge/diveAim still ÷ spd.
   */
  windFrames?: number;
  /**
   * Dfr2 fireball soft: projectile catalog id (absent / missing Def → 'fireball').
   * drawKind stays closed arrow|fireball — do not expand.
   */
  projectileId?: string;
  /**
   * Dfr3 dive soft: AttackDef catalog id for body + landing wave
   * (absent → body 'gDive' / wave 'gDiveWave'; missing box soft-skip).
   * When set, the same id softs both body and wave. Prefer catalog boxes over absolute damage.
   */
  attackKey?: string;
}

export type { Pose, AttackPoses, EnemyBodyKit, FxPreset };
