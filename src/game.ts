import { GROUND_Y, VIEW_WW } from './engine/constants';
import { getChapter, actCount, type Platform, type StageDef, type BackdropTheme } from './level/stage';
import { Camera } from './engine/camera';
import type { Input } from './engine/input';
import type { AudioEngine } from './audio/audio';
import type { Music } from './audio/music';
import { playSfx } from './audio/sfx';
import { Particles } from './effects/particles';
import { FloatTexts } from './effects/floatText';
import { Combo } from './combat/combo';
import { SKILLS, SKILL_BY_ID } from './meta/skills';
import { NEIGONGS, NEIGONG_BY_ID } from './meta/neigong';
import { applyHit, resolveHits, type Target } from './combat/resolver';
import type { AttackDef } from './combat/types';
import { SUPER_FINAL, SUPER_SLASH } from './combat/playerMoves';
import { Player } from './entities/player';
import type { Enemy } from './entities/enemies/enemy';
import { getEnemy } from './entities/enemies/factory';
import type { Gargoyle } from './entities/boss/gargoyle';
import type { Projectile } from './entities/projectile';
import { Potion, spawnLootBurst, vacuumLoot, type PickupOpts } from './entities/pickup';
import { Chest, spawnBossChests } from './entities/chest';
import { Director } from './level/director';
import { findBeat, fireBeat } from './level/narrative';
import type { Fighter } from './entities/fighter';
import type { V } from './engine/math';
import { rand } from './engine/math';
import type { Progression } from './meta/progression';
import type { RunMods, RunRewards } from './meta/types';
import { pickAffixForAct, collectStageAffixBias, AFFIX_BY_ID, affixDisplayName, tickAffix, type AffixId } from './level/affixes';
import { tickHazards } from './level/eliteMods';
import {
  emptyFragments, tryAddFragment, clearFragments, fragmentDropChance, rollFragmentId,
  FRAGMENT_BY_ID, type FragmentRuntime, type FragmentId,
} from './meta/runFragments';
import { TALISMAN_BY_ID, TALISMANS, isTalismanId, type TalismanId } from './meta/talismans';
import { TalismanScriptPlayer } from './meta/talismanScripts';
import { AnimScriptPlayer } from './meta/animScripts';
import { spawnStageProps, tickProps, hitProps, type WorldProp } from './level/props';
import {
  emptyRunEvents, tickRunEvents, openBetweenActEvent, applyBetweenChoice, useOutpost,
  scribeTempTalisman, queueEliteEvolve as enqueueEliteEvolve, type RunEventState,
} from './level/runEvents';
import { getTempScribeId } from './meta/pluginConfig';

import { actPool } from './level/actPools';
import { startAnhun, failAnhun, tryCompleteAnhun, type AnhunRuntime } from './level/objectives';
import { maybeEvolveAffix, pickSecondaryAffix } from './level/affixes';
import { codexDiscover } from './meta/codex';


export interface Stats { time: number; maxCombo: number; parries: number; dodges: number; kills: number; damageTaken: number; hits: number; crystals: number }

export type GameEvent = { type: 'gameover'; stats: Stats; rewards: RunRewards } | { type: 'victory'; stats: Stats; rewards: RunRewards };

export interface GameOptions {
  boss?: boolean;
  debug?: boolean;
  god?: boolean;
  touch?: boolean;
  mods?: RunMods;
  meta?: Progression;
  /** 0-based act to start (default 0). Clamped to unlocked when meta present. */
  act?: number;
  /** Hub 训练场 — no run progress. */
  training?: boolean;
}

/** Standalone simulation: owns entities, combat, camera, level flow. No DOM UI. */
export class Game {
  player: Player;
  enemies: Enemy[] = [];
  platforms: Platform[] = [];
  stage: StageDef;
  actIndex = 0;
  boss: Gargoyle | null = null;
  projectiles: Projectile[] = [];
  pickups: Potion[] = [];
  chests: Chest[] = [];
  fx = new Particles();
  texts = new FloatTexts();
  cam = new Camera();
  combo = new Combo();
  director: Director;
  stats: Stats = { time: 0, maxCombo: 0, parries: 0, dodges: 0, kills: 0, damageTaken: 0, hits: 0, crystals: 0 };
  meta: Progression | null = null;
  lastRewards: RunRewards | null = null;
  bounds = { min: 0, max: 5800 };
  locked = false;
  tick = 0;
  playTime = 0;
  hitstop = 0;
  private slowF = 1;
  private slowT = 0;
  private slowAcc = 0;
  flashA = 0;
  flashColor = '#fff';
  superDark = 0;
  superFreeze = false;
  bloodMoon = 0;
  /** Soft theme blend 0..1 toward act backdrop. */
  themeBlend = 1;
  banner: { text: string; sub: string; t: number; max: number } | null = null;
  /** Active stage affix for this act (stable within run). */
  stageAffix: AffixId | null = null;
  /** Affixes identified this run (fog-until-known). */
  knownAffixes: AffixId[] = [];
  /** Soft toast for affix on arena enter. */
  affixToastT = 0;
  /** 安魂钟 weak-trash window. */
  affixBellWeak = false;
  /** 清雾符: suppress stage affix DOT / yin fire. */
  affixSuppressT = 0;
  /** 驱邪符: suppress elite mods briefly. */
  eliteSuppressT = 0;
  /** Active 灵符 data-script casts (multi-frame volleys). */
  talismanScripts = new TalismanScriptPlayer();
  /** Skill/talisman look-only AnimStep interpreter. */
  animScripts = new AnimScriptPlayer();
  /** DOT / fire zones from elite 邪火 etc. */
  hazards: Array<{
    x: number; y: number; r: number; ttl: number; tick: number;
    color: string; label: string; dmg: number; period: number;
  }> = [];
  /** In-run 心法残页 (cleared on settle). */
  fragments: FragmentRuntime = emptyFragments();
  /** Env props (barrel / brazier / bell). */
  props: WorldProp[] = [];
  bellStrikeT = 0;
  /** Between-act / tide / outpost. */
  runEvents: RunEventState = emptyRunEvents(0);
  pausedForEvent = false;
  betweenEventDone = false;
  pendingCurseCleanse = false;
  tempTalismanScribed = false;
  anhun: AnhunRuntime | null = null;
  stageAffixSecondary: import('./level/affixes').AffixId | null = null;
  affixEvolved = false;
  storyCard: { title: string; body: string; t: number } | null = null;
  training = false;
  runExecutes = 0;
  runBengdao = 0;
  /** Execute prompt target uid index into enemies/boss. */
  executePromptT = 0;
  ended = false;
  debug: boolean;
  touchMode: boolean;
  private endTimer = -1;
  /** Boss chests spawned; victory deferred until all opened (or safety timeout). */
  private awaitingChests = false;
  private chestSafetyT = -1;
  /** After mid-act chests: transition instead of campaign victory. */
  private pendingActAdvance = false;
  private pendingEvent: GameEvent | null = null;
  private listeners: Array<(e: GameEvent) => void> = [];

  constructor(public input: Input, public audio: AudioEngine, public music: Music, public opts: GameOptions = {}) {
    this.debug = !!opts.debug;
    this.touchMode = !!opts.touch;
    // Touch/mobile: disable camera punch-zoom so combos never crop the virtual stick.
    // Desktop keeps a mild punch for hit feel.
    this.cam.punchCap = this.touchMode ? 1 : 1.05;
    this.training = !!(opts as GameOptions & { training?: boolean }).training;
    this.meta = opts.meta ?? null;
    const mods = opts.mods ?? (this.meta ? this.meta.mods() : undefined);
    let act = opts.act ?? 0;
    if (opts.boss && opts.act == null) {
      // ?boss=1 (no ?act) → boss of highest unlocked act; with ?act=N uses that act's boss
      act = this.meta ? this.meta.bossJumpAct() : actCount() - 1;
    }
    act = Math.max(0, Math.min(actCount() - 1, act | 0));
    this.actIndex = act;
    if (this.meta) this.meta._lootAct = act;
    this.stage = getChapter(act);
    this.platforms = this.stage.platforms;
    this.bounds = { min: 0, max: this.stage.length };
    const startX = opts.boss ? this.stage.boss.x0 + 160 : this.stage.start;
    this.player = new Player(startX, mods);
    this.player.god = !!opts.god || this.training;
    if (this.meta && !this.training) {
      const leg = this.meta.consumeLegacyChoice();
      if (leg === 'boon') {
        this.player.hp = this.player.maxHp;
        this.player.neili = this.player.maxNeili;
        this.showBanner('残念', '遗产·稳行：满血满内启程', 90);
      } else if (leg === 'risk') {
        // harder: bump enemy scale soft
        this.player.mods.enemyScale *= 1.12;
        this.showBanner('残念', '遗产·险途：敌势更凶', 90);
      }
    }
    this.director = new Director(this.stage, !!opts.boss);
    this.applyActAffix(act);
    this.runEvents = emptyRunEvents(act);
    spawnStageProps(this);
    this.cam.x = Math.max(0, startX - VIEW_WW * 0.4);
    this.cam.y = 0;
    this.cam.setBounds(0, this.stage.length);
    // starting potions from hub shop
    if (mods && mods.startPotions > 0) {
      for (let i = 0; i < mods.startPotions; i++) {
        this.pickups.push(new Potion(startX + 40 + i * 28, GROUND_Y - 80, 30));
      }
    }
    if (opts.boss) { this.player.rage = 100; this.director.enterBoss(this); }
    else {
      const enter = findBeat(this.stage.beats, 'enter');
      if (enter) fireBeat(this, enter);
      else this.showBanner(this.stage.title, this.stage.subtitle, 200);
      // Reveal act affix shortly after enter banner
      this.toastAffix();
    }
  }

  get backdropTheme(): BackdropTheme { return this.stage.backdropTheme; }

  on(fn: (e: GameEvent) => void): void { this.listeners.push(fn); }

  targets(): Target[] {
    const t: Target[] = this.enemies;
    return this.boss ? [...t, this.boss] : t;
  }

  setBounds(min: number, max: number, locked: boolean): void {
    this.bounds.min = min;
    this.bounds.max = max;
    this.locked = locked;
    this.cam.setBounds(min, max);
  }

  showBanner(text: string, sub: string, dur = 150): void { this.banner = { text, sub, t: dur, max: dur }; }
  flashScreen(color: string, a: number): void { this.flashColor = color; this.flashA = Math.max(this.flashA, a); }

  applyActAffix(actIndex: number): void {
    const bias = collectStageAffixBias(this.stage.arenas);
    this.stageAffix = pickAffixForAct(actIndex, bias);
    this.stageAffixSecondary = pickSecondaryAffix(this.stageAffix!, actIndex);
    this.affixEvolved = false;
    this.affixBellWeak = false;
    this.anhun = startAnhun(actIndex);
    const pool = actPool(actIndex);
    this.storyCard = { title: `第${actIndex + 1}幕`, body: pool.loreLine, t: 160 };
  }

  stageAffixLabel(): string {
    if (!this.stageAffix) return '';
    const known = this.knownAffixes.includes(this.stageAffix);
    let s = affixDisplayName(this.stageAffix, known);
    if (this.stageAffixSecondary) {
      const k2 = this.knownAffixes.includes(this.stageAffixSecondary);
      s += ' · ' + affixDisplayName(this.stageAffixSecondary, k2);
    }
    return s;
  }

  /** Reveal affix + brief toast (arena enter / act start). */
  toastAffix(): void {
    if (!this.stageAffix) return;
    if (!this.knownAffixes.includes(this.stageAffix)) this.knownAffixes.push(this.stageAffix);
    this.affixToastT = 120;
    const d = AFFIX_BY_ID[this.stageAffix];
    this.texts.add(`场地·${d.name}`, this.player.x, this.player.y - 140, d.color, 16);
  }

  tryPickupFragment(id: FragmentId): 'added' | 'full' | 'dup' | 'tag' {
    const r = tryAddFragment(this.fragments, id);
    const def = FRAGMENT_BY_ID[id];
    if (r === 'added' && def) {
      this.showBanner('心法残页', def.name, 100);
      this.texts.add(def.name, this.player.x, this.player.y - 120, def.color, 18, true);
      if (this.meta) {
        const c = this.meta.ensureCodex();
        codexDiscover(c.fragments, id);
        this.meta.mark();
      }
    } else if (r === 'full') {
      this.texts.add('残页已满', this.player.x, this.player.y - 110, '#c8a0a8', 14);
    } else if (r === 'tag') {
      this.texts.add('与已有残页相冲', this.player.x, this.player.y - 110, '#c8a0a8', 14);
    } else if (def) {
      this.texts.add('已持有', this.player.x, this.player.y - 110, def.color, 14);
    }
    return r;
  }

  applyTalisman(id: TalismanId): void {
    const def = TALISMAN_BY_ID[id];
    if (!def) return;
    this.talismanScripts.start(this, id, def);
  }




  /** 处决：破势或低血时按 技(I) 确认. */
  tryExecute(): void {
    if (this.ended || this.pausedForEvent) return;
    const p = this.player;
    let target: import('./entities/fighter').Fighter | null = null;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const low = e.hp / e.maxHp <= 0.22;
      const stag = e.state === 'stagger' || e.state === 'parried';
      if ((low || stag) && Math.abs(e.x - p.x) < 90) { target = e; break; }
    }
    if (!target && this.boss && !this.boss.dead) {
      const b = this.boss;
      const low = b.hp / b.maxHp <= 0.18;
      const stag = b.state === 'stagger';
      if ((low || stag) && Math.abs(b.x - p.x) < 110) target = b;
    }
    if (!target) { this.executePromptT = 0; return; }
    this.executePromptT = 2;
    if (!this.input.consume('skill')) return;
    const dir = target.x >= p.x ? 1 : -1;
    p.facing = dir as 1 | -1;
    p.invuln = Math.max(p.invuln, 40);
    p.addRage(12);
    const def: AttackDef = {
      name: 'execute', startup: 0, active: 1, recovery: 0,
      box: { x: 0, y: 0, w: 0, h: 0 },
      damage: Math.max(28, Math.round(target.maxHp * 0.35)),
      kbX: 8, kbY: -6, hitstun: 40, hitstop: 14, shake: 12,
      knockdown: true, heavy: true, ultimate: true,
    };
    applyHit(this, p, target, def, { x: target.x, y: target.y - 40 }, dir);
    this.runExecutes++;
    this.texts.add('处决!', target.x, target.y - 140, '#ffd27a', 28, true);
    if (this.runExecutes >= 5) this.meta?.unlockTitle('chujue');
    this.showBanner('处决', '一击了结', 60);
    this.slowmo(0.35, 36);
    this.flashScreen('#fff0c0', 0.45);
    playSfx(this.audio, 'heavy');
  }


  /** Apply 幕间三选一 from keyboard, touch pills, or canvas card tap. */
  pickBetweenChoice(index: number): void {
    if (!this.pausedForEvent || !this.runEvents.between) return;
    applyBetweenChoice(this, index);
    if (!this.pausedForEvent && this.director.phase === 'transition') this.betweenEventDone = true;
  }



  queueEliteEvolve(e: Enemy): void {
    enqueueEliteEvolve(this, e);
  }

  smashPropsNearHit(): void {
    const hb = this.player.hitbox();
    if (!hb || !this.player.atk) return;
    const dmg = Math.max(6, Math.round((this.player.atk.def.damage || 8) * 0.8));
    hitProps(this, hb.x + hb.w / 2, hb.y + hb.h / 2, 40, dmg, this.player.facing);
  }

  slowmo(f: number, frames: number): void { this.slowF = f; this.slowT = Math.max(this.slowT, frames); }

  /** Limit simultaneous enemy attackers so crowds stay fair. */
  attackToken(e: Enemy): boolean {
    const busy = this.enemies.filter((o) => o !== e && ['attack', 'bang', 'charge', 'aim'].includes(o.state)).length;
    return busy < 2;
  }

  applyHitTo(a: Fighter | null, t: Fighter, def: AttackDef, pt: V): void { applyHit(this, a, t, def, pt); }

  /** Radial hit for shockwaves (plunge landing, boss dive). */
  areaHit(src: Fighter, x: number, y: number, rx: number, ry: number, def: AttackDef): void {
    const list: Fighter[] = src.team === 'player' ? this.targets() : [this.player];
    for (const t of list) {
      if (t.dead) continue;
      const hb = t.hurtbox();
      if (!hb) continue;
      const cx = hb.x + hb.w / 2, cy = hb.y + hb.h / 2;
      if (Math.abs(cx - x) < rx + hb.w / 2 && Math.abs(cy - y) < ry + hb.h / 2) {
        applyHit(this, null, t, def, { x: cx, y: cy }, cx >= x ? 1 : -1);
      }
    }
  }

  // ---------------- super move ----------------
  beginSuper(): void {
    this.superFreeze = true;
    this.flashScreen('#ff1030', 0.6);
    this.cam.punch(1.12);
    this.cam.shake(6, 20);
    this.showBanner('天绝一剑', '气势解放 —— 剑气纵横八荒', 80);
    playSfx(this.audio, 'super');
  }

  private superTargets(): Target[] {
    return this.targets().filter((e) => !e.dead && e.x > this.cam.x - 40 && e.x < this.cam.x + VIEW_WW + 40);
  }

  superSlash(i: number): void {
    const y0 = 80 + rand(0, 120);
    const dir = i % 2 ? 1 : -1;
    this.fx.slashLine(this.cam.x + (dir > 0 ? -50 : VIEW_WW + 50), y0, this.cam.x + (dir > 0 ? VIEW_WW + 50 : -50), GROUND_Y - rand(0, 140), i % 2 ? '#e8f4ff' : '#ff4060', 16, 10);
    this.fx.swordQi(this.player.x, this.player.y - 60 - (i % 3) * 20, dir, true);
    this.cam.shake(5, 6);
    playSfx(this.audio, 'superSlash');
    for (const e of this.superTargets()) {
      const hb = e.hurtbox();
      const pt = hb ? { x: hb.x + hb.w / 2 + rand(-10, 10), y: hb.y + hb.h * 0.4 + rand(-10, 10) } : { x: e.x, y: e.y - 40 };
      applyHit(this, this.player, e, SUPER_SLASH, pt, e.x >= this.player.x ? 1 : -1);
    }
  }

  superFinal(): void {
    this.superFreeze = false;
    this.flashScreen('#ffffff', 0.9);
    this.cam.shake(16, 30);
    for (const e of this.superTargets()) {
      applyHit(this, this.player, e, SUPER_FINAL, { x: e.x, y: e.y - 50 }, e.x >= this.player.x ? 1 : -1);
      this.fx.flare(e.x, e.y - 50, 140, '#c01828', 20);
      this.fx.swordQi(e.x, e.y - 50, e.x >= this.player.x ? 1 : -1, true);
    }
    this.fx.ring(this.player.x, this.player.y - 50, 400, '#ff3050', 30);
    playSfx(this.audio, 'boom');
  }

  endSuper(): void { this.superFreeze = false; }

  // ---------------- events ----------------
  onEnemyKilled(e: Enemy): void {
    this.stats.kills++;
    if (this.meta && e.eliteMod) {
      const c = this.meta.ensureCodex();
      codexDiscover(c.elites, e.eliteMod);
      this.meta.mark();
    }
    if (this.meta) {
      const elite = !!e.eliteMod;
      const defId = e.archetypeId ?? e.kind;
      const enemyDef = getEnemy(defId);
      const isBoss = !!enemyDef?.isBoss;
      const r = this.meta.onKill(e.maxHp, elite, isBoss);
      this.stats.crystals = this.meta.runCrystals;
      const burst: PickupOpts[] = [];
      if (r.orb > 0) burst.push({ kind: 'crystal', amount: r.orb });
      for (const mid of r.materials) burst.push({ kind: 'material', materialId: mid });
      if (r.blueprint) burst.push({ kind: 'blueprint', blueprintId: r.blueprint });
      if (r.gear) burst.push({ kind: 'gear', gear: r.gear });
      // Per-enemy loot table（图纸/装备/丹方仅精英或 Boss；软缺 id 跳过）
      const table = this.meta.rollEnemyDefLoot(enemyDef, { elite, boss: isBoss });
      for (const p of table.pickups) burst.push(p);
      for (const b of table.banners) this.showBanner(b.title, b.sub, 100);
      if (burst.length) spawnLootBurst(this, e.x, e.y - 40, burst);
      // Global rare combat 秘籍 → rank 1 (fallback; enemy table is additional)
      if (Math.random() < 0.028) {
        const locked = SKILLS.map((s) => s.id).filter((id) => !this.meta!.hasSkill(id));
        if (locked.length) {
          const sid = locked[Math.floor(Math.random() * locked.length)]!;
          this.meta.unlockSkillDrop(sid);
          this.showBanner('武学秘籍', SKILL_BY_ID[sid].name, 100);
        }
      }
      // Global rare 心法秘籍 — live catalog (same pattern as skills)
      if (Math.random() < 0.015) {
        const locked = NEIGONGS.map((n) => n.id).filter((id) => !this.meta!.knowsNeigong(id));
        if (locked.length) {
          const nid = locked[Math.floor(Math.random() * locked.length)]!;
          this.meta.unlockNeigongDrop(nid);
          this.showBanner('心法秘籍', NEIGONG_BY_ID[nid]?.name ?? nid, 110);
        }
      }
      for (const id of this.meta.onKillProf()) {
        this.showBanner('熟练度提升', SKILL_BY_ID[id]?.name ?? id, 90);
      }
    }
    if (Math.random() < e.dropChance || (this.player.hp < 35 && Math.random() < 0.5)) {
      this.pickups.push(new Potion(e.x, e.y - 40));
    }
    // 局内心法残页 (elite-biased); only if under cap
    if (this.fragments.active.length < 2 && Math.random() < fragmentDropChance(!!e.eliteMod)) {
      const fid = rollFragmentId(this.fragments.active);
      if (fid) {
        spawnLootBurst(this, e.x, e.y - 36, [{ kind: 'fragment', fragmentId: fid }]);
      }
    }
  }

  private finish(victory: boolean): void {
    this.stats.time = this.playTime;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo.best);
    // Open any remaining boss chests so their loot banks (death / safety / victory).
    for (const c of this.chests) {
      if (!c.opened && !c.dead) c.forceOpen(this);
    }
    this.awaitingChests = false;
    this.chestSafetyT = -1;
    vacuumLoot(this);
    clearFragments(this.fragments);
    if (this.training) {
      this.lastRewards = { crystals: 0, kills: this.stats.kills, parries: this.stats.parries, victory, loot: { materials: {}, blueprints: [], gear: 0 } };
      this.pendingEvent = victory
        ? { type: 'victory', stats: { ...this.stats }, rewards: this.lastRewards }
        : { type: 'gameover', stats: { ...this.stats }, rewards: this.lastRewards };
      return;
    }
    if (this.pendingCurseCleanse && this.meta) {
      this.meta.data.pendingCurseCleanse = true;
      this.meta.mark();
    }
    if (victory && this.meta && !this.training) {
      if (this.stats.damageTaken === 0) this.meta.unlockTitle('wushang');
      if (this.runEvents.tideCleared) this.meta.unlockTitle('chaoxi');
      if (this.runBengdao === 0) this.meta.unlockTitle('lingbeng');
      if (this.anhun?.done) this.meta.unlockTitle('anhun');
    }
    // codex: bank known affixes
    if (this.meta) {
      const c = this.meta.ensureCodex();
      for (const a of this.knownAffixes) {
        codexDiscover(c.affixes, a);
      }
      this.meta.mark();
    }
    const rewards = this.meta
      ? this.meta.settle(victory)
      : { crystals: 0, kills: this.stats.kills, parries: this.stats.parries, victory, loot: { materials: {}, blueprints: [], gear: 0 } };
    rewards.kills = this.stats.kills;
    this.stats.crystals = rewards.crystals;
    this.lastRewards = rewards;
    this.pendingEvent = victory
      ? { type: 'victory', stats: { ...this.stats }, rewards }
      : { type: 'gameover', stats: { ...this.stats }, rewards };
  }

  onPlayerDeath(): void {
    if (this.ended) return;
    this.ended = true;
    this.endTimer = 90;
    this.finish(false);
    this.slowmo(0.4, 60);
    playSfx(this.audio, 'death');
  }

  onBossDying(): void {
    this.slowmo(0.3, 90);
    this.flashScreen('#ffffff', 0.7);
    this.cam.punch(1.1);
    this.texts.add('终结', this.boss!.x, this.boss!.y - 180, '#ffd27a', 40, true);
  }

  onBossDefeated(): void {
    if (this.ended || this.awaitingChests) return;
    this.director.phase = 'done';
    const bx = this.boss?.x ?? this.player.x;
    const by = this.boss?.y ?? GROUND_Y;
    spawnBossChests(this, bx, by);
    this.awaitingChests = true;
    this.chestSafetyT = 60 * 45; // ~45s safety
    this.showBanner('开启宝箱', '开启全部宝箱以领取战利品', 160);
    this.texts.add('宝箱', bx, by - 140, '#ffd27a', 28, true);
    // Persist act clear / unlock next (even mid-campaign)
    this.meta?.onActCleared(this.actIndex);
    const lastAct = this.actIndex >= actCount() - 1;
    if (lastAct) this.music.setMode('victory');
    else this.music.setMode('stage');
  }

  /** All chests opened → advance act or campaign victory. */
  private tickChestVictory(): void {
    if (!this.awaitingChests || this.ended) return;
    if (this.chestSafetyT > 0) this.chestSafetyT--;
    const pending = this.chests.filter((c) => !c.opened && !c.dead);
    if (this.chestSafetyT === 0 && pending.length) {
      for (const c of pending) c.forceOpen(this);
    }
    const allOpen = this.chests.length > 0 && this.chests.every((c) => c.opened || c.dead);
    const timedOut = this.chestSafetyT === 0;
    if (allOpen || timedOut) {
      this.awaitingChests = false;
      this.chestSafetyT = -1;
      vacuumLoot(this);
      if (this.actIndex >= actCount() - 1) {
        this.ended = true;
        this.endTimer = 90;
        const after = findBeat(this.stage.beats, 'afterBoss');
        fireBeat(this, after);
        this.finish(true);
      } else {
        this.pendingActAdvance = true;
        this.director.beginActTransition(this);
      }
    }
  }

  /**
   * Load next chapter in-place: swap StageDef, reset Director, teleport player,
   * clear combat entities, fire enter / betweenActs banners.
   */
  advanceAct(): void {
    if (!this.pendingActAdvance) return;
    this.pendingActAdvance = false;
    const next = this.actIndex + 1;
    if (next >= actCount()) {
      this.ended = true;
      this.endTimer = 90;
      this.finish(true);
      return;
    }
    this.actIndex = next;
    if (this.meta) this.meta._lootAct = next;
    this.stage = getChapter(next);
    this.platforms = this.stage.platforms;
    this.enemies = [];
    this.boss = null;
    this.projectiles = [];
    this.chests = [];
    this.pickups = this.pickups.filter((p) => !p.dead);
    // Soft heal between acts
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.round(this.player.maxHp * 0.35));
    this.player.body.x = this.stage.start;
    this.player.body.vx = 0;
    this.player.body.vy = 0;
    this.player.setState('idle');
    this.bounds = { min: 0, max: this.stage.length };
    this.locked = false;
    this.cam.setBounds(0, this.stage.length);
    this.cam.x = Math.max(0, this.stage.start - VIEW_WW * 0.4);
    this.cam.y = 0;
    this.themeBlend = 0;
    this.director.resetForStage(this.stage, false);
    this.hazards = [];
    this.applyActAffix(next);
    this.runEvents = emptyRunEvents(next);
    spawnStageProps(this);
    this.music.setMode('stage');
    this.flashScreen('#0a1020', 0.55);
    this.toastAffix();
    // Enter beat after a short gap so betweenActs banner can show first
    const enter = findBeat(this.stage.beats, 'enter');
    if (enter) {
      // Slightly shorter so it follows the betweenActs hold
      const hold = Math.max(100, (enter.holdFrames ?? 160) - 20);
      this.showBanner(enter.title, enter.subtitle ?? this.stage.subtitle, hold);
    } else {
      this.showBanner(this.stage.title, this.stage.subtitle, 160);
    }
  }

  /** Title-screen idle animation: slow camera drift, ambient particles. */
  attract(): void {
    this.tick++;
    this.player.t++;
    this.cam.x += 0.35;
    this.cam.update();
    this.fx.update();
    if (this.tick % 7 === 0) {
      this.fx.spawn({ kind: 'mote', x: this.cam.x + Math.random() * VIEW_WW, y: GROUND_Y - Math.random() * 300, vx: rand(-0.3, 0.3), vy: rand(-0.4, -0.1), life: 160, size: rand(1, 2), color: Math.random() < 0.5 ? '#c090ff' : '#ff8090', add: true });
    }
  }

  // ---------------- simulation ----------------
  update(): void {
    this.tick++;
    this.cam.update();
    this.fx.update();
    this.texts.update();
    this.combo.update();
    if (this.flashA > 0) this.flashA *= 0.88;
    if (this.banner && this.banner.t > 0) this.banner.t--;
    this.superDark += ((this.player.state === 'super' ? 1 : 0) - this.superDark) * 0.15;
    this.bloodMoon += ((this.boss ? (this.boss.phase === 2 ? 1 : 0.55) : 0) - this.bloodMoon) * 0.02;
    if (this.themeBlend < 1) this.themeBlend = Math.min(1, this.themeBlend + 0.02);
    if (this.endTimer > 0 && --this.endTimer === 0 && this.pendingEvent) {
      const ev = this.pendingEvent;
      this.pendingEvent = null;
      for (const l of this.listeners) l(ev);
    }
    if (this.hitstop > 0) { this.hitstop--; return; }
    if (this.slowT > 0) {
      this.slowT--;
      this.slowAcc += this.slowF;
      if (this.slowAcc < 1) return;
      this.slowAcc -= 1;
    }
    this.step();
  }

  private step(): void {
    // 幕间三选一
    if (this.pausedForEvent && this.runEvents.between) {
      if (this.input.consume('pill0')) this.pickBetweenChoice(0);
      else if (this.input.consume('pill1')) this.pickBetweenChoice(1);
      else if (this.input.consume('pill2')) this.pickBetweenChoice(2);
      this.input.tick();
      return;
    }
    // 据点
    if (this.runEvents.outpostOpen && !this.runEvents.outpostUsed) {
      if (this.input.consume('pill0')) useOutpost(this, 'pill');
      else if (this.input.consume('pill1')) useOutpost(this, 'identify');
      else if (this.input.consume('pill2')) useOutpost(this, 'lore');
    }
    // 处决优先于 ↓+技 临时符，避免摇杆微下偏吞掉处决键
    this.tryExecute();
    // 临时符：按 skill 键在据点外花材料刻符（仅一次/局）
    if (!this.tempTalismanScribed && this.input.pressed('skill') && this.input.down('down') && this.meta) {
      this.input.consume('skill');
      const sid = (() => {
        const cfg = getTempScribeId();
        if (cfg && isTalismanId(cfg)) return cfg;
        const known = this.meta?.data.knownTalismans?.[0];
        if (known && isTalismanId(known)) return known;
        return TALISMANS[0]?.id;
      })();
      if (!sid) {
        this.texts.add('未携符箓', this.player.x, this.player.y - 110, '#c8a0a8', 12);
      } else {
        const r = scribeTempTalisman(this, sid);
        if (r !== true) this.texts.add(String(r), this.player.x, this.player.y - 110, '#c8a0a8', 12);
      }
    }
    if (!this.ended || this.player.state !== 'dead') this.playTime++;
    this.player.update(this);
    this.talismanScripts.update(this);
    this.animScripts.update(this);
    if (!this.superFreeze) {
      for (const e of this.enemies) e.update(this);
      this.boss?.update(this);
      for (const pr of this.projectiles) pr.update(this);
    }
    this.separate();
    resolveHits(this);
    this.smashPropsNearHit();
    for (const p of this.pickups) p.update(this);
    for (const c of this.chests) c.update(this);
    if (this.affixSuppressT > 0) this.affixSuppressT--;
    if (this.eliteSuppressT > 0) this.eliteSuppressT--;
    tickAffix(this);
    tickHazards(this);
    tickProps(this);
    tickRunEvents(this);
    tryCompleteAnhun(this);
    if (this.storyCard && this.storyCard.t > 0) this.storyCard.t--;
    if (this.anhun && !this.anhun.known && this.playTime > 60 * 25) {
      this.anhun.known = true;
      this.texts.add(`安魂·${this.anhun.goal.name}`, this.player.x, this.player.y - 130, '#d0a0ff', 14);
    }
    if (this.executePromptT > 0) this.executePromptT--;
    if (this.affixToastT > 0) this.affixToastT--;
    this.tickChestVictory();
    this.director.update(this);
    this.enemies = this.enemies.filter((e) => !e.remove);
    if (this.boss?.remove) this.boss = null;
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.pickups = this.pickups.filter((p) => !p.dead);
    this.chests = this.chests.filter((c) => !c.dead);
    this.cam.follow(this.player.x, this.player.y, this.player.facing * 50, GROUND_Y);
    // ambient motes
    if (this.tick % 9 === 0) {
      this.fx.spawn({ kind: 'mote', x: this.cam.x + Math.random() * VIEW_WW, y: GROUND_Y - Math.random() * 300, vx: rand(-0.3, 0.3), vy: rand(-0.4, -0.1), life: 160, size: rand(1, 2), color: Math.random() < 0.5 ? '#c090ff' : '#ff8090', add: true });
    }
    this.input.tick();
  }

  /** Soft push so bodies don't stack on top of each other. */
  private separate(): void {
    const list: Fighter[] = [this.player, ...this.targets()];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.dead || b.dead || !a.body.onGround || !b.body.onGround) continue;
        if (a.state === 'dash' || b.state === 'dash' || a.state === 'charge' || b.state === 'charge' || a.state === 'down' || b.state === 'down') continue;
        const min = (a.body.w + b.body.w) * 0.42;
        const dx = b.x - a.x;
        if (Math.abs(dx) < min) {
          const push = (min - Math.abs(dx)) * 0.25 * (dx >= 0 ? 1 : -1);
          a.body.x -= push;
          b.body.x += push;
        }
      }
    }
  }
}

