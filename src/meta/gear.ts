/**
 * Armor / accessory catalog for drops. Fog-until-drop: hub never lists unknown names.
 * Weapon remains on equippedWeapon (moveset); these slots are stats-only.
 *
 * Piece defs register via ctx.armorPieces (套装 bonuses stay on ctx.armorSets).
 */

import type { InherentQuality } from './taxonomy';
import { qualityArmorMult } from './taxonomy';
import { getArmorPiece, listArmorPieces, armorPieceMapView } from './contentRegistry';

/** Paper-doll equip keys (rings are two slots). */
export type EquipSlotId =
  | 'head' | 'body' | 'arms' | 'legs'
  | 'neck' | 'ring1' | 'ring2' | 'waist';

/** Physical slot kind on a piece (ring fits ring1 or ring2). */
export type ArmorSlotKind =
  | 'head' | 'body' | 'arms' | 'legs'
  | 'neck' | 'ring' | 'waist';

export const EQUIP_SLOTS: { id: EquipSlotId; kind: ArmorSlotKind; name: string }[] = [
  { id: 'head', kind: 'head', name: '冠帽' },
  { id: 'body', kind: 'body', name: '衣甲' },
  { id: 'arms', kind: 'arms', name: '护腕' },
  { id: 'legs', kind: 'legs', name: '靴履' },
  { id: 'neck', kind: 'neck', name: '项链' },
  { id: 'ring1', kind: 'ring', name: '戒指·左' },
  { id: 'ring2', kind: 'ring', name: '戒指·右' },
  { id: 'waist', kind: 'waist', name: '腰带' },
];

export const SLOT_KIND_NAME: Record<ArmorSlotKind, string> = {
  head: '冠帽',
  body: '衣甲',
  arms: '护腕',
  legs: '靴履',
  neck: '项链',
  ring: '戒指',
  waist: '腰带',
};

export interface GearBonus {
  hp?: number;
  /** Percent attack (e.g. 3 = +3%). */
  atk?: number;
  /** Percent defense. */
  def?: number;
  rage?: number;
  /** Percent 武功 damage (added to wugongBonus). */
  wugong?: number;
}

export interface ArmorDef {
  id: string;
  name: string;
  slot: ArmorSlotKind;
  lore: string;
  /** Base bonus before quality mult (rolled at identify). */
  base: GearBonus;
  /** Relative drop weight. */
  weight: number;
  /** Prefer early if player has no body armor. */
  common?: boolean;
  /** Catalog inherent-quality hint (instance still rolls on identify). */
  quality?: import('./taxonomy').InherentQuality;
  /** Catalog EquipTier hint 1..9. */
  tier?: import('./taxonomy').EquipTier;
  /** Optional fog name (unidentified / hub); defaults to slot fog if omitted. */
  fogName?: string;
}

/** Built-in piece pool — registered by 长夜包 changye; never shown as named hub catalog. */

/** Live catalog backed by ctx.armorPieces. */
export const ARMOR_DEFS: ArmorDef[] = listArmorPieces();
export const ARMOR_BY_ID: Record<string, ArmorDef> = armorPieceMapView();

export function isArmorPieceId(id: string): boolean {
  return getArmorPiece(id) !== undefined;
}

export { getArmorPiece, listArmorPieces };

export function isArmorSlotKind(s: string): s is ArmorSlotKind {
  return s in SLOT_KIND_NAME;
}

export function isEquipSlotId(s: string): s is EquipSlotId {
  return EQUIP_SLOTS.some((x) => x.id === s);
}

/** Equip targets for a piece's kind (ring → both ring slots). */
export function equipTargetsFor(kind: ArmorSlotKind): EquipSlotId[] {
  if (kind === 'ring') return ['ring1', 'ring2'];
  return [kind];
}

export function scaleBonus(base: GearBonus, q: InherentQuality): GearBonus {
  const mult = qualityArmorMult(q);
  const out: GearBonus = {};
  if (base.hp) out.hp = Math.round(base.hp * mult);
  if (base.atk) out.atk = Math.round(base.atk * mult);
  if (base.def) out.def = Math.round(base.def * mult);
  if (base.wugong) out.wugong = Math.round(base.wugong * mult);
  if (base.rage) out.rage = Math.round(base.rage * mult * 100) / 100;
  return out;
}

/** Weighted pick; prefer common body early when preferCommon. */
export function rollArmorDef(opts: { elite?: boolean; preferCommon?: boolean } = {}): ArmorDef {
  let pool = ARMOR_DEFS;
  if (!pool.length) {
    // Empty catalog — soft fallback so drops don't throw (missing menpai).
    return { id: 'buyi', name: '布衣', slot: 'body', lore: '', base: { hp: 8, def: 1 }, weight: 1 };
  }
  if (opts.preferCommon) {
    const common = ARMOR_DEFS.filter((d) => d.common);
    if (common.length && Math.random() < 0.7) pool = common;
  }
  if (opts.elite && Math.random() < 0.45) {
    const rare = pool.filter((d) => d.weight <= 4);
    if (rare.length) pool = rare;
  }
  let total = 0;
  for (const d of pool) total += d.weight;
  let r = Math.random() * total;
  for (const d of pool) {
    r -= d.weight;
    if (r <= 0) return d;
  }
  return pool[pool.length - 1]!;
}

/** Map legacy accessory display names → slot guess for migration. */
export function guessSlotFromLegacyName(name?: string): ArmorSlotKind {
  if (!name) return 'neck';
  if (/护腕|腕/.test(name)) return 'arms';
  if (/腰|带/.test(name)) return 'waist';
  if (/指|戒|环/.test(name)) return 'ring';
  if (/帽|盔|冠/.test(name)) return 'head';
  if (/靴|履|鞋/.test(name)) return 'legs';
  if (/甲|衣|袍/.test(name)) return 'body';
  return 'neck';
}

/** Same cap as weapons for consistency. */
export const ARMOR_LEVEL_MAX = 5;

/**
 * Crystal cost for armor reinforce — mirrors weaponUpgradeCost curve:
 * Lv2–5: 25 / 50 / 85 / 130 / 185 血晶
 */
export function armorUpgradeCost(nextLevel: number): number {
  const table = [0, 0, 25, 50, 85, 130, 185];
  return table[nextLevel] ?? 9999;
}

/** Generic mats by next level (slot-agnostic iron/bone/herb path). */
export function armorUpgradeMats(nextLevel: number): Partial<Record<'iron' | 'bone' | 'herb' | 'xuaniron' | 'yaohe', number>> {
  const n = Math.max(2, Math.min(ARMOR_LEVEL_MAX, nextLevel));
  const mats: Partial<Record<'iron' | 'bone' | 'herb' | 'xuaniron' | 'yaohe', number>> = {
    iron: n,
    bone: Math.max(1, Math.floor(n / 2)),
  };
  if (n >= 3) mats.herb = 1;
  if (n >= 4) mats.xuaniron = 1;
  if (n >= 5) mats.yaohe = 1;
  return mats;
}

/** Level mult on top of quality-scaled base (+8% per level above 1). */
export function armorLevelMult(level: number): number {
  const n = Math.max(0, (level || 1) - 1);
  return 1 + n * 0.08;
}

/** Recompute armor bonus from catalog base × quality × level (deterministic). */
export function computeArmorBonus(
  armorId: string | undefined,
  quality: InherentQuality,
  level: number,
  fallbackBase?: GearBonus,
): GearBonus {
  const def = armorId ? getArmorPiece(armorId) : undefined;
  const base = def?.base ?? fallbackBase ?? { hp: 4 };
  const qScaled = scaleBonus(base, quality);
  const lm = armorLevelMult(level);
  if (lm === 1) return qScaled;
  const out: GearBonus = {};
  if (qScaled.hp) out.hp = Math.round(qScaled.hp * lm);
  if (qScaled.atk) out.atk = Math.round(qScaled.atk * lm);
  if (qScaled.def) out.def = Math.round(qScaled.def * lm);
  if (qScaled.wugong) out.wugong = Math.round(qScaled.wugong * lm);
  if (qScaled.rage) out.rage = Math.round(qScaled.rage * lm * 100) / 100;
  return out;
}
