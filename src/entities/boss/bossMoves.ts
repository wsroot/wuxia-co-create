/**
 * Boss AttackDef seed source (G5) — numbers/box shapes seed CORE_ATTACK_BOXES
 * via boxFrom; Gargoyle runtime only uses getAttackBox (ids = AttackDef.name).
 * File name collides with catalog `bossMoves` (BossMoveDef) — this file is
 * AttackDef boxes only, not the move-kind directory.
 * Data-only so coreData can import without cycles.
 */
import type { AttackDef } from '../../combat/types';

const claw = { kbY: 0, hitstun: 22, hitstop: 7, shake: 5, parryable: true, swing: 'claw' as const };

/** @deprecated G5: seed/test only — prefer getAttackBox('claw1'). */
export const CLAW1: AttackDef = { ...claw, name: 'claw1', startup: 20, active: 5, recovery: 8, box: { x: 10, y: -140, w: 100, h: 125 }, damage: 11, kbX: 4, moveX: 4, moveFrames: 24 };
/** @deprecated G5: seed/test only — prefer getAttackBox('claw2'). */
export const CLAW2: AttackDef = { ...claw, name: 'claw2', startup: 12, active: 5, recovery: 8, box: { x: 10, y: -140, w: 100, h: 125 }, damage: 11, kbX: 4, moveX: 4, moveFrames: 16 };
/** @deprecated G5: seed/test only — prefer getAttackBox('claw3'). */
export const CLAW3: AttackDef = { ...claw, name: 'claw3', startup: 22, active: 6, recovery: 38, box: { x: 0, y: -150, w: 120, h: 150 }, damage: 17, kbX: 9, kbY: -6, knockdown: true, hitstop: 10, shake: 9, moveX: 6, moveFrames: 26 };

/** @deprecated G5: seed/test only — prefer getAttackBox('gCharge'). */
export const CHARGE_HIT: AttackDef = { name: 'gCharge', startup: 0, active: 9999, recovery: 0, box: { x: -30, y: -120, w: 120, h: 110 }, damage: 18, kbX: 11, kbY: -7, knockdown: true, hitstun: 30, hitstop: 9, shake: 10, parryable: false };
/** @deprecated G5: seed/test only — prefer getAttackBox('gDive'). */
export const DIVE_BODY: AttackDef = { name: 'gDive', startup: 0, active: 9999, recovery: 0, box: { x: -50, y: -120, w: 100, h: 120 }, damage: 16, kbX: 6, kbY: -8, knockdown: true, unblockable: true, hitstun: 30, hitstop: 8, shake: 8 };
/** @deprecated G5: seed/test only — prefer getAttackBox('gDiveWave'). */
export const DIVE_WAVE: AttackDef = { name: 'gDiveWave', startup: 0, active: 1, recovery: 0, box: { x: 0, y: 0, w: 0, h: 0 }, damage: 20, kbX: 9, kbY: -8, knockdown: true, unblockable: true, hitstun: 30, hitstop: 8, shake: 14 };
/** @deprecated G5: seed/test only — prefer getAttackBox('gRoar'). */
export const ROAR_WAVE: AttackDef = { name: 'gRoar', startup: 0, active: 1, recovery: 0, box: { x: 0, y: 0, w: 0, h: 0 }, damage: 12, kbX: 10, kbY: -6, knockdown: true, unblockable: true, hitstun: 30, hitstop: 6, shake: 8 };
/** @deprecated G5: seed/test only — prefer getAttackBox('gFire'). */
export const FIREBALL: AttackDef = { name: 'gFire', startup: 0, active: 1, recovery: 0, box: { x: 0, y: 0, w: 0, h: 0 }, damage: 12, kbX: 5, kbY: -3, hitstun: 22, hitstop: 6, shake: 5, parryable: false };

/**
 * @deprecated G5: seed/test mirror only — do not read at runtime.
 * Prefer CORE_ATTACK_BOXES → ctx.attacks / getAttackBox. Individual exports
 * remain the single source for coreData boxFrom.
 */
export const BUILTIN_BOSS_ATTACKS: Record<string, AttackDef> = {
  claw1: CLAW1,
  claw2: CLAW2,
  claw3: CLAW3,
  gCharge: CHARGE_HIT,
  gDive: DIVE_BODY,
  gDiveWave: DIVE_WAVE,
  gRoar: ROAR_WAVE,
  gFire: FIREBALL,
};

/** Phase-2 variants: faster startups (pure transform; input from getAttackBox). */
export function fast(d: AttackDef, k = 0.72): AttackDef {
  return { ...d, startup: Math.max(6, Math.round(d.startup * k)), recovery: Math.round(d.recovery * 0.8) };
}
