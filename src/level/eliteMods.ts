/**
 * 精英词条 — temporary combat modifiers on tougher non-boss enemies.
 *
 * Catalog defs register via ctx.eliteMods. Numeric / flag effects on the def
 * are applied by applyEliteMod; weaponCounters on the def drive 兵器克制.
 */
import type { Game } from '../game';
import type { AttackDef } from '../combat/types';
import type { Enemy } from '../entities/enemies/enemy';
import { getEliteMod, listEliteMods, eliteModMapView } from '../meta/contentRegistry';

/** Built-in 精英词条 ids. */
export type CoreEliteModId =
  | 'tongpi'   // 铜皮
  | 'shixue'   // 嗜血
  | 'shanbu'   // 闪步
  | 'fanshang' // 反伤
  | 'zhongji'  // 重击
  | 'xiehuo';  // 邪火

/** Runtime id — any registered elite mod. */
export type EliteModId = string;

/** Per-category weapon counter tagged on an elite mod. */
export interface EliteWeaponCounter {
  category: import('../meta/weapons').WeaponCategory;
  label: string;
  /** Extra damage multiplier (1.15 = +15%). */
  dmgMul: number;
  /** Extra poise damage mul. */
  poiseMul: number;
  cancelShanbu?: boolean;
  ignoreReflect?: boolean;
  pierceTongpi?: boolean;
}

export interface EliteModDef {
  id: EliteModId;
  name: string;
  color: string;
  /** Short HUD / float tag. */
  tag: string;
  /** Incoming damage multiplier (铜皮). */
  dmgTakenMul?: number;
  /** Reflect fraction of damage taken (反伤). */
  reflect?: number;
  /** On-hit lifesteal (嗜血). */
  lifesteal?: number;
  /** Outgoing damage multiplier (重击). */
  heavyMul?: number;
  /** Attack startup multiplier (重击). */
  startupMul?: number;
  /** Enable 闪步 dash-away tick. */
  dashAway?: boolean;
  /** Spawn 邪火 hazard on death / periodic. */
  fireOnDeath?: boolean;
  /** Summon a minion periodically (重击). */
  summonMinion?: boolean;
  /** Soft enemy catalog id to summon when summonMinion (skip if missing). */
  summonEnemyId?: string;
  /** Spawn fire zone near player periodically (邪火). */
  summonFire?: boolean;
  /** 兵器克制 entries — combat reads matching category. */
  weaponCounters?: EliteWeaponCounter[];
}

/** Built-in 精英词条 — registered by the official 内容包 (src/content/core). */
/** Oc5: isCore* 查官方包 id 集（字面量在 changye/seeds；不对外 re-export）。 */
import { CORE_ELITE_MODS } from '../content/changye/seeds/eliteMods';

/** Live catalog backed by ctx.eliteMods. */
export const ELITE_MODS: EliteModDef[] = listEliteMods();
export const ELITE_MOD_BY_ID: Record<string, EliteModDef> = eliteModMapView();

export function isEliteModId(id: string): id is EliteModId {
  return getEliteMod(id) !== undefined;
}

export function isCoreEliteModId(id: string): id is CoreEliteModId {
  return CORE_ELITE_MODS.some((m) => m.id === id);
}

export { getEliteMod, listEliteMods };

/** Chance an eligible spawn becomes elite with a modifier. */
export const ELITE_CHANCE = 0.32;

export function rollEliteMod(rng = Math.random): EliteModId {
  const i = Math.floor(rng() * ELITE_MODS.length);
  return ELITE_MODS[Math.max(0, Math.min(ELITE_MODS.length - 1, i))]!.id;
}

/** Apply modifier stats/behavior baseline onto a freshly spawned enemy. */
export function applyEliteMod(e: Enemy, id: EliteModId): void {
  e.eliteMod = id;
  const def = ELITE_MOD_BY_ID[id];
  const tag = def?.tag ?? id;
  e.scoreName = `${e.scoreName}·${tag}`;
  // Toughness bump for elites (loot uses eliteMod flag, not HP gate)
  e.maxHp = Math.round(e.maxHp * 1.45);
  e.hp = e.maxHp;
  e.dropChance = Math.min(0.55, e.dropChance + 0.12);
  // Short 架势条 (shorter than boss)
  e.poiseMax = 48;
  e.poise = 48;
  e.hasElitePoise = true;

  if (!def) return;
  if (def.heavyMul) e.eliteHeavyMul = def.heavyMul;
  if (def.startupMul) e.eliteStartupMul = def.startupMul;
  if (def.dmgTakenMul) e.eliteDmgTakenMul = def.dmgTakenMul;
  if (def.reflect) e.eliteReflect = def.reflect;
  if (def.lifesteal) e.eliteLifesteal = def.lifesteal;
  if (def.dashAway) e.eliteDashCd = 0;
  if (def.fireOnDeath) e.eliteFireOnDeath = true;
  if (def.summonMinion) {
    e.eliteSummonMinion = true;
    e.eliteSummonEnemyId = def.summonEnemyId ?? null;
  }
  if (def.summonFire) e.eliteSummonFire = true;
}

/** Scale outgoing attack defs for 重击 elites. */
export function scaleEliteAttack(e: Enemy, def: AttackDef): AttackDef {
  if (!e.eliteMod || !(e.eliteHeavyMul > 1)) return def;
  const mul = e.eliteHeavyMul || 1.45;
  const startMul = e.eliteStartupMul || 1.35;
  return {
    ...def,
    damage: Math.round(def.damage * mul),
    startup: Math.round(def.startup * startMul),
    kbX: def.kbX * 1.2,
    hitstun: Math.round(def.hitstun * 1.15),
    heavy: true,
  };
}

/** 闪步: short hop away when player is about to connect / periodically. */
export function tickEliteShanbu(g: Game, e: Enemy): void {
  const def = e.eliteMod ? ELITE_MOD_BY_ID[e.eliteMod] : undefined;
  if (!def?.dashAway || e.dead || e.isReacting()) return;
  if (e.eliteDashCd === undefined) e.eliteDashCd = 0;
  if (e.eliteDashCd > 0) {
    e.eliteDashCd--;
    return;
  }
  const p = g.player;
  const dist = Math.abs(p.x - e.x);
  const threat =
    (p.state === 'attack' && p.atk && p.atk.f >= Math.max(0, p.atk.def.startup - 4) && dist < 110) ||
    (dist < 70 && Math.random() < 0.02);
  if (!threat) return;
  e.eliteDashCd = 90 + Math.floor(Math.random() * 40);
  const dir = p.x >= e.x ? -1 : 1;
  e.body.vx = dir * 9;
  e.invuln = Math.max(e.invuln, 10);
  e.facing = (dir > 0 ? 1 : -1) as 1 | -1;
  g.fx.dust(e.x, e.body.y, 5, -dir);
  g.texts.add('闪步', e.x, e.y - 100, '#a090ff', 12);
}

/** Spawn a small DOT zone (邪火). */
export function spawnXiehuoZone(g: Game, x: number, y: number): void {
  g.hazards.push({
    x,
    y,
    r: 48,
    ttl: 60 * 5,
    tick: 0,
    color: '#ff6030',
    label: '邪火',
    dmg: 2,
    period: 28,
  });
}

export function tickHazards(g: Game): void {
  const p = g.player;
  for (let i = g.hazards.length - 1; i >= 0; i--) {
    const h = g.hazards[i]!;
    h.ttl--;
    h.tick++;
    if (h.ttl <= 0) {
      g.hazards.splice(i, 1);
      continue;
    }
    if (p.dead || p.god || p.invuln > 0) continue;
    const dx = p.x - h.x;
    const dy = (p.y - 40) - h.y;
    if (dx * dx + dy * dy < h.r * h.r && h.tick % h.period === 0) {
      p.hp = Math.max(1, p.hp - h.dmg);
      g.stats.damageTaken += h.dmg;
      g.texts.add(h.label, p.x, p.y - 100, h.color, 12);
    }
  }
}

export function drawHazards(ctx: CanvasRenderingContext2D, g: Game): void {
  for (const h of g.hazards) {
    const a = 0.25 + 0.12 * Math.sin(g.tick * 0.12);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = h.color;
    ctx.beginPath();
    ctx.ellipse(h.x, h.y + 8, h.r, h.r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = Math.min(0.7, a + 0.2);
    ctx.strokeStyle = h.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}
