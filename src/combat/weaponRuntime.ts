import type { AttackDef } from './types';
import type { WeaponDef, WeaponId, Affinity } from '../meta/weapons';
import { WEAPON_BY_ID, weaponLevelBonus, weightFeel } from '../meta/weapons';

export interface WeaponLoadout {
  id: WeaponId;
  level: number;
  def: WeaponDef;
  /** Per-copy forge roll (1 = neutral). */
  rollDmg: number;
  rollPoise: number;
}

/**
 * Runtime-only unarmed stats (王八拳 feel). NOT a catalog WeaponDef id —
 * bare hands = no equipped weapon; combat scales with this synthetic def.
 */
export const UNARMED_RUNTIME_DEF: WeaponDef = {
  id: '',
  name: '空手',
  lore: '',
  unlock: { type: 'starter' },
  damage: 0.72, speed: 0.78, reach: 0.55, poise: 0.55, rage: 0.9, airHover: 1.05,
  weight: 'light',
  category: 'bare',
  affinities: [], affinityBonus: 0,
  blade: '#e8c8a8', trail: '#ff8060', edge: '#ffe0c0', length: 18, shape: 'sword',
  tip: '王八拳 · 短距连打',
  quality: 'fan', tier: 1,
};

export function unarmedLoadout(): WeaponLoadout {
  return { id: '', level: 1, def: UNARMED_RUNTIME_DEF, rollDmg: 1, rollPoise: 1 };
}

export function loadout(id: WeaponId, level: number, roll?: { dmg?: number; poise?: number }): WeaponLoadout {
  if (!id) return unarmedLoadout();
  const def = WEAPON_BY_ID[id];
  if (!def) return unarmedLoadout();
  const clampRoll = (v: number | undefined) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0.85, Math.min(1.15, v)) : 1;
  return {
    id, level: Math.max(1, Math.min(5, level)), def,
    rollDmg: clampRoll(roll?.dmg), rollPoise: clampRoll(roll?.poise),
  };
}

/**
 * Scale a base AttackDef by the equipped weapon.
 * Shared movelist; timings, hitboxes, damage, hit-feel, and a few perks change.
 */
export function scaleAttack(base: AttackDef, w: WeaponLoadout): AttackDef {
  const { def, level } = w;
  const lv = weaponLevelBonus(level);
  const feel = weightFeel(def.weight);

  let dmgMult = def.damage * lv.damage * (w.rollDmg ?? 1);
  let reach = def.reach;
  let speed = def.speed;

  // Twin / dashFocus: dash-kick is the star move (affinity-driven, not id)
  if (def.affinities.includes('dashFocus') && base.name === 'dashKick') {
    dmgMult *= 1.42;
    reach *= 1.18;
    speed *= 0.78;
  }
  // WeaponDef.feel — plugin-authored mul tables (no content-id branches)
  const feelTweaks = def.feel;
  if (feelTweaks) {
    if (feelTweaks.dmgMul) dmgMult *= feelTweaks.dmgMul;
    if (feelTweaks.airDmgMul && base.air) dmgMult *= feelTweaks.airDmgMul;
    const md = feelTweaks.moveDmgMul?.[base.name];
    if (md) dmgMult *= md;
    const ms = feelTweaks.moveSpeedMul?.[base.name];
    if (ms) speed *= ms;
  }

  const scaleFrame = (n: number) => Math.max(1, Math.round(n * speed));

  // Reach: short weapons shrink both offset and width; long grow width.
  // Tip push / per-move box widen come from WeaponDef.feel.boxTune (no shape===).
  const box = {
    x: base.box.x * (reach >= 1 ? 1 : Math.max(0.55, reach)),
    y: base.box.y,
    w: Math.max(28, Math.round(base.box.w * reach)),
    h: base.box.h,
  };
  const bt = feelTweaks?.boxTune;
  if (bt?.tipXPush != null) {
    box.x = base.box.x + Math.round(bt.tipXPush * reach);
    const floorMul = bt.tipWFloorMul ?? 0.92;
    box.w = Math.max(box.w, Math.round(base.box.w * reach * floorMul));
  }
  const bw = bt?.moveBoxWMul?.[base.name];
  if (bw) box.w = Math.round(box.w * bw);
  const bh = bt?.moveBoxHMul?.[base.name];
  if (bh) box.h = Math.round(box.h * bh);

  // Active frames: light keeps snappy windows; heavy gets a touch more active for readability
  let active = Math.max(2, Math.round(base.active * Math.min(1.2, 0.85 + speed * 0.2)));
  if (def.weight === 'light') active = Math.max(2, Math.round(base.active * 0.92));
  if (def.weight === 'heavy') active = Math.max(3, Math.round(base.active * Math.min(1.25, speed * 0.95)));

  const kbMul = feel.kb;
  const out: AttackDef = {
    ...base,
    startup: scaleFrame(base.startup),
    active,
    recovery: scaleFrame(base.recovery),
    box,
    damage: Math.max(1, Math.round(base.damage * dmgMult)),
    kbX: base.kbX * kbMul,
    kbY: base.kbY * (def.weight === 'heavy' ? 1.1 : def.weight === 'light' ? 0.9 : 1) * (kbMul > 1 ? 1 : kbMul),
    hitstop: Math.max(2, Math.round(base.hitstop * feel.hitstop)),
    shake: Math.max(1, Math.round(base.shake * feel.shake)),
    moveX: base.moveX !== undefined
      ? base.moveX * (def.weight === 'heavy' ? 0.9 : def.weight === 'light' ? 1.08 : 1) * (0.85 + 0.15 / Math.max(0.5, speed))
      : base.moveX,
    rage: base.rage !== undefined ? base.rage * def.rage * lv.rage : base.rage,
    pierce: base.pierce || def.affinities.includes('shieldBreak'),
    poiseScale: (base.heavy ? 1.6 : 1) * def.poise * lv.poise * (w.rollPoise ?? 1),
  };

  // Twin dashKick: extra hitstop punch so it *feels* like the payoff
  if (def.affinities.includes('dashFocus') && base.name === 'dashKick') {
    out.hitstop = Math.max(out.hitstop, Math.round(base.hitstop * 1.15));
    out.shake = Math.max(out.shake, Math.round(base.shake * 1.2));
    out.kbX = base.kbX * 1.15;
  }
  return out;
}

/** Earliest frame (absolute) when recovery can cancel into the next attack. */
export function chainCancelFrame(def: AttackDef, w: WeaponLoadout): number {
  const activeEnd = def.startup + def.active;
  switch (w.def.weight) {
    case 'light':
      return Math.max(1, activeEnd - 1); // cancel into recovery immediately
    case 'heavy':
      return activeEnd + Math.max(2, Math.round(def.recovery * 0.38)); // must commit
    default:
      return activeEnd;
  }
}

/** Idle chain-buffer window after an attack fully ends. */
export function chainOpenFrames(w: WeaponLoadout): number {
  switch (w.def.weight) {
    case 'light': return 18;
    case 'heavy': return 9;
    default: return 14;
  }
}

/**
 * Affinity vs target — data markers only (isBoss / superArmor / catalog kind).
 * Does not match display-name strings.
 */
export function affinityVs(
  w: WeaponLoadout,
  target: { kind?: string; team?: string; name?: string; superArmor?: boolean; isBoss?: boolean },
): Affinity | null {
  const a = w.def.affinities;
  // Boss: caller isBoss flag, or catalog kind marker (e.g. gargoyle body/kind).
  const boss = !!target.isBoss || target.kind === 'gargoyle';
  if (boss) {
    if (a.includes('bossGargoyle')) return 'bossGargoyle';
    if (a.includes('antiArmor')) return 'antiArmor';
  }
  if (target.kind === 'shield' && a.includes('shieldBreak')) return 'shieldBreak';
  if (target.superArmor && a.includes('antiArmor')) return 'antiArmor';
  return null;
}

export function affinityLabel(a: Affinity): string {
  switch (a) {
    case 'bossGargoyle': return '克制·石兽';
    case 'shieldBreak': return '克制·破盾';
    case 'antiArmor': return '克制·破势';
    case 'juggle': return '克制·浮空';
    case 'dashFocus': return '克制·闪击';
    case 'rage': return '克制·怒血';
  }
}
