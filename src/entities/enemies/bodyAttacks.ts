/**
 * Body-kit attack seed constants — CORE single source (A1/A4/债11).
 * Seven named AttackDefs seed CORE_ATTACK_BOXES via boxFrom in coreData.
 * BUILTIN_BODY_ATTACKS map removed (债11); runtime only uses getAttackBox.
 * Data-only so coreData can import without cycles.
 */
import type { AttackDef } from '../../combat/types';

export const AXE_CHOP: AttackDef = {
  name: 'axeChop', startup: 40, active: 5, recovery: 34, box: { x: 4, y: -112, w: 70, h: 112 },
  damage: 14, kbX: 5, kbY: -3, hitstun: 24, hitstop: 8, shake: 7, parryable: true, moveX: 2.5, moveFrames: 45, swing: 'heavy',
};

export const SHIELD_BASH: AttackDef = {
  name: 'bash', startup: 20, active: 5, recovery: 26, box: { x: 4, y: -86, w: 56, h: 66 },
  damage: 10, kbX: 6, kbY: 0, hitstun: 20, hitstop: 6, shake: 4, parryable: true, moveX: 3, moveFrames: 25, swing: 'bash',
};

export const SHIELD_CHARGE: AttackDef = {
  name: 'charge', startup: 0, active: 9999, recovery: 0, box: { x: -6, y: -88, w: 56, h: 84 },
  damage: 18, kbX: 10, kbY: -6, knockdown: true, guardBreak: true, parryable: false, hitstun: 30, hitstop: 9, shake: 9,
};

export const ARROW: AttackDef = {
  name: 'arrow', startup: 0, active: 1, recovery: 0, box: { x: 0, y: 0, w: 0, h: 0 },
  damage: 10, kbX: 3, kbY: 0, hitstun: 16, hitstop: 5, shake: 3, parryable: true,
};

export const WHIP: AttackDef = {
  name: 'whip', startup: 12, active: 5, recovery: 22, box: { x: 0, y: -88, w: 64, h: 62 },
  damage: 8, kbX: 5, kbY: 0, hitstun: 18, hitstop: 5, shake: 3, parryable: true, swing: 'whip',
};

/** Mid-range held thrust — long startup, long hitbox, punishable on whiff. */
export const SPEAR_THRUST: AttackDef = {
  name: 'thrust',
  startup: 48,
  active: 6,
  recovery: 38,
  box: { x: 16, y: -78, w: 118, h: 42 },
  damage: 13,
  kbX: 4.5,
  kbY: -1.5,
  hitstun: 22,
  hitstop: 7,
  shake: 5,
  parryable: true,
  pierce: true,
  moveX: 1.4,
  moveFrames: 52,
  swing: 'slash',
};

/** Short dash-stab — closes a gap, shorter reach than thrust. */
export const SPEAR_LUNGE: AttackDef = {
  name: 'lunge',
  startup: 28,
  active: 5,
  recovery: 32,
  box: { x: 8, y: -82, w: 96, h: 48 },
  damage: 11,
  kbX: 5.5,
  kbY: -2,
  hitstun: 20,
  hitstop: 6,
  shake: 4,
  parryable: true,
  pierce: true,
  moveX: 4.2,
  moveFrames: 34,
  swing: 'slash',
};
