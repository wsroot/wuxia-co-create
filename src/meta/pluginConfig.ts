/**
 * Soft config contributed by loaded 门派 plugins (not framework content ids).
 * Cleared when the owning plugin unloads via Cordis effect cleanup.
 *
 * Core reads these tables; missing / unknown ids are skipped at use sites.
 */
import type { MaterialBag } from './materials';

/** One soft loot entry (same spirit as EnemyDef.loot). */
export interface SoftLootEntry {
  kind: 'crystal' | 'material' | 'blueprint' | 'gear';
  id?: string;
  amount?: number;
  materialN?: number;
}

export interface DirectorBpDrop {
  /** Soft weapon / blueprint id. */
  blueprintId: string;
  /** Fire when arenaIdx >= this (post-clear index). */
  minArenaIdx: number;
  chance: number;
}

export interface TideSpawnEntry {
  /** Soft enemy catalog id. */
  enemyId: string;
  dx: number;
  eliteChance: number;
}

let tempScribeId: string | null = null;
let tempScribeCost: MaterialBag | null = null;
let bossChestGuaranteeBp: string | null = null;
let directorBpDrop: DirectorBpDrop | null = null;
let tideClearLoot: SoftLootEntry[] = [];
let tideSpawn: TideSpawnEntry[] = [];

export function setTempScribeId(id: string | null | undefined): void {
  tempScribeId = id && id.length ? id : null;
}
export function getTempScribeId(): string | null {
  return tempScribeId;
}

export function setTempScribeCost(cost: MaterialBag | null | undefined): void {
  tempScribeCost = cost && Object.keys(cost).length ? { ...cost } : null;
}
export function getTempScribeCost(): MaterialBag | null {
  return tempScribeCost;
}

export function setBossChestGuaranteeBp(id: string | null | undefined): void {
  bossChestGuaranteeBp = id && id.length ? id : null;
}
export function getBossChestGuaranteeBp(): string | null {
  return bossChestGuaranteeBp;
}

export function setDirectorBpDrop(cfg: DirectorBpDrop | null | undefined): void {
  directorBpDrop = cfg?.blueprintId ? { ...cfg } : null;
}
export function getDirectorBpDrop(): DirectorBpDrop | null {
  return directorBpDrop;
}

export function setTideClearLoot(entries: SoftLootEntry[] | null | undefined): void {
  tideClearLoot = entries ? entries.slice() : [];
}
export function getTideClearLoot(): SoftLootEntry[] {
  return tideClearLoot;
}

export function setTideSpawn(entries: TideSpawnEntry[] | null | undefined): void {
  tideSpawn = entries ? entries.slice() : [];
}
export function getTideSpawn(): TideSpawnEntry[] {
  return tideSpawn;
}

/** Clear all soft menpai run config (used on unload). */
export function clearMenpaiRunConfig(): void {
  tempScribeId = null;
  tempScribeCost = null;
  bossChestGuaranteeBp = null;
  directorBpDrop = null;
  tideClearLoot = [];
  tideSpawn = [];
}
