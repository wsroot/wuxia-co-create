import type { EnemyType } from '../entities/enemies/factory';
import type { Platform } from '../physics/body';
export type { Platform };
import type { StageBeat } from './narrative';
import {
  listStages,
  listBetweenActBeats,
  getStageByActIndex,
  getBetweenActBeat,
  campaignLength,
} from '../meta/contentRegistry';

export interface Spawn { type: EnemyType; side: 'L' | 'R'; delay: number }
export interface Arena {
  name: string;
  x0: number;
  trigger: number;
  waves: Spawn[][];
  /** Jumpable rooftops / bridges in this arena (world coords). */
  platforms?: Platform[];
  /**
   * Optional affix id bias for this arena (soft preference list).
   * Director enterArena / applyActAffix → pickAffixForAct(…, bias):
   * listed ids ∩ primary pool become the weighted pick pool.
   */
  affixBias?: string[];
  /** Optional elite weight override for this arena (soft; act pool still default). */
  eliteWeight?: Record<string, number>;
}

/** Catalog BackdropDef id (soft). Core generators: night|dock|ash|eclipse. */
export type BackdropTheme = string;

export interface BossEncounter {
  /** Arena / gate name shown in roam HUD. */
  name: string;
  x0: number;
  trigger: number;
  /** Banner title for the boss. */
  bossName: string;
  /** Banner subtitle. */
  bossSubtitle: string;
  /** Boss archetype id (ctx.enemies); built-in is 'gargoyle'. */
  bossId: string;
  /** HP multiplier vs base Gargoyle. */
  hpScale: number;
  /** Attack damage multiplier. */
  dmgScale: number;
  /** Optional draw tint flag passed to Gargoyle. */
  tint?: 'jade' | 'ink' | 'blood' | 'ash';
  /**
   * Optional bossKits catalog id. G3: highest priority in enterBoss resolve
   * (stage.boss.kit → EnemyDef.kitId → actPool.kit → 'stone').
   */
  kit?: string;
}

export interface StageDef {
  /** 0-based act index. */
  actIndex: number;
  /** Stable id e.g. act1. */
  id: string;
  title: string;
  /** Opening banner subtitle. */
  subtitle: string;
  length: number;
  start: number;
  arenas: Arena[];
  boss: BossEncounter;
  platforms: Platform[];
  backdropTheme: BackdropTheme;
  beats: StageBeat[];
}

export const ARENA_W = 860;

/** Live campaign catalog (actIndex slot === list index). */
export const CHAPTERS: StageDef[] = listStages();

/** Live between-act beats (index === fromAct). */
export const BETWEEN_ACT_BEATS: StageBeat[] = listBetweenActBeats();

/** Campaign length (core 4 + any loaded 内容包 acts). */
export function actCount(): number {
  return campaignLength();
}

export function getChapter(actIndex: number): StageDef {
  return getStageByActIndex(actIndex);
}

export function betweenActBeat(fromAct: number): StageBeat | undefined {
  return getBetweenActBeat(fromAct);
}

/** All stable beat ids (for README / story tooling). */
export function listBeatIds(): string[] {
  const ids: string[] = [];
  for (const ch of CHAPTERS) {
    if (!ch) continue;
    for (const b of ch.beats) ids.push(b.id);
  }
  for (const b of BETWEEN_ACT_BEATS) {
    if (b) ids.push(b.id);
  }
  return ids;
}

export { getStageByActIndex, campaignLength } from '../meta/contentRegistry';

