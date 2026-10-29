/**
 * Enemy / Boss loadout interpreter — skills / gear / pills / talismans on EnemyDef.
 * Soft-ref catalog ids; missing → skip. No plugin JS/Canvas.
 * Gear weapons also resolve heldWeapon for silhouette mainhand override.
 * BossLoad1: attach + gear/spawn-pills + mul via LoadoutHost (Gargoyle ok).
 * BossLoad2: cast via LoadoutCaster + tryCastBossLoadout (idle/walk gap only).
 */
import type { Game } from '../../game';
import type { AttackDef } from '../../combat/types';
import { getAttackBox } from '../../meta/contentRegistry';
import { getSkill, effectsAtRank } from '../../meta/skills';
import { getPill, type PillWhileActive } from '../../meta/alchemy';
import { getTalisman } from '../../meta/talismans';
import { getArmorPiece } from '../../meta/gear';
import { getArmorSet } from '../../meta/armorSets';
import { getWeapon, type WeaponDef } from '../../meta/weapons';
import { playSfx } from '../../audio/sfx';
import type {
  EnemyDef,
  EnemyGearLoadout,
  EnemyPillLoadout,
  EnemySkillLoadout,
  EnemyTalismanLoadout,
} from './factory';
import type { Enemy } from './enemy';
import type { Fighter } from '../fighter';

const warned = new Set<string>();
function warnOnce(key: string, msg: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[enemy-loadout] ${msg}`);
}

export interface EnemyLoadoutState {
  /** Soft entries copied from EnemyDef at attach. */
  skills: EnemySkillLoadout[];
  gear: EnemyGearLoadout[];
  pills: EnemyPillLoadout[];
  talismans: EnemyTalismanLoadout[];
  skillCd: Record<string, number>;
  talismanCd: Record<string, number>;
  /** Pill indices already consumed (when once). */
  pillsUsed: Set<number>;
  /** Outgoing damage multiplier from gear / atk buff. */
  atkMul: number;
  /** Incoming damage multiplier from gear / def buff. */
  dmgTakenMul: number;
  atkBuffT: number;
  defBuffT: number;
  /** Temporary atk/def from pills while timers run. */
  buffAtkMul: number;
  buffDefMul: number;
  pillAura: PillWhileActive | null;
  pillAuraT: number;
  /** Frames before next loadout cast attempt. */
  castGate: number;
  /** First gear WeaponDef (for silhouette mainhand override). */
  heldWeapon: WeaponDef | null;
}


/**
 * Minimal host for attach / applyGear / firePills / mul helpers.
 * Enemy and Gargoyle (Fighter) both satisfy.
 */
export interface LoadoutHost {
  hp: number;
  maxHp: number;
  invuln: number;
  readonly x: number;
  readonly y: number;
  loadout: EnemyLoadoutState | null;
  /** Trash elite gate; Boss omit → elite pills never fire. */
  eliteMod?: string | null;
}

/**
 * Cast-capable host: Enemy + Gargoyle (both are Fighter).
 * Intersection keeps talisman/anim castFx typings happy without Gargoyle→Enemy.
 */
export type LoadoutCaster = Fighter & LoadoutHost & {
  cooldown: number;
  /** Trash react gate; Boss omit → treated as not reacting. */
  isReacting?(): boolean;
};

/** BossLoad2 hard gate — only these states may attempt loadout cast. */
export const BOSS_LOADOUT_CAST_STATES = ['idle', 'walk'] as const;

export function createEmptyLoadout(): EnemyLoadoutState {
  return {
    skills: [],
    gear: [],
    pills: [],
    talismans: [],
    skillCd: {},
    talismanCd: {},
    pillsUsed: new Set(),
    atkMul: 1,
    dmgTakenMul: 1,
    atkBuffT: 0,
    defBuffT: 0,
    buffAtkMul: 1,
    buffDefMul: 1,
    pillAura: null,
    pillAuraT: 0,
    castGate: 20 + ((Math.random() * 30) | 0),
    heldWeapon: null,
  };
}

/** Attach catalog loadout + apply gear stats (HP / atk / def). Call after base HP set. */
export function attachEnemyLoadout(e: LoadoutHost, def: EnemyDef | null | undefined): void {
  const lo = createEmptyLoadout();
  e.loadout = lo;
  if (!def) return;
  lo.skills = def.skills ? def.skills.slice() : [];
  lo.gear = def.gear ? def.gear.slice() : [];
  lo.pills = def.pills ? def.pills.slice() : [];
  lo.talismans = def.talismans ? def.talismans.slice() : [];
  applyGear(e, lo);
  // Spawn pills fire after attach (makeEnemy); elite pills wait for eliteMod.
  firePills(e, null, 'spawn');
}

function applyGear(e: LoadoutHost, lo: EnemyLoadoutState): void {
  let hpAdd = 0;
  let atkPct = 0;
  let defPct = 0;
  let dmgTaken = 1;
  let held: WeaponDef | null = null;

  for (const g of lo.gear) {
    if (g.id) {
      const piece = getArmorPiece(g.id);
      if (piece) {
        const b = piece.base;
        if (b.hp) hpAdd += b.hp;
        if (b.atk) atkPct += b.atk;
        if (b.def) defPct += b.def;
      } else {
        const wep = getWeapon(g.id);
        if (wep) {
          // Weapon catalog damage is a multiplier around 1.0 — fold gently.
          atkPct += (wep.damage - 1) * 100 * 0.35;
          if (!held) held = wep;
        } else {
          warnOnce(`gear:${g.id}`, `gear id「${g.id}」不在防具/兵刃目录，已跳过`);
        }
      }
    }
    if (g.setId) {
      const set = getArmorSet(g.setId);
      if (set) {
        // Soft: treat bare setId as 2-piece echo (no doll slots on trash).
        const two = set.two;
        if (two.atk) atkPct += two.atk * 100;
        if (two.def) defPct += two.def * 100;
        if (two.dmgTakenMul != null) dmgTaken *= two.dmgTakenMul;
      } else {
        warnOnce(`set:${g.setId}`, `套装 id「${g.setId}」不在目录，已跳过`);
      }
    }
  }

  if (hpAdd) {
    e.maxHp += Math.round(hpAdd);
    e.hp = e.maxHp;
  }
  lo.atkMul = 1 + atkPct / 100;
  // def% ≈ reduce incoming (same spirit as player mitigate); clamp.
  lo.dmgTakenMul = Math.max(0.55, dmgTaken * (1 - defPct / 100));
  lo.heldWeapon = held;
}

/** Scale an attack by gear + buffs. */
export function scaleLoadoutAttack(e: LoadoutHost, def: AttackDef): AttackDef {
  const lo = e.loadout;
  if (!lo) return def;
  const mul = lo.atkMul * (lo.atkBuffT > 0 ? lo.buffAtkMul : 1);
  if (mul === 1) return def;
  return { ...def, damage: Math.max(1, Math.round(def.damage * mul)) };
}

export function loadoutIncomingMul(e: LoadoutHost): number {
  const lo = e.loadout;
  if (!lo) return 1;
  return lo.dmgTakenMul * (lo.defBuffT > 0 ? lo.buffDefMul : 1);
}

function firePills(e: LoadoutHost, g: Game | null, when: 'spawn' | 'hpBelow' | 'elite'): void {
  const lo = e.loadout;
  if (!lo || !lo.pills.length) return;
  for (let i = 0; i < lo.pills.length; i++) {
    if (lo.pillsUsed.has(i)) continue;
    const entry = lo.pills[i]!;
    const w = entry.when ?? 'spawn';
    if (w !== when) continue;
    if (when === 'hpBelow') {
      const frac = entry.hpFrac ?? 0.4;
      if (e.hp / e.maxHp > frac) continue;
    }
    if (when === 'elite' && !e.eliteMod) continue;
    applyPillToEnemy(e, g, entry);
    if (entry.once !== false) lo.pillsUsed.add(i);
  }
}

function applyPillToEnemy(e: LoadoutHost, g: Game | null, entry: EnemyPillLoadout): void {
  const pill = getPill(entry.id);
  if (!pill) {
    warnOnce(`pill:${entry.id}`, `丹药「${entry.id}」不在目录，已跳过`);
    return;
  }
  const effect = pill.effect;
  if (!effect) {
    warnOnce(`pill-fx:${entry.id}`, `丹药「${entry.id}」无 effect，已跳过`);
    return;
  }
  const lo = e.loadout!;
  const sec = (n: number) => Math.round(n * 60);

  if (effect.heal != null) {
    const amt = Math.min(effect.heal, e.maxHp - e.hp);
    e.hp += amt;
    if (g) g.texts.add(`${pill.name} +${amt}`, e.x, e.y - 110, effect.floatColor ?? '#ff6a7a', 14);
  } else if (g) {
    g.texts.add(effect.floatText ?? pill.name, e.x, e.y - 110, effect.floatColor ?? '#ff6a7a', 14);
  }

  if (effect.invuln != null) e.invuln = Math.max(e.invuln, effect.invuln);

  if (effect.atkBuffSec != null) {
    lo.atkBuffT = Math.max(lo.atkBuffT, sec(effect.atkBuffSec));
    lo.buffAtkMul = 1.2;
  }
  if (effect.defBuffSec != null) {
    const t = sec(effect.defBuffSec);
    lo.defBuffT = effect.defBuffMax ? Math.max(lo.defBuffT, t) : t;
    lo.buffDefMul = 0.85;
  }

  // Player-only fields (rage/neili/stamina/armor/control/affix…): soft skip.
  if (
    effect.rage != null || effect.neili != null || effect.stamina != null ||
    effect.armor != null || effect.clearControl || effect.affixSuppressSec != null ||
    effect.porenBuffSec != null || effect.pojiaBuffSec != null ||
    effect.jingzhouSec != null || effect.baoqiSec != null ||
    effect.yingbuSec != null || effect.xuhangSec != null
  ) {
    warnOnce(`pill-partial:${entry.id}`, `丹药「${entry.id}」含敌人未映射字段，已只应用气血/无敌/攻防 buff`);
  }

  if (effect.whileActive) {
    const dur = Math.max(
      effect.atkBuffSec != null ? sec(effect.atkBuffSec) : 0,
      effect.defBuffSec != null ? sec(effect.defBuffSec) : 0,
      60,
    );
    lo.pillAura = effect.whileActive;
    lo.pillAuraT = Math.max(lo.pillAuraT, dur);
  }

  if (g) {
    const feel = effect.castFeel;
    if (feel) {
      if (feel.hitstop) g.hitstop = Math.max(g.hitstop, feel.hitstop | 0);
      if (feel.shake) g.cam.shake(feel.shake.amp, feel.shake.frames);
      if (feel.flash) g.flashScreen(feel.flash.color, feel.flash.a);
    }
    playSfx(g.audio, effect.sfx ?? 'potion');
  }
}

/** Tick loadout CDs / buffs / pills only (no cast). Used by behavior interpreter. */
export function tickEnemyLoadoutTimers(g: Game, e: LoadoutHost): void {
  const lo = e.loadout;
  if (!lo) return;
  for (const k of Object.keys(lo.skillCd)) {
    if (lo.skillCd[k]! > 0) lo.skillCd[k]!--;
  }
  for (const k of Object.keys(lo.talismanCd)) {
    if (lo.talismanCd[k]! > 0) lo.talismanCd[k]!--;
  }
  if (lo.atkBuffT > 0) lo.atkBuffT--;
  if (lo.defBuffT > 0) lo.defBuffT--;
  if (lo.pillAuraT > 0) {
    lo.pillAuraT--;
    if (lo.pillAuraT <= 0) lo.pillAura = null;
  }
  if (lo.castGate > 0) lo.castGate--;
  firePills(e, g, 'hpBelow');
  if (e.eliteMod) firePills(e, g, 'elite');
}

/**
 * Attempt one skill/talisman cast from loadout (trash Enemy path).
 * `prefer` filters candidates for BehaviorStep useLoadout.
 */
export function tryCastEnemyLoadout(
  g: Game,
  e: Enemy,
  prefer: 'skill' | 'talisman' | 'any' = 'any',
): boolean {
  const lo = e.loadout;
  if (!lo) return false;
  if (!lo.skills.length && !lo.talismans.length) return false;
  if (e.dead || e.isReacting()) return false;
  if (e.state === 'attack') return false;
  if (!['idle', 'walk', 'retreat', 'aim'].includes(e.state)) return false;
  if (e.cooldown > 0 || lo.castGate > 0) return false;
  if (g.player.dead) return false;
  if (!g.attackToken(e)) return false;
  return commitLoadoutCast(g, e, lo, prefer);
}

/**
 * BossLoad2: idle/walk gap cast for Gargoyle (LoadoutCaster).
 * - Allowed states: idle / walk only (dive/roar/charge/attack/… rejected).
 * - Does **not** require host.cooldown===0 (gap while kit CD waits is the cast window).
 * - Does **not** use g.attackToken (Boss is not in enemies[]; single Boss = always ok).
 * - Failure = false / no-op; caller skips chooseMove only on true.
 */
export function tryCastBossLoadout(
  g: Game,
  e: LoadoutCaster,
  prefer: 'skill' | 'talisman' | 'any' = 'any',
): boolean {
  const lo = e.loadout;
  if (!lo) return false;
  if (!lo.skills.length && !lo.talismans.length) return false;
  if (e.dead) return false;
  if (e.isReacting?.()) return false;
  if (!(BOSS_LOADOUT_CAST_STATES as readonly string[]).includes(e.state)) return false;
  if (lo.castGate > 0) return false;
  if (g.player.dead) return false;
  return commitLoadoutCast(g, e, lo, prefer);
}

function commitLoadoutCast(
  g: Game,
  e: LoadoutCaster,
  lo: EnemyLoadoutState,
  prefer: 'skill' | 'talisman' | 'any',
): boolean {
  const dist = Math.abs(g.player.x - e.x);
  const pick = pickLoadoutAction(lo, dist, prefer);
  if (!pick) return false;
  if (pick.kind === 'skill') return castEnemySkill(g, e, pick.entry);
  return castEnemyTalisman(g, e, pick.entry);
}

/** Per-frame: CDs, buffs, aura, pill thresholds; may cast skill/talisman. */
export function tickEnemyLoadout(g: Game, e: Enemy): boolean {
  const lo = e.loadout;
  if (!lo) return false;
  if (!lo.skills.length && !lo.talismans.length && !lo.pills.length) return false;
  tickEnemyLoadoutTimers(g, e);
  return tryCastEnemyLoadout(g, e, 'any');
}

type Pick =
  | { kind: 'skill'; entry: EnemySkillLoadout }
  | { kind: 'talisman'; entry: EnemyTalismanLoadout };

function pickLoadoutAction(
  lo: EnemyLoadoutState,
  dist: number,
  prefer: 'skill' | 'talisman' | 'any' = 'any',
): Pick | null {
  type Cand = { kind: 'skill' | 'talisman'; entry: EnemySkillLoadout | EnemyTalismanLoadout; w: number };
  const cands: Cand[] = [];

  if (prefer === 'skill' || prefer === 'any') for (const s of lo.skills) {
    const cd = lo.skillCd[s.id] ?? 0;
    if (cd > 0) continue;
    const minR = s.minRange ?? 0;
    const maxR = s.maxRange ?? 9999;
    if (dist < minR || dist > maxR) continue;
    cands.push({ kind: 'skill', entry: s, w: Math.max(0.01, s.weight ?? 1) });
  }
  if (prefer === 'talisman' || prefer === 'any') for (const t of lo.talismans) {
    const cd = lo.talismanCd[t.id] ?? 0;
    if (cd > 0) continue;
    const minR = t.minRange ?? 0;
    const maxR = (t as EnemyTalismanLoadout & { maxRange?: number }).maxRange ?? 9999;
    if (dist < minR || dist > maxR) continue;
    cands.push({ kind: 'talisman', entry: t, w: Math.max(0.01, t.weight ?? 1) });
  }
  if (!cands.length) return null;

  let total = 0;
  for (const c of cands) total += c.w;
  let r = Math.random() * total;
  for (const c of cands) {
    r -= c.w;
    if (r <= 0) {
      return c.kind === 'skill'
        ? { kind: 'skill', entry: c.entry as EnemySkillLoadout }
        : { kind: 'talisman', entry: c.entry as EnemyTalismanLoadout };
    }
  }
  const last = cands[cands.length - 1]!;
  return last.kind === 'skill'
    ? { kind: 'skill', entry: last.entry as EnemySkillLoadout }
    : { kind: 'talisman', entry: last.entry as EnemyTalismanLoadout };
}

function castEnemySkill(g: Game, e: LoadoutCaster, entry: EnemySkillLoadout): boolean {
  const lo = e.loadout!;
  const def = getSkill(entry.id);
  if (!def) {
    warnOnce(`skill:${entry.id}`, `外功「${entry.id}」不在目录，已跳过`);
    lo.skillCd[entry.id] = 9999;
    return false;
  }
  if (def.kind === 'passive') {
    warnOnce(`skill-pass:${entry.id}`, `外功「${entry.id}」为被动，敌人不装配生效`);
    lo.skillCd[entry.id] = 9999;
    return false;
  }

  const eff = effectsAtRank(entry.id, 1);
  const cd = entry.cooldown ?? (eff.skillCd > 0 && eff.skillCd < 9000 ? eff.skillCd : 90);

  if (def.castKind === 'heal') {
    const amt = Math.min(eff.healAmt || 20, e.maxHp - e.hp);
    e.hp += amt;
    lo.skillCd[entry.id] = cd;
    e.cooldown = Math.max(e.cooldown, 24);
    lo.castGate = 36;
    g.texts.add(`${def.name} +${amt}`, e.x, e.y - 110, '#90ffb0', 14);
    if (def.castFx?.length) g.talismanScripts.playSteps(g, def.castFx, '#90ffb0', e);
    else g.fx.flare(e.x, e.y - 40, 50, '#60ff90', 12);
    if (def.castAnim) g.animScripts.playCastAnim(g, def.castAnim, '#90ffb0', e);
    playSfx(g.audio, 'potion');
    return true;
  }

  if (def.castKind === 'pojun' || def.castKind === 'ningqi') {
    warnOnce(`skill-kind:${entry.id}`, `外功「${entry.id}」castKind=${def.castKind} 敌人未支持，已跳过`);
    lo.skillCd[entry.id] = 9999;
    return false;
  }

  if (def.castKind === 'attack' || def.attackKey) {
    // W1: attackKey → ctx.attacks only (no bare BARE[] bypass)
    const key = def.attackKey ?? entry.id;
    const src = getAttackBox(key);
    if (!src) {
      warnOnce(`skill-box:${entry.id}`, `外功「${entry.id}」攻击盒「${key}」未备，已跳过`);
      lo.skillCd[entry.id] = 9999;
      return false;
    }
    e.faceToward(g.player.x);
    const mul = eff.skillDmgMult || 1;
    const atk: AttackDef = {
      ...src,
      damage: Math.max(1, Math.round(src.damage * mul)),
    };
    e.startAttack(atk);
    lo.skillCd[entry.id] = cd;
    e.cooldown = Math.max(e.cooldown, 18);
    lo.castGate = 40;
    g.texts.add(def.name, e.x, e.y - 110, '#e8d0a0', 14, true);
    if (def.castFx?.length) g.talismanScripts.playSteps(g, def.castFx, '#e8d0a0', e);
    if (def.castAnim) g.animScripts.playCastAnim(g, def.castAnim, '#e8d0a0', e);
    return true;
  }

  // castFx-only / castAnim-only active
  if (def.castFx?.length || def.castAnim) {
    e.faceToward(g.player.x);
    if (def.castFx?.length) g.talismanScripts.playSteps(g, def.castFx, '#e8d0a0', e);
    if (def.castAnim) g.animScripts.playCastAnim(g, def.castAnim, '#e8d0a0', e);
    lo.skillCd[entry.id] = cd;
    e.cooldown = Math.max(e.cooldown, 30);
    lo.castGate = 40;
    g.texts.add(def.name, e.x, e.y - 110, '#e8d0a0', 14, true);
    return true;
  }

  warnOnce(`skill-skip:${entry.id}`, `外功「${entry.id}」无法安全对敌人复用，已跳过`);
  lo.skillCd[entry.id] = 9999;
  return false;
}

function castEnemyTalisman(g: Game, e: LoadoutCaster, entry: EnemyTalismanLoadout): boolean {
  const lo = e.loadout!;
  const tal = getTalisman(entry.id);
  if (!tal) {
    warnOnce(`tal:${entry.id}`, `符咒「${entry.id}」不在目录，已跳过`);
    lo.talismanCd[entry.id] = 9999;
    return false;
  }
  e.faceToward(g.player.x);
  g.talismanScripts.start(g, entry.id, tal, e);
  const cd = entry.cooldown ?? 160;
  lo.talismanCd[entry.id] = cd;
  e.cooldown = Math.max(e.cooldown, 36);
  lo.castGate = 48;
  g.texts.add(tal.name, e.x, e.y - 110, tal.color ?? '#c8d0ff', 14, true);
  return true;
}

/** Draw whileActive aura (mirrors player; no custom Canvas API). */
export function drawEnemyPillAura(e: Enemy, ctx: CanvasRenderingContext2D, g: Game): void {
  const lo = e.loadout;
  if (!lo?.pillAura || lo.pillAuraT <= 0) return;
  const aura = lo.pillAura;
  const color = aura.color ?? '#ffd27a';
  const period = Math.max(8, aura.period ?? 18);
  const pulse = 0.55 + 0.45 * Math.sin((g.tick / period) * Math.PI * 2);
  const x = e.x;
  const y = e.y - 40;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  switch (aura.auraPreset) {
    case 'ring':
      g.fx.ring(x, y, 26 + pulse * 16, color, 2);
      break;
    case 'qi':
      if (g.tick % period === 0) {
        g.fx.spawn({
          kind: 'qi', x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 1.2, vy: -1.5 - Math.random(),
          life: 16, size: 8, color, add: true, drag: 0.94,
        });
      }
      break;
    case 'ember':
      if (g.tick % Math.max(4, period >> 1) === 0) {
        g.fx.spawn({
          kind: 'spark', x: x + (Math.random() - 0.5) * 20, y: y + 10,
          vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 1.5,
          life: 12, size: 3, color, add: true, drag: 0.9,
        });
      }
      break;
    case 'tint':
    default:
      ctx.globalAlpha = 0.15 + pulse * 0.12;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, e.y - 36, 20, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
}
