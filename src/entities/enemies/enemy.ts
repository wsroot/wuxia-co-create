import { Fighter } from '../fighter';
import type { Game } from '../../game';
import { GROUND_Y } from '../../engine/constants';
import type { AttackDef } from '../../combat/types';
import { playSfx } from '../../audio/sfx';
import type { Pose } from '../../render/rig';
import { attackPose, cycle, lerpPose } from '../../render/rig';
import { SP, SKEL_ATTACKS } from '../../render/poses';
import { drawSkeleton, type SkelKind } from '../../render/drawSkeleton';
import { getSilhouette, getPose, getAttackBox, locoPose } from '../../meta/contentRegistry';
import { resolveSilhouetteWeaponLook } from '../../render/resolveSilhouetteLook';
import { clamp } from '../../engine/math';
import type { EliteModId } from '../../level/eliteMods';
import { ELITE_MOD_BY_ID, scaleEliteAttack, tickEliteShanbu, spawnXiehuoZone } from '../../level/eliteMods';
import { readWindowOf, readWindowLabel, readWindowColor } from '../../combat/readWindows';
import { makeEnemy, getEnemy } from './factory';
import {
  tickEnemyLoadout, loadoutIncomingMul, scaleLoadoutAttack, drawEnemyPillAura,
  type EnemyLoadoutState,
} from './loadout';
import { tickBehaviorSteps, type BehaviorRuntime } from './behaviorInterp';
import type { BehaviorStep } from '../../meta/bTier/types';

export type HitResult = 'hit' | 'blocked' | 'immune' | 'miss';

/** Shared enemy runtime shell. Appearance/poses keyed by `kind`; AI via BehaviorSteps. */
export class Enemy extends Fighter {
  readonly team = 'enemy' as const;
  readonly kind: SkelKind;
  /** Shield block counter → quick bash after 3 blocks. */
  shieldBlocks = 0;
  cooldown = 40;
  lastDamage = 0;
  bounced = false;
  spike = false;
  parriedDur = 70;
  scoreName = '骷髅';
  /** Catalog EnemyDef.id used for loot table lookup (set by makeEnemy). */
  archetypeId: string | null = null;
  walkPhase = 0;
  dropChance = 0.22;
  /** In-run elite modifier (null = normal trash). */
  eliteMod: EliteModId | null = null;
  eliteDmgTakenMul = 1;
  eliteReflect = 0;
  eliteLifesteal = 0;
  eliteHeavyMul = 1;
  eliteStartupMul = 1;
  eliteDashCd = 0;
  eliteFireOnDeath = false;
  eliteSummonMinion = false;
  eliteSummonFire = false;
  /** Soft enemy id for summonMinion (from EliteModDef). */
  eliteSummonEnemyId: string | null = null;
  /** 驱邪符 temporary strip. */
  eliteSuppressed = false;
  /** Elite 架势 (only when hasElitePoise). */
  hasElitePoise = false;
  poise = 0;
  poiseMax = 0;
  /** Already evolved once (no re-queue). */
  evolved = false;
  /** Soft catalog loadout runtime (skills/gear/pills/talismans). */
  loadout: EnemyLoadoutState | null = null;
  /** Soft silhouette catalog id (appearance parts). */
  silhouetteId: string | null = null;
  /** Soft behavior catalog id. */
  behaviorId: string | null = null;
  /** Whitelist BehaviorStep recipe (from BehaviorDef.steps); null → idle fallback think. */
  behaviorSteps: BehaviorStep[] | null = null;
  /** Interpreter runtime for steps. */
  behaviorRt: BehaviorRuntime | null = null;
  /** Summon add cooldown. */
  summonCd = 0;

  constructor(x: number, hp: number, kind: SkelKind = 'axe') {
    super(x, GROUND_Y, 32, 82, hp);
    this.kind = kind;
    if (kind === 'shield') this.scoreName = '官差尸兵';
    else if (kind === 'archer') { this.scoreName = '蒙面刺客'; this.dropChance = 0.3; }
    else if (kind === 'spear') { this.scoreName = '枪影亡魂'; this.dropChance = 0.24; }
    else this.scoreName = '山贼亡魂';
    if (kind === 'shield') this.parriedDur = 60;
    this.setState('spawn');
  }

  /**
   * Fallback AI when no BehaviorSteps are attached.
   * With steps, update() already runs tickBehaviorSteps.
   */
  protected think(g: Game): void {
    const b = this.body;
    const p = g.player;
    if (this.cooldown > 0) this.cooldown--;
    this.faceToward(p.x);
    b.vx *= 0.8;
    if (this.state !== 'idle' && this.state !== 'walk' && this.state !== 'attack') {
      this.setState('idle');
    }
  }

  canBlock(def: AttackDef, dir: number): boolean {
    if (this.kind !== 'shield') return false;
    const up = this.state === 'idle' || this.state === 'walk' || this.state === 'bang'
      || (this.behaviorRt != null && this.behaviorRt.blockLeft > 0);
    return up && dir === -this.facing && !def.heavy && !def.low && !def.ultimate && !def.pierce;
  }

  override startAttack(def: AttackDef): void {
    super.startAttack(scaleEliteAttack(this, scaleLoadoutAttack(this, def)));
  }

  isReacting(): boolean {
    return ['spawn', 'hitstun', 'air', 'down', 'getup', 'parried', 'stagger', 'dying'].includes(this.state);
  }

  update(g: Game): void {
    const b = this.body;
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    b.gravityScale = 1;
    switch (this.state) {
      case 'spawn':
        if (this.t % 4 === 0) g.fx.dust(b.x, GROUND_Y, 1);
        if (this.t >= 40) this.setState('idle');
        return;
      case 'hitstun':
        b.vx *= 0.85;
        if (--this.hitstun <= 0) this.setState('idle');
        break;
      case 'air':
        b.gravityScale = 0.45;
        b.vx *= 0.985;
        break;
      case 'down':
        b.vx *= 0.8;
        if (this.t >= 44) this.setState('getup');
        break;
      case 'getup':
        b.vx = 0;
        if (this.t >= 16) { this.setState('idle'); this.cooldown = Math.max(this.cooldown, 20); }
        break;
      case 'parried':
        b.vx *= 0.85;
        if (this.t >= this.parriedDur) this.setState('idle');
        break;
      case 'stagger':
        b.vx *= 0.82;
        // Short 破绽 window (~42f) vs boss ~150f
        if (this.t >= 42) {
          this.setState('idle');
          if (this.hasElitePoise) this.poise = this.poiseMax;
          this.cooldown = Math.max(this.cooldown, 18);
          // 精英进化：破势未斩杀 → 余烬入队
          if (this.eliteMod && !this.evolved && this.hp > 0) {
            g.queueEliteEvolve(this);
            this.evolved = true; // mark so we don't re-queue same body; spawn is separate
          }
        }
        break;
      case 'dying':
        b.gravityScale = 0.6;
        b.vx *= 0.97;
        if ((b.onGround && this.t > 10) || this.t > 70) this.shatter(g);
        break;
      default: {
        // Data-driven BehaviorStep recipe replaces class AI when present.
        if (this.behaviorSteps?.length) {
          tickBehaviorSteps(g, this);
        } else {
          // Loadout cast as extra option / interrupt window; body AI unchanged otherwise.
          const cast = tickEnemyLoadout(g, this);
          if (!cast) this.think(g);
        }
        break;
      }
    }
    if (this.atk && this.state === 'attack') {
      const a = this.atk;
      a.f++;
      const d = a.def;
      if (d.moveX && a.f >= d.startup && a.f <= (d.moveFrames ?? d.startup + d.active)) b.vx = this.facing * d.moveX;
      else b.vx *= 0.8;
      if (a.f === d.startup - 16 || (d.startup < 16 && a.f === 1)) playSfx(g.audio, 'telegraph');
      if (a.f === d.startup && d.swing && d.swing !== 'none') playSfx(g.audio, d.swing === 'heavy' ? 'heavy' : d.swing === 'bash' ? 'bash' : d.swing === 'whip' ? 'whip' : 'slash');
      if (a.f >= d.startup + d.active + d.recovery) this.endAttack();
    }
    const eliteLive = !!this.eliteMod && !this.eliteSuppressed && g.eliteSuppressT <= 0;
    if (eliteLive && (ELITE_MOD_BY_ID[this.eliteMod!]?.dashAway) && !this.isReacting()) tickEliteShanbu(g, this);
    this.tickEliteSummon(g);
    if (eliteLive && this.eliteFireOnDeath && !this.dead && this.t > 0 && this.t % 300 === 0 && this.state !== 'spawn') {
      spawnXiehuoZone(g, this.x, this.y - 16);
      // shorter lifetime for periodic puddles
      const h = g.hazards[g.hazards.length - 1];
      if (h) h.ttl = 60 * 2.5;
    }
    const wasAir = !b.onGround;
    b.step(g.bounds.min, g.bounds.max);
    if (b.landed && wasAir) this.onLand(g);
  }

  protected endAttack(): void {
    const wasThrust = this.atk?.def.name === 'thrust';
    this.atk = null;
    this.setState('idle');
    if (this.kind === 'archer') this.cooldown = 40;
    else if (this.kind === 'spear') this.cooldown = (wasThrust ? 62 : 48) + Math.random() * 30;
    else this.cooldown = 50 + Math.random() * 40;
  }

  private onLand(g: Game): void {
    const b = this.body;
    if (this.state === 'air') {
      if (!this.bounced && (this.spike || b.impactVy > 9)) {
        this.bounced = true;
        b.vy = -5.5;
        b.onGround = false;
        g.fx.dust(b.x, b.y, 8);
        g.cam.shake(3, 6);
        playSfx(g.audio, 'land');
        return;
      }
      this.setState('down');
      g.fx.dust(b.x, b.y, 8);
      playSfx(g.audio, 'land');
    }
  }

  receiveHit(g: Game, def: AttackDef, dir: number): HitResult {
    const b = this.body;
    if (this.dead || this.state === 'spawn') return 'miss';
    if ((this.state === 'down' || this.state === 'getup') && !def.otg) return 'miss';
    const shieldUp = this.kind === 'shield' && (
      this.state === 'idle' || this.state === 'walk' || this.state === 'bang'
      || (this.behaviorRt != null && this.behaviorRt.blockLeft > 0)
    );
    const front = shieldUp && dir === -this.facing;
    if (this.canBlock(def, dir)) {
      this.shieldBlocks++;
      if (this.shieldBlocks >= 3 && g.attackToken(this)) {
        this.shieldBlocks = 0;
        this.faceToward(g.player.x);
        // A4: catalog bash + shorter startup (was QUICK_BASH from SHIELD_BASH const)
        const bash = getAttackBox('bash');
        if (bash) this.startAttack({ ...bash, startup: 11 });
      }
      return 'blocked';
    }
    let dealt = def.damage;
    const modsLive = !!this.eliteMod && !this.eliteSuppressed && g.eliteSuppressT <= 0;
    if (modsLive && this.eliteDmgTakenMul !== 1) {
      dealt = Math.max(1, Math.round(def.damage * this.eliteDmgTakenMul));
    }
    const gearMul = loadoutIncomingMul(this);
    if (gearMul !== 1) {
      dealt = Math.max(1, Math.round(dealt * gearMul));
    }
    // 安魂钟 weak-trash window
    if (g.affixBellWeak && this.eliteMod == null) {
      dealt = Math.max(1, Math.round(dealt * 1.35));
    }
    this.hp -= dealt;
    this.lastDamage = dealt;
    this.flash = 7;
    this.shakeT = def.hitstop;
    this.atk = null;
    if (this.hp <= 0) {
      this.dead = true;
      this.setState('dying');
      b.vx = dir * (def.kbX + 3);
      b.vy = Math.min(b.vy, -6);
      b.onGround = false;
      return 'hit';
    }
    // Elite 架势削韧
    if (this.hasElitePoise && this.state !== 'stagger') {
      const pMul = def.poiseScale ?? (def.heavy ? 1.6 : 1);
      this.poise -= dealt * pMul;
      if (this.poise <= 0) {
        this.poise = this.poiseMax * 0.4;
        this.setState('stagger');
        b.vx = dir * Math.max(2, def.kbX * 0.6);
        g.texts.add('破势!', this.x, this.y - 118, '#ffd27a', 16, true);
        playSfx(g.audio, 'stagger');
        return 'hit';
      }
    }
    this.facing = dir > 0 ? -1 : 1;
    const airborne = !b.onGround || this.state === 'air';
    this.spike = !!def.spike;
    if (def.launch) {
      b.vy = def.kbY;
      b.vx = dir * def.kbX;
      b.onGround = false;
      this.bounced = false;
      this.setState('air');
    } else if (airborne || this.state === 'down') {
      b.vy = def.spike ? 12 : def.kbY < 0 ? def.kbY : -4.5;
      b.vx = dir * def.kbX * 0.7;
      b.onGround = false;
      if (this.state === 'down') this.bounced = false;
      this.setState('air');
    } else if (def.knockdown) {
      b.vy = def.kbY || -5;
      b.vx = dir * def.kbX;
      b.onGround = false;
      this.bounced = true;
      this.setState('air');
    } else {
      this.setState('hitstun');
      this.hitstun = def.hitstun;
      b.vx = dir * def.kbX;
    }
    // Shield break: frontal hit through raised shield → parried
    if (front && this.state === 'hitstun') {
      this.setState('parried');
      this.parriedDur = 50;
      g.texts.add('破盾!', this.x, this.y - 110, '#ffb060', 20);
      playSfx(g.audio, 'clang');
    }
    return 'hit';
  }

  onParried(g: Game): void {
    this.atk = null;
    this.setState('parried');
    this.body.vx = -this.facing * 3;
    g.texts.add('破绽', this.x, this.y - 105, '#ffd27a', 18);
  }


  /** 召唤物对打：部分精英短冷却刷小怪/投射. */
  protected tickEliteSummon(g: Game): void {
    if (!this.eliteMod || this.dead || this.isReacting()) return;
    if (this.eliteSuppressed || g.eliteSuppressT > 0) return;
    if (this.summonCd > 0) { this.summonCd--; return; }
    if (!this.eliteSummonMinion && !this.eliteSummonFire) return;
    if (g.enemies.length >= 7) return;
    if (Math.abs(g.player.x - this.x) > 220) return;
    this.summonCd = 60 * 9;
    if (this.eliteSummonFire) {
      // projectile-ish: spawn fire zone near player
      spawnXiehuoZone(g, g.player.x + (Math.random() - 0.5) * 80, g.player.y - 10);
      g.texts.add('邪火召唤', this.x, this.y - 110, '#ff6030', 12);
    } else if (this.eliteSummonMinion) {
      const sid = this.eliteSummonEnemyId;
      if (!sid || !getEnemy(sid)) return; // soft skip missing catalog id
      const add = makeEnemy(sid as 'axe', this.x + this.facing * 50, { scale: 0.7, eliteChance: 0 });
      add.maxHp = Math.max(20, Math.round(add.maxHp * 0.45));
      add.hp = add.maxHp;
      add.scoreName = '残影';
      g.enemies.push(add);
      g.texts.add('召来残影', this.x, this.y - 110, '#e8c070', 12);
    }
  }

  private shatter(g: Game): void {
    this.remove = true;
    if (this.eliteFireOnDeath) spawnXiehuoZone(g, this.x, this.y - 20);
    g.fx.boneShatter(this.x, this.y, this.body.vx >= 0 ? 1 : -1);
    playSfx(g.audio, 'bone');
    g.onEnemyKilled(this);
  }

  // ---------------- drawing ----------------
  protected telegraph(): number {
    if (this.state === 'bang') return this.t > 28 ? 0.5 + ((this.t >> 2) % 2) * 0.5 : 0;
    if (this.state === 'aim') {
      const AIM_T = 38;
      if (this.t > AIM_T - 18 && this.t < AIM_T) return 0.4 + (1 - (AIM_T - this.t) / 18) * 0.6;
      // Behavior aim: aimLeft counts down; mirror ~last 18 frames of wind-up
      const left = this.behaviorRt?.aimLeft ?? 0;
      if (left > 18 && left < 36) return 0.4 + (1 - (left - 18) / 18) * 0.6;
    }
    const a = this.atk;
    if (!a || this.state !== 'attack') return 0;
    const d = a.def;
    if (this.kind === 'spear' && d.name === 'thrust' && a.f < d.startup) {
      const lead = Math.min(28, d.startup);
      if (a.f >= d.startup - lead) {
        return 0.35 + (1 - (d.startup - a.f) / lead) * 0.65;
      }
    }
    const lead = Math.min(18, d.startup);
    if (a.f >= d.startup - lead && a.f < d.startup) return clamp(1 - (d.startup - a.f) / lead, 0, 1) * 0.6 + 0.4;
    return 0;
  }

  protected drawOpts(): { draw?: number; eye?: string } {
    if (this.kind === 'archer') {
      const AIM_T = 38;
      const draw = this.state === 'aim' && this.t < AIM_T ? Math.min(1, this.t / 20)
        : (this.behaviorRt && this.behaviorRt.aimLeft > 18
          ? Math.min(1, (this.behaviorRt.aimLeft - 18) / 20) : 0);
      return { draw, eye: '#60e0ff' };
    }
    if (this.kind === 'spear') return { eye: '#c07040' };
    return {};
  }

  /** Soft single-frame SP loco: catalog `sp.<slot>` strike if registered, else hard SP. */
  private softSp(slot: 'idle' | 'walk1' | 'walk2' | 'hurt'): Pose {
    return locoPose(`sp.${slot}`, SP[slot]);
  }

  computePose(): Pose {
    if (this.animPoseOverride && this.animPoseT > 0) return this.animPoseOverride;
    const b = this.body;
    switch (this.state) {
      case 'spawn': return SP.getup;
      case 'hitstun': return lerpPose(this.softSp('hurt'), this.restPose(), clamp(1 - this.hitstun / 16, 0, 1) * 0.5);
      case 'air': return SP.air;
      case 'dying': return b.onGround ? SP.down : SP.air;
      case 'down': return SP.down;
      case 'getup': return lerpPose(SP.getup, this.restPose(), this.t / 16);
      case 'parried': return SP.parried;
      case 'stagger': return this.softSp('hurt');
      case 'attack': {
        if (!this.atk) return this.restPose();
        // Catalog `skel.*` first (Cordis/DLC). Prefer getPose over getAttackPose:
        // getAttackPose missing-id falls back to hunter slash1, unsuitable for trash mobs.
        const name = this.atkPoseName();
        const set = getPose(`skel.${name}`) ?? SKEL_ATTACKS[name] ?? SKEL_ATTACKS.axe;
        return attackPose(this.atk, set, this.restPose());
      }
    }
    const ai = this.aiPose();
    if (ai) return ai;
    if (Math.abs(b.vx) > 0.3) return cycle(this.walkA(), this.walkB(), this.walkPhase);
    return this.restPose();
  }

  protected restPose(): Pose {
    switch (this.kind) {
      case 'shield': return SP.shIdle;
      case 'archer': return SP.arIdle;
      case 'spear': return SP.spIdle;
      // Generic trash idle: soft `sp.idle` (kind-specialized sh/ar/sp stay hard — Loco2 minimal)
      default: return this.softSp('idle');
    }
  }

  protected aiPose(): Pose | null {
    if (this.state === 'aim') return lerpPose(SP.arIdle, SP.arAim, Math.min(1, this.t / 12));
    if (this.state === 'hop') return SP.hop;
    if (this.kind === 'shield') {
      switch (this.state) {
        case 'bang': return cycle(SP.shBang2, SP.shBang, ((this.t % 20) / 20) * Math.PI * 2 + 1.5);
        case 'charge': return SP.shCharge;
        case 'tired': return lerpPose(SP.shTired, SP.shIdle, this.t / 50);
      }
      if (this.behaviorRt && this.behaviorRt.chargeLeft > 0) return SP.shCharge;
    }
    if (this.state === 'retreat' && this.kind === 'spear') {
      return lerpPose(SP.spIdle, SP.spWalk2, Math.min(1, this.t / 8));
    }
    return null;
  }

  protected atkPoseName(): string {
    if (this.kind === 'shield') return 'bash';
    if (this.kind === 'archer') return 'whip';
    if (this.kind === 'spear') return this.atk?.def.name === 'lunge' ? 'lunge' : 'thrust';
    return 'axe';
  }

  protected walkA(): Pose {
    if (this.kind === 'shield') return SP.shWalk1;
    if (this.kind === 'spear') return SP.spWalk1;
    return this.softSp('walk1');
  }

  protected walkB(): Pose {
    if (this.kind === 'shield') return SP.shWalk2;
    if (this.kind === 'spear') return SP.spWalk2;
    return this.softSp('walk2');
  }

  draw(ctx: CanvasRenderingContext2D, g: Game): void {
    const b = this.body;
    const pose = this.computePose();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(b.x, GROUND_Y + 2, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    const jx = this.shakeT > 0 ? (Math.random() - 0.5) * 5 : 0;
    if (this.shakeT > 0) this.shakeT--;
    let rise = 0;
    if (this.state === 'spawn') {
      rise = (1 - clamp(this.t / 36, 0, 1)) * 90;
      ctx.beginPath();
      ctx.rect(b.x - 80, 0, 160, GROUND_Y + 2);
      ctx.clip();
    }
    ctx.translate(b.x + jx, b.y + rise);
    const sc = this.animScaleT > 0 ? this.animScale : 1;
    ctx.scale(this.facing * sc, sc);
    if (this.state === 'dying') ctx.globalAlpha = 0.6 + Math.sin(this.t) * 0.4;
    const sil = this.silhouetteId ? getSilhouette(this.silhouetteId) : undefined;
    const weaponLook = resolveSilhouetteWeaponLook(sil, this.loadout?.heldWeapon ?? null);
    drawSkeleton(ctx, pose, {
      kind: this.kind,
      flash: this.flash > 3,
      glint: this.telegraph(),
      time: g.tick,
      silhouette: sil ?? null,
      weaponLook,
      ...this.drawOpts(),
    });
    ctx.restore();
    ctx.globalAlpha = 1;
    if (this.animTintT > 0) {
      ctx.save();
      ctx.globalAlpha = this.animTintAlpha * Math.min(1, this.animTintT / 6);
      ctx.fillStyle = this.animTintColor;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - 40, 18, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // small HP (+ elite 架势) bar when damaged / elite
    if (!this.dead && (this.hp < this.maxHp || this.hasElitePoise)) {
      const w = 42;
      const by = b.y - 112;
      ctx.fillStyle = 'rgba(10,0,8,0.7)';
      ctx.fillRect(b.x - w / 2 - 1, by, w + 2, this.hasElitePoise ? 9 : 5);
      ctx.fillStyle = '#c01830';
      ctx.fillRect(b.x - w / 2, by + 1, (w * Math.max(0, this.hp)) / this.maxHp, 3);
      if (this.hasElitePoise && this.poiseMax > 0) {
        ctx.fillStyle = '#5a4820';
        ctx.fillRect(b.x - w / 2, by + 5, w, 3);
        ctx.fillStyle = this.state === 'stagger' ? '#ffe8a0' : '#d0a050';
        ctx.fillRect(b.x - w / 2, by + 5, (w * Math.max(0, this.poise)) / this.poiseMax, 3);
      }
    }
    // elite modifier tag
    if (this.eliteMod && !this.dead) {
      const mod = ELITE_MOD_BY_ID[this.eliteMod];
      const suppressed = this.eliteSuppressed || g.eliteSuppressT > 0;
      ctx.font = '900 11px "Noto Serif SC", "Songti SC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const ty = b.y - (this.hp < this.maxHp ? 122 : 108);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(10,0,8,0.85)';
      const tag = suppressed ? `${mod.tag}·封` : mod.tag;
      ctx.strokeText(tag, b.x, ty);
      ctx.fillStyle = suppressed ? '#8a8090' : mod.color;
      ctx.fillText(tag, b.x, ty);
    }
    // 破绽 / 反击 telegraph
    if (!this.dead) {
      const rw = readWindowOf(this);
      if (rw === 'counter' || rw === 'vuln') {
        const lab = readWindowLabel(rw);
        ctx.font = '900 12px "Noto Serif SC", "Songti SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const ty = b.y - (this.eliteMod ? 136 : 120);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(10,0,8,0.85)';
        ctx.strokeText(lab, b.x, ty);
        ctx.fillStyle = readWindowColor(rw);
        ctx.fillText(lab, b.x, ty);
      }
    }
    if (!this.dead) drawEnemyPillAura(this, ctx, g);
  }
}
