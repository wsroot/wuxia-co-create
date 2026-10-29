import type { Game } from '../game';
import { ARENA_W, type Arena, type Spawn, type StageDef } from './stage';
import { makeEnemy, makeBoss, resolveBossKit, getEnemy } from '../entities/enemies/factory';
import type { GargoyleParams } from '../entities/boss/gargoyle';
import { Potion, spawnLootBurst, vacuumLoot } from '../entities/pickup';
import { GROUND_Y } from '../engine/constants';
import { playSfx } from '../audio/sfx';
import { findBeat, fireBeat } from './narrative';
import { betweenActBeat } from './stage';
import { openBetweenActEvent } from './runEvents';
import { actPool, rollEliteModForAct } from './actPools';
import { pickAffixForAct, pickSecondaryAffix } from './affixes';
import { getDirectorBpDrop } from '../meta/pluginConfig';
import { WEAPON_BY_ID } from '../meta/weapons';

export type Phase = 'roam' | 'arena' | 'bossIntro' | 'boss' | 'done' | 'transition';

/** Gates progress: locks the camera into arenas until each wave is cleared, then the boss. */
export class Director {
  phase: Phase = 'roam';
  arenaIdx = 0;
  waveIdx = 0;
  private queue: Array<Spawn & { at: number }> = [];
  private waveDelay = 0;
  private clock = 0;
  goArrow = 0;
  /** Soft hold after afterBoss / betweenActs before chapter swap. */
  private holdT = 0;
  /** 0 = idle, 1 = after afterBoss → fire betweenActs, 2 = load next act. */
  private transitionStep = 0;

  constructor(public stage: StageDef, startAtBoss: boolean) {
    if (startAtBoss) this.arenaIdx = stage.arenas.length;
  }

  /** Swap active stage definition (chapter transition). */
  resetForStage(stage: StageDef, startAtBoss = false): void {
    this.stage = stage;
    this.phase = 'roam';
    this.arenaIdx = startAtBoss ? stage.arenas.length : 0;
    this.waveIdx = 0;
    this.queue = [];
    this.waveDelay = 0;
    this.clock = 0;
    this.goArrow = 0;
    this.holdT = 0;
    this.transitionStep = 0;
  }

  get arena(): Arena | null { return this.stage.arenas[this.arenaIdx] ?? null; }
  get totalWaves(): number { return this.arena?.waves.length ?? 0; }

  /** Rightmost point the player may roam to before the next gate triggers. */
  roamLimit(): number {
    const a = this.arena;
    return a ? a.x0 + ARENA_W : this.stage.boss.x0 + ARENA_W;
  }

  update(g: Game): void {
    this.clock++;
    if (this.goArrow > 0) this.goArrow--;
    if (this.holdT > 0) {
      this.holdT--;
      if (this.holdT <= 0 && this.transitionStep > 0) {
        if (this.transitionStep === 1) {
          // afterBoss done → betweenActs banner, then load
          const between = betweenActBeat(this.stage.actIndex);
          const r = fireBeat(g, between);
          this.holdT = r?.holdFrames ?? 100;
          this.transitionStep = 2;
        } else if (this.transitionStep === 2) {
          // 幕间三选一 — wait until player picks
          if (!g.betweenEventDone) {
            if (!g.pausedForEvent && g.runEvents.between == null) {
              openBetweenActEvent(g);
            }
            this.holdT = 2; // keep waiting
            return;
          }
          this.transitionStep = 0;
          g.betweenEventDone = false;
          g.advanceAct();
        }
      }
      return;
    }
    const p = g.player;
    switch (this.phase) {
      case 'roam': {
        g.setBounds(0, this.roamLimit(), false);
        const a = this.arena;
        if (a && p.x > a.trigger) this.enterArena(g, a);
        else if (!a && p.x > this.stage.boss.trigger) this.enterBoss(g);
        break;
      }
      case 'arena': {
        for (let i = this.queue.length - 1; i >= 0; i--) {
          const s = this.queue[i];
          if (this.clock >= s.at) {
            this.queue.splice(i, 1);
            const a = this.arena!;
            const x = s.side === 'L' ? a.x0 + 70 + Math.random() * 40 : a.x0 + ARENA_W - 70 - Math.random() * 40;
            // Later waves / denser packs more often roll 精英词条
            const eliteChance = this.waveIdx === 0 ? 0.18 : 0.38;
            const forceElite = Math.random() < eliteChance;
            g.enemies.push(makeEnemy(s.type, x, {
              scale: g.player.mods.enemyScale,
              eliteChance: 0,
              eliteMod: forceElite
                ? rollEliteModForAct(this.stage.actIndex, Math.random, a.eliteWeight ?? null)
                : null,
            }));
          }
        }
        if (this.queue.length === 0 && g.enemies.length === 0) {
          if (this.waveDelay === 0) this.waveDelay = 50;
          else if (--this.waveDelay <= 1) {
            this.waveDelay = 0;
            this.waveIdx++;
            const a = this.arena!;
            if (this.waveIdx < a.waves.length) this.startWave(g);
            else this.clearArena(g);
          }
        }
        break;
      }
      case 'bossIntro':
        if (g.boss && g.boss.state !== 'intro' && g.boss.state !== 'roarWind') this.phase = 'boss';
        break;
      case 'boss':
      case 'done':
      case 'transition':
        break;
    }
  }

  private enterArena(g: Game, a: Arena): void {
    this.phase = 'arena';
    this.waveIdx = 0;
    g.setBounds(a.x0, a.x0 + ARENA_W, true);
    // Arena.affixBias：场地偏味 — prefer listed ids ∩ primary pool (same weighted pick path)
    if (a.affixBias?.length) {
      const next = pickAffixForAct(this.stage.actIndex, a.affixBias);
      if (next && next !== g.stageAffix) {
        g.stageAffix = next;
        g.stageAffixSecondary = pickSecondaryAffix(next, this.stage.actIndex);
        g.affixEvolved = false;
      }
    }
    const aff = g.stageAffixLabel();
    g.showBanner(a.name, aff ? `第 ${this.arenaIdx + 1} 战场 · ${aff}` : `第 ${this.arenaIdx + 1} 战场`);
    g.toastAffix();
    playSfx(g.audio, 'wave');
    this.startWave(g);
  }

  private startWave(g: Game): void {
    const a = this.arena!;
    this.queue = a.waves[this.waveIdx].map((s) => ({ ...s, at: this.clock + 20 + s.delay }));
    if (this.waveIdx > 0) g.showBanner(`第 ${this.waveIdx + 1} / ${a.waves.length} 波`, '亡者再起', 90);
  }

  private clearArena(g: Game): void {
    const clearedIdx = this.arenaIdx;
    const a = this.arena!;
    this.phase = 'roam';
    this.arenaIdx++;
    this.goArrow = 240;
    const beat = findBeat(this.stage.beats, 'afterArena', clearedIdx);
    if (beat) fireBeat(g, beat);
    else g.showBanner('肃清', '继续前进 →', 110);
    playSfx(g.audio, 'wave');
    vacuumLoot(g);
    const clear = g.meta?.onArenaClear();
    g.texts.add('+15 血晶', g.player.x, g.player.y - 130, '#ff90b0', 18);
    if (clear?.materials?.length) {
      spawnLootBurst(g, g.player.x, g.player.y - 40, clear.materials.map((id) => ({ kind: 'material' as const, materialId: id })));
    }
    {
      const drop = getDirectorBpDrop();
      if (
        drop && g.meta
        && this.arenaIdx >= drop.minArenaIdx
        && WEAPON_BY_ID[drop.blueprintId]
        && !g.meta.knowsBlueprint(drop.blueprintId)
        && Math.random() < drop.chance
      ) {
        spawnLootBurst(g, g.player.x + 40, g.player.y - 40, [{ kind: 'blueprint', blueprintId: drop.blueprintId }]);
      }
    }
    // 幕偏向图纸
    {
      const lean = actPool(this.stage.actIndex).blueprintLean;
      const locked = lean.filter((id) => !g.meta?.knowsBlueprint(id));
      if (g.meta && locked.length && Math.random() < 0.04) {
        const bp = locked[Math.floor(Math.random() * locked.length)]!;
        spawnLootBurst(g, g.player.x - 30, g.player.y - 40, [{ kind: 'blueprint', blueprintId: bp }]);
      }
      const mats = actPool(this.stage.actIndex).dropLean;
      if (mats.length && Math.random() < 0.35) {
        spawnLootBurst(g, g.player.x, g.player.y - 36, [{ kind: 'material', materialId: mats[Math.floor(Math.random() * mats.length)]! }]);
      }
    }
    if (this.arenaIdx === this.stage.arenas.length) {
      g.pickups.push(new Potion(a.x0 + ARENA_W - 160, GROUND_Y - 120, 50));
    }
    // 波次肃清后偶发三选一（每幕最多一次）
    if (!g.runEvents.betweenPicked && !g.pausedForEvent && this.arenaIdx === 1 && Math.random() < 0.55) {
      openBetweenActEvent(g);
    }
  }

  enterBoss(g: Game): void {
    const b = this.stage.boss;
    this.phase = 'bossIntro';
    g.setBounds(b.x0, b.x0 + ARENA_W, true);
    const pool = actPool(this.stage.actIndex);
    const bossId = b.bossId || 'gargoyle';
    const def = getEnemy(bossId);
    // G3: stage.boss.kit → EnemyDef.kitId → actPool.kit → 'stone' (do not rewrite CORE pools)
    const kit = resolveBossKit({
      stageKit: b.kit,
      defKitId: def?.kitId,
      poolKit: pool.kit,
    });
    const params: GargoyleParams = {
      displayName: b.bossName,
      hpScale: b.hpScale,
      dmgScale: b.dmgScale,
      tint: b.tint ?? pool.tint,
      kit,
    };
    const boss = makeBoss(bossId, b.x0 + ARENA_W - 230, params);
    const sc = g.player.mods.enemyScale;
    if (sc !== 1) { boss.maxHp = Math.round(boss.maxHp * sc); boss.hp = boss.maxHp; }
    g.boss = boss;
    const beat = findBeat(this.stage.beats, 'beforeBoss');
    if (beat) fireBeat(g, beat);
    else g.showBanner(b.bossName, b.bossSubtitle, 170);
    g.music.setMode('boss');
  }

  /**
   * After boss chests are cleared: fire afterBoss (+ betweenActs if more acts),
   * then soft-hold and ask Game to advance or finish campaign.
   */
  beginActTransition(g: Game): void {
    this.phase = 'transition';
    g.betweenEventDone = false;
    g.runEvents.between = null;
    g.runEvents.betweenPicked = false;
    g.pausedForEvent = false;
    const after = findBeat(this.stage.beats, 'afterBoss');
    const r = fireBeat(g, after);
    this.holdT = r?.holdFrames ?? 120;
    this.transitionStep = 1;
  }
}
