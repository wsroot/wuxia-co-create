import { Fighter } from '../fighter';
import type { Game } from '../../game';
import { GROUND_Y } from '../../engine/constants';
import { clamp, lerp, rand } from '../../engine/math';
import type { AttackDef } from '../../combat/types';
import type { Rect } from '../../physics/body';
import type { HitResult } from '../enemies/enemy';
import { Projectile } from '../projectile';
import { playSfx } from '../../audio/sfx';
import { GP, GARG_ATTACKS } from '../../render/poses';
import { attackPose, cycle, lerpPose, type Pose } from '../../render/rig';
import { drawGargoyle } from '../../render/drawGargoyle';
import { drawGlow } from '../../effects/glow';
import { fast } from './bossMoves';
import { readWindowOf, readWindowLabel, readWindowColor } from '../../combat/readWindows';
import { bossMoveWeights } from '../../level/actPools';
import { getAttackBox, getBossMove, getEnemy, getPose, getProjectile, getSilhouette, resolveProjectileAttackKey } from '../../meta/contentRegistry';
import { makeEnemy } from '../enemies/factory';
import {
  loadoutIncomingMul, scaleLoadoutAttack,
  tickEnemyLoadoutTimers, tryCastBossLoadout,
  type EnemyLoadoutState,
} from '../enemies/loadout';
import {
  tickBossBehaviorGap,
  type BehaviorRuntime,
} from '../enemies/behaviorInterp';
import type { BehaviorStep, BossMoveDef, BossMoveKind } from '../../meta/bTier/types';

type Move = BossMoveKind;

/** G5: Boss hitboxes only via ctx.attacks (id = AttackDef.name); miss → soft-skip. */
function bossBox(id: string): AttackDef | undefined {
  return getAttackBox(id);
}

/**
 * Gsm3: soft-apply claw rhythm fields from BossMoveDef onto an AttackDef.
 * Missing / 1 / non-finite → identity (core `{ id:claw, kind:claw }` bit-identical).
 */
export function applyClawMoveSoft(d: AttackDef, mp: BossMoveDef | null | undefined): AttackDef {
  if (!mp) return d;
  let out = d;
  const sm = mp.startupMul;
  if (typeof sm === 'number' && Number.isFinite(sm) && sm > 0 && sm !== 1) {
    const k = clamp(sm, 0.25, 4);
    out = { ...out, startup: Math.max(1, Math.round(out.startup * k)) };
  }
  const rm = mp.recoveryMul;
  if (typeof rm === 'number' && Number.isFinite(rm) && rm > 0 && rm !== 1) {
    const k = clamp(rm, 0.25, 4);
    out = { ...out, recovery: Math.max(0, Math.round(out.recovery * k)) };
  }
  const dm = mp.damageMul;
  if (typeof dm === 'number' && Number.isFinite(dm) && dm > 0 && dm !== 1) {
    const k = clamp(dm, 0.1, 5);
    out = { ...out, damage: Math.max(1, Math.round(out.damage * k)) };
  }
  return out;
}

/** Gsm3: walk kind soft cooldown from BossMoveDef.frames; absent → 50 (today). */
export function walkCooldownFromMove(mp: BossMoveDef | null | undefined): number {
  const f = mp?.frames;
  if (typeof f === 'number' && Number.isFinite(f) && f > 0) return Math.max(1, Math.round(f));
  return 50;
}

/**
 * Gsm4/Dfr1/Dfr2/Dfr3: wind-up / cast-gap / diveAim cutdown from BossMoveDef.windFrames.
 * Absent / non-finite / ≤0 → fallback (today: charge 38, slam 28, sweep 22, roar 40, fireball gap 20, diveAim 68).
 * Clamped 1…180. Dfr1 roarWind + Dfr2 fbCast gap + Dfr3 diveAim reuse this helper.
 */
export function windFramesFromMove(mp: BossMoveDef | null | undefined, fallback: number): number {
  const w = mp?.windFrames;
  if (typeof w === 'number' && Number.isFinite(w) && w > 0) {
    return Math.max(1, Math.min(180, Math.round(w)));
  }
  return fallback;
}

/** Gsm4 defaults (today literals) for charge/slam/sweep wind. */
export const GSM4_WIND_DEFAULTS = { charge: 38, slam: 28, sweep: 22 } as const;

/** Dfr1 roar soft defaults (today literals). wind via windFramesFromMove; radius/frames soft below. */
export const DFR1_ROAR_DEFAULTS = { wind: 40, radius: 300, frames: 44 } as const;

/** Dfr1: roar ring max radius from BossMoveDef.radius; absent/illegal → 300. Clamp 1…800. */
export function roarRadiusFromMove(mp: BossMoveDef | null | undefined): number {
  const r = mp?.radius;
  if (typeof r === 'number' && Number.isFinite(r) && r > 0) {
    return Math.max(1, Math.min(800, Math.round(r)));
  }
  return DFR1_ROAR_DEFAULTS.radius;
}

/** Dfr1: roar active frames from BossMoveDef.frames; absent/illegal → 44. Clamp 1…180. */
export function roarActiveFromMove(mp: BossMoveDef | null | undefined): number {
  const f = mp?.frames;
  if (typeof f === 'number' && Number.isFinite(f) && f > 0) {
    return Math.max(1, Math.min(180, Math.round(f)));
  }
  return DFR1_ROAR_DEFAULTS.frames;
}

/**
 * Dfr2 fireball soft defaults (today literals).
 * rise=`frames`; gap phase1=`windFrames` (phase2 gap still shell 14);
 * count=phase1 baseline (phase2 = min(8, base+2)); projectileId soft string.
 */
export const DFR2_FB_DEFAULTS = { rise: 34, count: 3, gap: 20, projectileId: 'fireball' } as const;

/** Dfr2: fbRise frames from BossMoveDef.frames; absent/illegal → 34. Clamp 1…180. */
export function fbRiseFromMove(mp: BossMoveDef | null | undefined): number {
  const f = mp?.frames;
  if (typeof f === 'number' && Number.isFinite(f) && f > 0) {
    return Math.max(1, Math.min(180, Math.round(f)));
  }
  return DFR2_FB_DEFAULTS.rise;
}

/** Dfr2: phase1 shot count from BossMoveDef.count; absent/illegal → 3. Clamp 1…8. */
export function fbCountFromMove(mp: BossMoveDef | null | undefined): number {
  const c = mp?.count;
  if (typeof c === 'number' && Number.isFinite(c) && c > 0) {
    return Math.max(1, Math.min(8, Math.round(c)));
  }
  return DFR2_FB_DEFAULTS.count;
}

/** Dfr2: phase1 cast gap via windFramesFromMove (fallback 20). Phase2 gap stays shell 14. */
export function fbGapFromMove(mp: BossMoveDef | null | undefined): number {
  return windFramesFromMove(mp, DFR2_FB_DEFAULTS.gap);
}

/**
 * Dfr2: projectile catalog id from BossMoveDef.projectileId.
 * Absent / empty / missing Def → 'fireball'. Does not expand drawKind.
 */
export function fbProjectileIdFromMove(mp: BossMoveDef | null | undefined): string {
  const id = mp?.projectileId;
  if (typeof id === 'string' && id.length > 0 && getProjectile(id)) return id;
  return DFR2_FB_DEFAULTS.projectileId;
}

/**
 * Dfr3 dive soft defaults (today literals).
 * aim cutdown=`windFrames` (still ÷ spd); wave half-width=`radius`;
 * recover=`frames` (still ÷ spd); optional attackKey softs body+wave catalog ids.
 */
export const DFR3_DIVE_DEFAULTS = {
  aimWind: 68,
  radius: 150,
  recover: 60,
  bodyKey: 'gDive',
  waveKey: 'gDiveWave',
} as const;

/** Dfr3: diveAim cutdown via windFramesFromMove (fallback 68). Still ÷ spd at call site. */
export function diveAimWindFromMove(mp: BossMoveDef | null | undefined): number {
  return windFramesFromMove(mp, DFR3_DIVE_DEFAULTS.aimWind);
}

/** Dfr3: landing wave half-width from BossMoveDef.radius; absent/illegal → 150. Clamp 1…600. */
export function diveWaveRadiusFromMove(mp: BossMoveDef | null | undefined): number {
  const r = mp?.radius;
  if (typeof r === 'number' && Number.isFinite(r) && r > 0) {
    return Math.max(1, Math.min(600, Math.round(r)));
  }
  return DFR3_DIVE_DEFAULTS.radius;
}

/** Dfr3: recover frames from BossMoveDef.frames; absent/illegal → 60. Clamp 1…180. Still ÷ spd at call site. */
export function diveRecoverFromMove(mp: BossMoveDef | null | undefined): number {
  const f = mp?.frames;
  if (typeof f === 'number' && Number.isFinite(f) && f > 0) {
    return Math.max(1, Math.min(180, Math.round(f)));
  }
  return DFR3_DIVE_DEFAULTS.recover;
}

/**
 * Dfr3: dive body AttackDef catalog id from BossMoveDef.attackKey.
 * Absent / empty → 'gDive'. Missing box soft-skipped by caller via bossBox.
 * When set, same key also softs the landing wave (see diveWaveKeyFromMove).
 */
export function diveBodyKeyFromMove(mp: BossMoveDef | null | undefined): string {
  const k = mp?.attackKey;
  if (typeof k === 'string' && k.length > 0) return k;
  return DFR3_DIVE_DEFAULTS.bodyKey;
}

/**
 * Dfr3: dive wave AttackDef catalog id from BossMoveDef.attackKey.
 * Absent / empty → 'gDiveWave'. Missing box soft-skipped by caller via bossBox.
 */
export function diveWaveKeyFromMove(mp: BossMoveDef | null | undefined): string {
  const k = mp?.attackKey;
  if (typeof k === 'string' && k.length > 0) return k;
  return DFR3_DIVE_DEFAULTS.waveKey;
}

export type BossTint = 'jade' | 'ink' | 'blood' | 'ash';

/** Per-act boss scaling / banner (reuses Gargoyle pipeline). */
export interface GargoyleParams {
  displayName?: string;
  hpScale?: number;
  dmgScale?: number;
  tint?: BossTint;
  /** bossKits catalog id (open string; CORE: stone/rain/tomb/night). */
  kit?: string;
  /** Catalog base HP before hpScale (default 900). makeBoss passes EnemyDef.hp. */
  baseHp?: number;
}

/** 镇山石兽 — stone guardian boss (id gargoyle). Phase 2 gains 霸体. */
export class Gargoyle extends Fighter {
  readonly team = 'enemy' as const;
  name = '镇山石兽';
  dmgScale = 1;
  tint: BossTint = 'jade';
  /** Active bossKits id (from resolveBossKit / params). */
  kit: string = 'stone';
  phase: 1 | 2 = 1;
  poise = 110;
  poiseMax = 110;
  /** Phase-1 stone plate — crack before full poise pressure. */
  plateArmor = 80;
  plateMax = 80;
  _plateCracked = false;
  lastDamage = 0;
  cooldown = 60;
  private sinceHit = 0;
  private comboIdx = 0;
  private lastMove: string = 'walk';
  private pendingRoar = false;
  private thresholds = [0.66, 0.5, 0.25];
  private roarCd = 400;
  private recoverDur = 40;
  private fired = 0;
  /** Walk cycle phase — public for BehaviorHost (Gsm1 gap loco). */
  walkPhase = 0;
  private armorTextCd = 0;
  private roarHit = false;
  private bounced = false;
  markerX = 0;
  roarR = 0;
  private moveParams: BossMoveDef | null = null;
  private slamHit = false;
  private sweepHit = false;
  private inkR = 0;
  private summonCd = 0;
  /** Catalog EnemyDef.id (set by makeBoss). */
  archetypeId: string | null = null;
  /** Soft silhouette id — drawGargoyle soft-reads parts (BossSil1 palette/scale; BossSil2 faceMark/ornament/armorLayer/cloak.color). */
  silhouetteId: string | null = null;
  /** Soft behavior id — Gsm1: non-empty steps → idle/walk gap loco; kit chooseMove unchanged. */
  behaviorId: string | null = null;
  /** Whitelist BehaviorStep recipe (from BehaviorDef.steps); null/empty → shell idle/walk. */
  behaviorSteps: BehaviorStep[] | null = null;
  /** Interpreter runtime for gap steps (Gsm1). */
  behaviorRt: BehaviorRuntime | null = null;
  /** Soft catalog loadout (BossLoad1 gear; BossLoad2 idle/walk cast). */
  loadout: EnemyLoadoutState | null = null;

  constructor(x: number, params: GargoyleParams = {}) {
    const hpScale = params.hpScale ?? 1;
    const baseHp = params.baseHp ?? 900;
    super(x, -160, 70, 130, Math.round(baseHp * hpScale));
    this.name = params.displayName ?? '镇山石兽';
    this.dmgScale = params.dmgScale ?? 1;
    this.tint = params.tint ?? 'jade';
    this.kit = params.kit ?? 'stone';
    this.poise = Math.round(this.poise * Math.min(1.4, 0.85 + hpScale * 0.15));
    this.poiseMax = this.poise;
    this.plateArmor = Math.round(this.plateArmor * Math.min(1.5, 0.9 + hpScale * 0.1));
    this.plateMax = this.plateArmor;
    this.setState('intro');
    this.body.onGround = false;
    this.facing = -1;
  }

  /** Scale attack damage for harder acts + loadout atkMul (startAttack path only). */
  startAttack(def: import('../../combat/types').AttackDef): void {
    let scaled = scaleLoadoutAttack(this, def);
    if (this.dmgScale !== 1) {
      scaled = { ...scaled, damage: Math.max(1, Math.round(scaled.damage * this.dmgScale)) };
    }
    super.startAttack(scaled);
  }

  get spd(): number { return this.phase === 2 ? 1.3 : 1; }
  get invulnerable(): boolean { return ['intro', 'roarWind', 'roar', 'diveAim'].includes(this.state); }

  hurtbox(): Rect | null {
    if (this.dead || this.state === 'diveAim') return null;
    const b = this.body;
    const h = this.state === 'down' ? 50 : this.state === 'stagger' ? 105 : 130;
    return { x: b.x - 38, y: b.y - h, w: 76, h };
  }

  update(g: Game): void {
    const b = this.body;
    const p = g.player;
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.armorTextCd > 0) this.armorTextCd--;
    if (this.roarCd > 0) this.roarCd--;
    if (this.summonCd > 0) this.summonCd--;
    this.sinceHit++;
    if (this.sinceHit > 150) this.poise = Math.min(this.poiseMax, this.poise + 0.6);
    b.noGravity = false;
    b.gravityScale = 1;
    const dist = Math.abs(p.x - this.x);
    // BossLoad2: always tick loadout CDs/buffs; cast only in idle/walk below.
    if (this.loadout) tickEnemyLoadoutTimers(g, this);

    if (this.pendingRoar && ['idle', 'walk', 'flinch', 'recover'].includes(this.state)) {
      this.pendingRoar = false;
      this.startRoar(g);
    }

    switch (this.state) {
      case 'intro': {
        b.noGravity = true;
        if (this.t < 80) {
          b.vy = 0;
          b.y = lerp(-160, GROUND_Y, Math.min(1, this.t / 80) ** 2);
          if (this.t % 18 === 0) playSfx(g.audio, 'flap');
        } else if (this.t === 80) {
          b.y = GROUND_Y;
          g.cam.shake(12, 20);
          g.fx.dust(b.x, GROUND_Y, 20);
          g.fx.stoneShatter(b.x, GROUND_Y, 10);
          playSfx(g.audio, 'boom');
        } else if (this.t >= 105) {
          this.startRoar(g);
        }
        break;
      }
      case 'idle': {
        // Gsm1 empty-gap priority (§2.2): timers(top) → behavior loco → tryCast → chooseMove.
        const hasSteps = !!this.behaviorSteps?.length;
        if (hasSteps) tickBossBehaviorGap(g, this);
        else {
          this.faceToward(p.x);
          b.vx *= 0.8;
        }
        if (p.dead) break;
        // BossLoad2: try loadout cast in kit-CD gap OR before chooseMove.
        // Success → skip chooseMove (kit weights/kind untouched). Failure → no-op.
        if (tryCastBossLoadout(g, this)) break;
        if (--this.cooldown <= 0) this.chooseMove(g, dist);
        else if (!hasSteps && dist > 170) this.setState('walk');
        break;
      }
      case 'walk': {
        const hasSteps = !!this.behaviorSteps?.length;
        if (hasSteps) tickBossBehaviorGap(g, this);
        else {
          this.faceToward(p.x);
          b.vx = this.facing * 1.8 * this.spd;
          this.walkPhase += 0.1 * this.spd;
        }
        if (this.t % 26 === 0) { g.cam.shake(1.5, 4); playSfx(g.audio, 'land'); }
        if (tryCastBossLoadout(g, this)) break;
        if (hasSteps) {
          // With steps, CD ready still goes to kit chooseMove (sovereignty).
          if (--this.cooldown <= 0) this.chooseMove(g, dist);
        } else if (--this.cooldown <= 0 || dist < 140) {
          this.setState('idle');
        }
        break;
      }
      case 'flinch':
        b.vx *= 0.85;
        if (this.t >= 12) this.setState('idle');
        break;
      case 'attack':
        this.progressAttack(g);
        break;
      case 'chargeWind': {
        // Gsm4: windFrames soft (default 38); still ÷ spd like today.
        b.vx = 0;
        this.faceToward(p.x);
        if (this.t === 1) playSfx(g.audio, 'telegraph');
        if (this.t % 6 === 0) g.fx.dust(b.x - this.facing * 20, GROUND_Y, 1, -this.facing);
        const chargeWind = windFramesFromMove(this.moveParams, GSM4_WIND_DEFAULTS.charge);
        if (this.t >= Math.round(chargeWind / this.spd)) {
          this.setState('charge');
          const chargeHit = bossBox('gCharge');
          if (chargeHit) this.atk = { def: chargeHit, f: 0, hit: new Set() };
          playSfx(g.audio, 'roar');
        }
        break;
      }
      case 'charge':
        b.vx = this.facing * 11.5 * (this.phase === 2 ? 1.1 : 1);
        if (this.t % 2 === 0) g.fx.dust(b.x - this.facing * 30, GROUND_Y, 2, -this.facing);
        if (b.hitWall !== 0 || this.t > 90) {
          this.atk = null;
          if (b.hitWall !== 0) {
            g.cam.shake(10, 16);
            g.fx.stoneShatter(b.x + this.facing * 40, GROUND_Y - 60, 12);
            playSfx(g.audio, 'boom');
          }
          this.recover(55);
        }
        break;
      case 'fbRise':
        b.noGravity = true;
        b.vx *= 0.9;
        b.vy = b.y > GROUND_Y - 210 ? -6 : 0;
        if (this.t % 14 === 0) playSfx(g.audio, 'flap');
        // Dfr2: frames soft (缺省 34)
        if (this.t >= fbRiseFromMove(this.moveParams)) { this.setState('fbCast'); this.fired = 0; }
        break;
      case 'fbCast': {
        b.noGravity = true;
        b.vy = Math.sin(this.t * 0.12) * 0.6;
        this.faceToward(p.x);
        if (this.t % 14 === 0) playSfx(g.audio, 'flap');
        // Dfr2: count soft (phase1 baseline; phase2 = min(8, base+2)); gap phase1=windFrames soft, phase2 shell 14
        const baseCount = fbCountFromMove(this.moveParams);
        const total = this.phase === 2 ? Math.min(8, baseCount + 2) : baseCount;
        const gap = this.phase === 2 ? 14 : fbGapFromMove(this.moveParams);
        if (this.t >= 16 && (this.t - 16) % gap === 0 && this.fired < total) {
          const mx = b.x + this.facing * 42, my = b.y - 128;
          const ang = Math.atan2(p.y - 40 - my, p.x - mx) + rand(-0.06, 0.06);
          const sp = 6.2;
          // Dfr2: projectileId soft (缺省 fireball); ArrowProj3 attackKey 不变
          const projId = fbProjectileIdFromMove(this.moveParams);
          const fireDef = getProjectile(projId);
          const fireAtk = bossBox(resolveProjectileAttackKey(fireDef, projId));
          if (fireAtk) g.projectiles.push(new Projectile(projId, mx, my, Math.cos(ang) * sp, Math.sin(ang) * sp, 'enemy', fireAtk));
          g.fx.flare(mx, my, 40, '#ff8030', 10);
          playSfx(g.audio, 'fire');
          this.fired++;
        }
        if (this.fired >= total && this.t > 16 + gap * total + 10) this.setState('fbFall');
        break;
      }
      case 'fbFall':
        if (b.onGround) { g.cam.shake(5, 8); g.fx.dust(b.x, GROUND_Y, 10); playSfx(g.audio, 'land'); this.recover(28); }
        break;
      case 'diveUp':
        b.noGravity = true;
        b.vy = -10;
        b.vx = 0;
        if (this.t % 10 === 0) playSfx(g.audio, 'flap');
        if (b.y < -180) { this.setState('diveAim'); this.markerX = p.x; }
        break;
      case 'diveAim': {
        // Dfr3: windFrames soft (default 68); still ÷ spd. Invuln/topology unchanged.
        b.noGravity = true;
        b.vy = 0;
        if (this.t < 50) this.markerX = lerp(this.markerX, p.x, 0.09);
        if (this.t === 50) playSfx(g.audio, 'telegraph');
        const aimWind = Math.round(diveAimWindFromMove(this.moveParams) / this.spd);
        if (this.t >= aimWind) {
          b.x = this.markerX;
          this.setState('diveDown');
          const diveBody = bossBox(diveBodyKeyFromMove(this.moveParams));
          if (diveBody) this.atk = { def: diveBody, f: 0, hit: new Set() };
        }
        break;
      }
      case 'diveDown': {
        // Dfr3: radius soft (wave half-width, default 150); frames soft recover (default 60 ÷ spd);
        // optional attackKey softs body (on enter) + wave boxes; missing box soft-skip.
        b.noGravity = true;
        b.vy = 24;
        if (b.onGround || b.y >= GROUND_Y) {
          this.atk = null;
          const waveRx = diveWaveRadiusFromMove(this.moveParams);
          const diveWave = bossBox(diveWaveKeyFromMove(this.moveParams));
          if (diveWave) g.areaHit(this, b.x, GROUND_Y - 30, waveRx, 90, diveWave);
          g.cam.shake(16, 24);
          g.fx.ring(b.x, GROUND_Y - 6, 160, '#ff5030', 24);
          g.fx.flare(b.x, GROUND_Y - 20, 160, '#ff3020', 18);
          g.fx.stoneShatter(b.x, GROUND_Y, 24);
          g.fx.dust(b.x, GROUND_Y, 24);
          playSfx(g.audio, 'boom');
          this.recover(Math.round(diveRecoverFromMove(this.moveParams) / this.spd));
        }
        break;
      }
      case 'roarWind': {
        // Dfr1: windFrames soft (default 40). Topology/invuln/startRoar unchanged.
        b.vx = 0;
        if (this.t % 3 === 0) g.fx.spawn({ kind: 'ember', x: b.x + rand(-120, 120), y: b.y - rand(0, 160), vx: 0, vy: -0.5, life: 30, size: 3, color: '#ff3040', add: true });
        const roarWind = windFramesFromMove(this.moveParams, DFR1_ROAR_DEFAULTS.wind);
        if (this.t >= roarWind) {
          this.setState('roar');
          this.roarR = 0;
          this.roarHit = false;
          playSfx(g.audio, 'roar');
          g.flashScreen('#ff2040', 0.35);
          g.cam.shake(12, 40);
          g.cam.punch(1.05);
        }
        break;
      }
      case 'roar': {
        // Dfr1: radius soft (default 300) + frames active (default 44); damage still gRoar.
        b.vx = 0;
        const roarMaxR = roarRadiusFromMove(this.moveParams);
        this.roarR = Math.min(roarMaxR, this.t * 11);
        if (this.t % 6 === 0) g.fx.ring(b.x, b.y - 70, this.roarR + 30, '#ff4060', 14);
        const pd = Math.abs(p.x - b.x);
        if (!this.roarHit && pd < this.roarR && pd > this.roarR - 70 && p.y > GROUND_Y - 70) {
          this.roarHit = true;
          const roarWave = bossBox('gRoar');
          if (roarWave) g.applyHitTo(this, p, roarWave, { x: p.x, y: p.y - 40 });
        }
        const roarActive = roarActiveFromMove(this.moveParams);
        if (this.t >= roarActive) { this.setState('idle'); this.cooldown = 30; }
        break;
      }
      case 'slamWind': {
        // Gsm4: windFrames soft (default 28). radius/damage/hitstop already soft on slam.
        b.vx = 0;
        if (this.t % 4 === 0) g.fx.spawn({ kind: 'ember', x: b.x + rand(-40, 40), y: b.y - 20, life: 18, size: 3, color: '#c8a070', add: true });
        const slamWind = windFramesFromMove(this.moveParams, GSM4_WIND_DEFAULTS.slam);
        if (this.t >= slamWind) {
          this.setState('slam');
          this.slamHit = false;
          playSfx(g.audio, 'boom');
          g.cam.shake(10, 16);
        }
        break;
      }
      case 'slam': {
        b.vx = 0;
        const rad = this.moveParams?.radius ?? 140;
        const dmg = this.moveParams?.damage ?? 18;
        if (this.t === 1) {
          g.fx.ring(b.x, GROUND_Y - 4, rad, '#d0b080', 20);
          g.fx.dust(b.x, GROUND_Y, 18);
          g.fx.stoneShatter(b.x, GROUND_Y, 12);
        }
        if (!this.slamHit && this.t >= 2) {
          this.slamHit = true;
          const hit: AttackDef = {
            name: 'gSlam', startup: 0, active: 1, recovery: 0,
            box: { x: 0, y: 0, w: 0, h: 0 },
            damage: dmg, kbX: 7, kbY: -8, knockdown: true, unblockable: true,
            hitstun: 28, hitstop: this.moveParams?.hitstop ?? 10, shake: 10,
          };
          g.areaHit(this, b.x, GROUND_Y - 20, rad, 70, hit);
        }
        if (this.t >= 22) this.recover(Math.round(40 / this.spd));
        break;
      }
      case 'sweepWind': {
        // Gsm4: windFrames soft (default 22). width/damage already soft on sweep.
        b.vx = 0;
        this.faceToward(p.x);
        const sweepWind = windFramesFromMove(this.moveParams, GSM4_WIND_DEFAULTS.sweep);
        if (this.t >= sweepWind) {
          this.setState('sweep');
          this.sweepHit = false;
          playSfx(g.audio, 'claw');
        }
        break;
      }
      case 'sweep': {
        const w = this.moveParams?.width ?? 180;
        const dmg = this.moveParams?.damage ?? 14;
        b.vx = this.facing * 1.2;
        if (!this.sweepHit && this.t >= 4 && this.t <= 12) {
          this.sweepHit = true;
          const hit: AttackDef = {
            name: 'gSweep', startup: 0, active: 1, recovery: 0,
            box: { x: 0, y: 0, w: 0, h: 0 },
            damage: dmg, kbX: 8, kbY: -3, hitstun: 22, hitstop: 7, shake: 6, heavy: true,
          };
          g.areaHit(this, b.x + this.facing * (w * 0.35), b.y - 50, w * 0.55, 55, hit);
          g.fx.slashLine(b.x, b.y - 60, b.x + this.facing * w, b.y - 40, '#e8d0a0', 10, 8);
        }
        if (this.t >= 28) this.recover(Math.round(36 / this.spd));
        break;
      }
      case 'inkNova': {
        b.vx = 0;
        const rad = this.moveParams?.radius ?? 160;
        const frames = this.moveParams?.frames ?? 28;
        const col = this.moveParams?.color ?? '#2a2030';
        this.inkR = Math.min(rad, this.t * (rad / Math.max(8, frames * 0.6)));
        if (this.t % 5 === 0) g.fx.ring(b.x, b.y - 50, this.inkR, col, 12);
        if (this.t === Math.floor(frames * 0.55)) {
          const dmg = this.moveParams?.damage ?? 8;
          if (dmg > 0) {
            const hit: AttackDef = {
              name: 'gInk', startup: 0, active: 1, recovery: 0,
              box: { x: 0, y: 0, w: 0, h: 0 },
              damage: dmg, kbX: 3, kbY: -2, hitstun: 14, hitstop: 4, shake: 4,
            };
            g.areaHit(this, b.x, b.y - 40, rad, rad * 0.55, hit);
          }
          g.flashScreen(col, 0.25);
          playSfx(g.audio, 'boom');
        }
        if (this.t >= frames) { this.setState('idle'); this.cooldown = 36; }
        break;
      }
      case 'summonAdds': {
        b.vx = 0;
        if (this.t === 8) {
          const eid = this.moveParams?.enemyId ?? 'axe';
          const count = Math.max(1, Math.min(4, this.moveParams?.count ?? 2));
          const side = this.moveParams?.side ?? 'both';
          if (!getEnemy(eid) && !['axe', 'shield', 'archer', 'spear'].includes(eid)) {
            // soft-skip missing catalog
            g.texts.add('虚召', b.x, b.y - 160, '#888', 12);
          } else {
            for (let i = 0; i < count; i++) {
              let sx = b.x;
              if (side === 'L') sx = b.x - 80 - i * 40;
              else if (side === 'R') sx = b.x + 80 + i * 40;
              else sx = b.x + (i % 2 === 0 ? -1 : 1) * (70 + i * 30);
              try {
                g.enemies.push(makeEnemy(eid, sx, { eliteChance: 0 }));
              } catch { /* soft */ }
            }
            g.texts.add('召卫', b.x, b.y - 160, '#c8b090', 14);
            playSfx(g.audio, 'roar');
          }
          this.summonCd = 420;
        }
        if (this.t >= 36) { this.setState('idle'); this.cooldown = 40; }
        break;
      }
      case 'recover':
        b.vx *= 0.85;
        if (this.t >= this.recoverDur) { this.setState('idle'); this.cooldown = Math.round(30 / this.spd); }
        break;
      case 'parried':
        b.vx *= 0.85;
        if (this.t >= (this.phase === 2 ? 36 : 54)) { this.setState('idle'); this.cooldown = 20; }
        break;
      case 'stagger':
        b.vx *= 0.85;
        if (this.t % 8 === 0) g.fx.spawn({ kind: 'ember', x: b.x + rand(-30, 30), y: b.y - 120, vy: -0.8, life: 30, size: 3, color: '#ffd27a', add: true });
        // Long 破绽 window for punish / chest setup pressure
        if (this.t >= 150) { this.setState('recover'); this.recoverDur = 28; this.poise = this.poiseMax; this.cooldown = 16; }
        break;
      case 'air':
        b.gravityScale = 0.55;
        break;
      case 'down':
        b.vx *= 0.8;
        if (this.t >= 50) this.setState('getup');
        break;
      case 'getup':
        if (this.t >= 22) { this.setState('idle'); this.poise = this.poiseMax; this.cooldown = 15; }
        break;
      case 'dying':
        b.vx *= 0.9;
        this.shakeT = 2;
        if (this.t % 6 === 0) {
          g.fx.stoneShatter(b.x + rand(-30, 30), b.y - rand(20, 100), 3);
          g.fx.flare(b.x + rand(-40, 40), b.y - rand(20, 120), 60, '#ff2040', 14);
        }
        if (this.t === 1) playSfx(g.audio, 'roar');
        if (this.t >= 140) {
          this.remove = true;
          g.fx.stoneShatter(b.x, b.y, 60);
          g.fx.flare(b.x, b.y - 70, 260, '#ff3050', 30);
          g.fx.ring(b.x, b.y - 70, 260, '#ffd0d0', 30);
          g.cam.shake(18, 30);
          g.flashScreen('#ffffff', 0.8);
          playSfx(g.audio, 'boom');
          playSfx(g.audio, 'bone');
          g.onBossDefeated();
        }
        break;
    }
    const wasAir = !b.onGround;
    b.step(g.bounds.min, g.bounds.max);
    if (b.landed && wasAir && this.state === 'air') {
      if (!this.bounced && b.impactVy > 9) { this.bounced = true; b.vy = -5; b.onGround = false; g.cam.shake(6, 8); }
      else { this.setState('down'); g.fx.dust(b.x, GROUND_Y, 14); g.cam.shake(6, 10); playSfx(g.audio, 'land'); }
    }
  }

  private progressAttack(g: Game): void {
    const a = this.atk;
    const b = this.body;
    if (!a) { this.setState('idle'); return; }
    const d = a.def;
    a.f++;
    if (a.f < d.startup - 4) this.faceToward(g.player.x);
    if (d.moveX && a.f >= d.startup - 8 && a.f <= (d.moveFrames ?? d.startup + d.active)) b.vx = this.facing * d.moveX;
    else b.vx *= 0.8;
    if (a.f === Math.max(1, d.startup - 14)) playSfx(g.audio, 'telegraph');
    if (a.f === d.startup) playSfx(g.audio, 'claw');
    if (a.f >= d.startup + d.active + d.recovery) {
      this.atk = null;
      if (this.comboIdx < 2) {
        this.comboIdx++;
        const next = bossBox(this.comboIdx === 1 ? 'claw2' : 'claw3');
        if (next) {
          const base = this.phase === 2 ? fast(next) : next;
          this.startAttack(applyClawMoveSoft(base, this.moveParams));
        }
        else { this.setState('idle'); this.cooldown = Math.round(40 / this.spd); }
      } else {
        this.setState('idle');
        this.cooldown = Math.round(40 / this.spd);
      }
    }
  }

  private recover(n: number): void { this.recoverDur = n; this.setState('recover'); }

  private startRoar(g: Game): void {
    this.atk = null;
    this.setState('roarWind');
    this.roarCd = 600;
    this.body.vx = 0;
    playSfx(g.audio, 'telegraph');
  }

  private chooseMove(g: Game, dist: number): void {
    let opts = bossMoveWeights(this.kit, dist < 160, this.roarCd <= 0) as Array<[string, number]>;
    // Gate summon on CD
    opts = opts.map(([m, w]) => {
      if (m === 'summonAdds' || (getBossMove(m)?.kind === 'summonAdds')) {
        return [m, this.summonCd > 0 ? 0 : w] as [string, number];
      }
      return [m, w] as [string, number];
    });
    const weighted = opts.map(([m, w]) => [m, m === this.lastMove ? w * 0.25 : w] as [string, number]);
    let r = Math.random() * weighted.reduce((s, [, w]) => s + w, 0);
    let pickId = 'walk';
    for (const [m, w] of weighted) { if ((r -= w) <= 0) { pickId = m; break; } }
    this.lastMove = pickId;
    const def = getBossMove(pickId);
    const kind: BossMoveKind = def?.kind
      ?? (['claw', 'charge', 'fireball', 'dive', 'roar', 'walk', 'slam', 'sweep', 'summonAdds', 'inkNova'].includes(pickId)
        ? pickId as BossMoveKind
        : 'walk');
    this.moveParams = def ?? { id: pickId, kind };
    const b = this.body;
    switch (kind) {
      case 'claw': {
        this.comboIdx = 0;
        const claw1 = bossBox('claw1');
        if (claw1) {
          const base = this.phase === 2 ? fast(claw1) : claw1;
          this.startAttack(applyClawMoveSoft(base, this.moveParams));
        }
        else { this.setState('walk'); this.cooldown = walkCooldownFromMove(this.moveParams); }
        break;
      }
      case 'charge': this.setState('chargeWind'); break;
      case 'fireball': this.setState('fbRise'); b.onGround = false; break;
      case 'dive': this.setState('diveUp'); b.onGround = false; playSfx(g.audio, 'flap'); break;
      case 'roar': this.startRoar(g); break;
      case 'slam': this.setState('slamWind'); break;
      case 'sweep': this.setState('sweepWind'); break;
      case 'inkNova': this.setState('inkNova'); playSfx(g.audio, 'telegraph'); break;
      case 'summonAdds': this.setState('summonAdds'); break;
      case 'walk':
      default:
        // Gsm3: frames soft-reads walk CD; CORE walk has no frames → 50.
        this.setState('walk'); this.cooldown = walkCooldownFromMove(this.moveParams); break;
    }
  }

  receiveHit(g: Game, def: AttackDef, dir: number): HitResult {
    const b = this.body;
    if (this.dead) return 'miss';
    if (this.invulnerable) return 'immune';
    if ((this.state === 'down' || this.state === 'getup') && !def.otg) return 'miss';
    let dealt = def.damage;
    const gearMul = loadoutIncomingMul(this);
    if (gearMul !== 1) {
      dealt = Math.max(1, Math.round(dealt * gearMul));
    }
    this.hp -= dealt;
    this.lastDamage = dealt;
    this.flash = 6;
    this.shakeT = def.hitstop;
    this.sinceHit = 0;
    this.poise -= dealt * (def.poiseScale ?? (def.heavy ? 1.6 : 1));
    this.checkThresholds(g);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.atk = null;
      b.noGravity = false;
      this.setState('dying');
      g.onBossDying();
      return 'hit';
    }
    const juggle = this.state === 'stagger' || this.state === 'air' || this.state === 'down';
    if (juggle) {
      if (def.launch || this.state === 'air' || this.state === 'down' || def.knockdown) {
        b.vy = def.spike ? 12 : def.launch ? def.kbY * 0.8 : def.kbY < 0 ? def.kbY * 0.8 : -4;
        b.vx = dir * def.kbX * 0.5;
        b.onGround = false;
        if (this.state !== 'air') this.bounced = false;
        this.setState('air');
      }
      return 'hit';
    }
    if (this.poise <= 0 && this.state !== 'dying') {
      this.atk = null;
      b.noGravity = false;
      this.setState('stagger');
      this.poise = this.poiseMax * 0.35; // partial refill — still soft during getup
      g.texts.add('架势崩裂!', this.x, this.y - 170, '#ffd27a', 32, true);
      g.showBanner('破绽', '架势崩裂 · 重击窗口', 90);
      g.slowmo(0.32, 36);
      g.cam.shake(10, 18);
      playSfx(g.audio, 'stagger');
      return 'hit';
    }
    const canFlinch = !this.superArmor && (this.state === 'idle' || this.state === 'walk' || this.state === 'recover' || this.state === 'flinch');
    if (canFlinch) {
      this.atk = null;
      this.setState('flinch');
      b.vx = dir * 2;
    } else if (this.superArmor && this.armorTextCd <= 0) {
      this.armorTextCd = 90;
      g.texts.add('霸体', this.x, this.y - 165, '#ff9090', 18);
    }
    return 'hit';
  }

  private checkThresholds(g: Game): void {
    const r = this.hp / this.maxHp;
    while (this.thresholds.length && r <= this.thresholds[0]) {
      const th = this.thresholds.shift()!;
      this.pendingRoar = true;
      if (th === 0.5) {
        this.phase = 2;
        this.superArmor = true;
        this.poiseMax = 170;
        this.poise = this.poiseMax;
        this.plateArmor = 0;
        this._plateCracked = true;
        this.armorTextCd = 150;
        g.showBanner(`${this.name} · 狂怒`, '霸体：普通攻击无法使其硬直，击破“势”或弹反破绽', 150);
      }
    }
  }

  onParried(g: Game): void {
    this.atk = null;
    this.body.noGravity = false;
    this.poise -= 40;
    this.setState('parried');
    this.body.vx = -this.facing * 3;
    g.texts.add('破绽', this.x, this.y - 165, '#ffd27a', 20);
  }

  // ---------------- drawing ----------------
  /** Soft single-frame GP: catalog `garg.<key>` strike if registered, else hard GP. */
  private softGp(key: keyof typeof GP): Pose {
    return getPose(`garg.${String(key)}`)?.strike ?? GP[key];
  }

  computePose(g: Game): Pose {
    const b = this.body;
    const idle = this.softGp('idle');
    switch (this.state) {
      case 'intro': return this.t < 80 ? this.softGp('fly') : this.t < 92 ? this.softGp('crouch') : idle;
      case 'walk': return cycle(this.softGp('walk1'), this.softGp('walk2'), this.walkPhase);
      case 'flinch': return lerpPose(this.softGp('hurt'), idle, this.t / 12);
      case 'attack': {
        if (!this.atk) return idle;
        // Catalog `garg.*` first (Cordis/DLC). Prefer getPose over getAttackPose:
        // getAttackPose missing-id falls back to hunter slash1, unsuitable for Boss.
        const name = this.atk.def.name;
        const set = getPose(`garg.${name}`) ?? GARG_ATTACKS[name] ?? GARG_ATTACKS.claw1;
        return attackPose(this.atk, set, idle);
      }
      case 'chargeWind': return lerpPose(idle, this.softGp('crouch'), Math.min(1, this.t / 14));
      case 'charge': return this.softGp('charge');
      case 'fbRise': case 'fbFall': case 'diveUp': return this.softGp('fly');
      case 'fbCast': return lerpPose(this.softGp('fly'), this.softGp('cast'), 0.5 + Math.sin(this.t * 0.4) * 0.5);
      case 'diveAim': case 'diveDown': return this.softGp('dive');
      case 'roarWind': case 'slamWind': case 'sweepWind': return lerpPose(idle, this.softGp('crouch'), Math.min(1, this.t / 20));
      case 'roar': case 'inkNova': return this.softGp('roar');
      case 'slam': return this.softGp('crouch');
      case 'sweep': case 'summonAdds': return idle;
      case 'recover': return lerpPose(this.softGp('stagger'), idle, clamp(this.t / this.recoverDur, 0, 1));
      case 'parried': return this.softGp('hurt');
      case 'stagger': return this.softGp('stagger');
      case 'air': return this.softGp('air');
      case 'down': return this.softGp('down');
      case 'getup': return lerpPose(this.softGp('stagger'), idle, this.t / 22);
      case 'dying': return b.onGround ? this.softGp('stagger') : this.softGp('air');
    }
    return cycle(idle, this.softGp('idle2'), g.tick * 0.05);
  }

  private glowLevel(): number {
    if (this.state === 'chargeWind' || this.state === 'roarWind') return 0.6 + ((this.t >> 2) % 2) * 0.4;
    const a = this.atk;
    if (this.state === 'attack' && a && a.f < a.def.startup && a.f > a.def.startup - 16) return 0.4 + (1 - (a.def.startup - a.f) / 16) * 0.6;
    return 0;
  }

  draw(ctx: CanvasRenderingContext2D, g: Game): void {
    const b = this.body;
    // dive target marker
    if (this.state === 'diveAim' || this.state === 'diveDown') {
      const pulse = 0.5 + Math.sin(g.tick * 0.5) * 0.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,40,60,${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(this.state === 'diveAim' ? this.markerX : b.x, GROUND_Y + 2, 120, 18, 0, 0, Math.PI * 2);
      ctx.stroke();
      drawGlow(ctx, this.state === 'diveAim' ? this.markerX : b.x, GROUND_Y, 90, '#ff2040', 0.5);
      ctx.restore();
    }
    if (this.state === 'diveAim') return;
    // shadow
    const hgt = GROUND_Y - b.y;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(b.x, GROUND_Y + 3, Math.max(20, 60 - hgt * 0.1), 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // roar shockwave
    if (this.state === 'roar') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,60,80,${1 - this.t / 44})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - 60, this.roarR, this.roarR * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    const pose = this.computePose(g);
    const flying = ['intro', 'fbRise', 'fbCast', 'fbFall', 'diveUp', 'diveDown'].includes(this.state) && !(this.state === 'intro' && this.t >= 80);
    const wingF = flying ? Math.sin(g.tick * 0.35) * 0.9 : this.state === 'roar' || this.state === 'roarWind' ? 1 : this.state === 'charge' ? 0.7 : 0.05 + Math.sin(g.tick * 0.05) * 0.08;
    const jaw = this.state === 'roar' ? 1 : this.state === 'fbCast' ? 0.5 + Math.sin(this.t * 0.4) * 0.4 : this.state === 'roarWind' ? 0.3 : this.state === 'dying' ? 0.8 : 0.08;
    ctx.save();
    const jx = this.shakeT > 0 ? (Math.random() - 0.5) * 6 : 0;
    if (this.shakeT > 0 && this.state !== 'dying') this.shakeT--;
    ctx.translate(b.x + jx, b.y);
    ctx.scale(this.facing, 1);
    if (this.state === 'dying') ctx.globalAlpha = 0.7 + Math.sin(this.t * 0.8) * 0.3;
    const sil = this.silhouetteId ? (getSilhouette(this.silhouetteId) ?? null) : null;
    drawGargoyle(ctx, pose, {
      time: g.tick, flash: this.flash > 3, wing: wingF, jaw,
      rage: this.phase === 2, glow: this.glowLevel(),
      armor: this.superArmor && !this.dead, tint: this.tint,
      silhouette: sil,
    });
    ctx.restore();
    ctx.globalAlpha = 1;
    if (!this.dead) {
      const rw = readWindowOf(this);
      if (rw === 'counter' || rw === 'vuln') {
        ctx.font = '900 14px "Noto Serif SC", "Songti SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lab = readWindowLabel(rw);
        const ty = b.y - 155;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(10,0,8,0.85)';
        ctx.strokeText(lab, b.x, ty);
        ctx.fillStyle = readWindowColor(rw);
        ctx.fillText(lab, b.x, ty);
      }
    }
  }
}
