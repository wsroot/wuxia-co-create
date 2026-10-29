/**
 * Weapon appearance building blocks (WeaponLookDef / WeaponVisualPart).
 * Plugins register recipes via ctx.weaponLooks; core interpreter draws them.
 * No arbitrary JS / Canvas / URL / free PNG — whitelist parts + optional ctx.sheets overlay.
 */
import type { BladeShape, WeaponSprite } from './weapons';

/** Whitelist part kinds. Unknown → reject at register / soft-skip at draw. */
export const WEAPON_LOOK_PART_KINDS = [
  /* structure / scale */
  'grip', 'guard', 'tsuba', 'pommel', 'blade', 'tip', 'haft', 'head',
  'chain', 'tassel', 'ring', 'twinOffset',
  /* color / material feel */
  'palette', 'inkEdge', 'glow', 'runeInlay',
  /* FX hooks (look layer, not damage) */
  'idleTrail', 'swingHint', 'spriteOverlay',
] as const;

export type WeaponLookPartKind = (typeof WEAPON_LOOK_PART_KINDS)[number];

/** Blade profile inside a `blade` part (extends beyond WeaponDef.shape). */
export const BLADE_PROFILES = [
  'straight', 'curved', 'leaf', 'needle', 'broad',
  /* aliases of WeaponDef.shape for convenience */
  'sword', 'dagger', 'axe', 'spear', 'twin', 'greatsword',
] as const;
export type BladeProfile = (typeof BLADE_PROFILES)[number];

export type TipStyle = 'point' | 'chisel' | 'hook' | 'blunt' | 'fork' | 'leaf' | 'barbed' | 'crescent';
export type HeadStyle = 'axe' | 'spear' | 'hammer' | 'halberd' | 'crescent';
export type GuardStyle = 'cross' | 'disk' | 'wing' | 'none';
export type TasselStyle = 'short' | 'long' | 'knot';
export type ChainStyle = 'links' | 'line';

export type WeaponVisualPart =
  | { kind: 'grip'; length?: number; width?: number; color?: string; wrapStyle?: 'cord' | 'leather' | 'silk' | 'none' }
  | { kind: 'guard'; style?: GuardStyle; width?: number; color?: string }
  | { kind: 'tsuba'; style?: GuardStyle; width?: number; color?: string; radius?: number }
  | { kind: 'pommel'; size?: number; color?: string; ring?: boolean }
  | {
      kind: 'blade';
      profile?: BladeProfile;
      /** Fraction of WeaponDef.length (0.4..1.2). */
      lengthFrac?: number;
      width?: number;
      color?: string;
      /** Extra curve bias for curved/leaf profiles (0..2). */
      curveAmount?: number;
      /** Tip taper multiplier (0.4..1.4). */
      taper?: number;
      /** Blood groove (fuller) depth hint 0..1. */
      fuller?: number;
    }
  | { kind: 'tip'; style?: TipStyle; size?: number; color?: string }
  | { kind: 'haft'; length?: number; width?: number; color?: string }
  | { kind: 'head'; style?: HeadStyle; size?: number; color?: string }
  | { kind: 'chain'; style?: ChainStyle; length?: number; color?: string; links?: number; swayAmp?: number }
  | { kind: 'tassel'; style?: TasselStyle; length?: number; color?: string; swayAmp?: number }
  | { kind: 'ring'; radius?: number; color?: string; at?: 'pommel' | 'guard' }
  | { kind: 'twinOffset'; dx?: number; dy?: number; scale?: number; mirror?: boolean }
  | {
      kind: 'palette';
      blade?: string;
      trail?: string;
      edge?: string;
      grip?: string;
      metal?: string;
    }
  | { kind: 'inkEdge'; color?: string; width?: number }
  | { kind: 'glow'; color?: string; radius?: number; alpha?: number }
  | { kind: 'runeInlay'; text?: string; color?: string; along?: number }
  | { kind: 'idleTrail'; color?: string; width?: number; alpha?: number }
  | { kind: 'swingHint'; color?: string; width?: number }
  | {
      kind: 'spriteOverlay';
      sheetId: string;
      frame?: number;
      pivot?: { x: number; y: number };
      scale?: number;
    };

export interface WeaponLookDef {
  id: string;
  label?: string;
  /** Optional base shape hint when no blade/haft/head part present. */
  baseShape?: BladeShape;
  parts: WeaponVisualPart[];
}

/** Resolved look used by drawers (compat with legacy WeaponAppearance). */
export interface ResolvedWeaponLook {
  shape: BladeShape;
  length: number;
  blade: string;
  trail: string;
  edge: string;
  sprite?: WeaponSprite;
  /** When set, interpreter draws from parts instead of legacy parametric-only. */
  parts?: WeaponVisualPart[];
  lookId?: string;
  /** Merged FX hints from idleTrail / swingHint. */
  idleTrail?: { color: string; width: number; alpha: number };
  swingHint?: { color: string; width: number };
}

export function isWeaponLookPartKind(k: string): k is WeaponLookPartKind {
  return (WEAPON_LOOK_PART_KINDS as readonly string[]).includes(k);
}

export function isBladeProfile(p: string): p is BladeProfile {
  return (BLADE_PROFILES as readonly string[]).includes(p);
}
