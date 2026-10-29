import type { WeaponId } from './weapons';
import type { MaterialBag, MaterialId } from './materials';
import type { SkillId } from './skills';
import type { NeigongId } from './neigong';
import type { PillBag, PillId, PillSlot } from './alchemy';
import type { TalismanBag, TalismanId, TalismanSlot } from './talismans';
import type { InherentQuality } from './taxonomy';
import type { ArmorSlotKind, EquipSlotId, GearBonus } from './gear';

/** Soft currency — 血晶（灵晶），用于手续费。 */
export type CurrencyName = '血晶';

/** Unidentified / identified gear instance in 行囊 or equipped. */
export interface GearItem {
  uid: string;
  /**
   * weapon = weapon drop or forged instance (level/quality/tier on this item).
   * armor = body-slot piece (legacy `accessory` migrates here).
   */
  kind: 'weapon' | 'armor';
  identified: boolean;
  /** Weapon type id (kind === 'weapon'). */
  weaponId?: WeaponId;
  /** 固有品质 (天/地/玄/黄/凡/劣). */
  quality?: InherentQuality;
  /**
   * 装备阶位 EquipTier 1..9 — user-facing 「装备等级」(「一阶」…「九阶」).
   * Forge/强化 stays on `level` (淬炼); do not conflate the two ladders.
   */
  tier?: number;
  /** Revealed on identify / craft (fog until then). */
  name?: string;
  /** Armor slot kind; present on armor drops (hidden in UI until identify). */
  slot?: ArmorSlotKind;
  /** Catalog id for lore / re-roll reference (optional). */
  armorId?: string;
  bonus?: GearBonus;
  /**
   * Forge / 强化 level (1..LEVEL_MAX) — 淬炼 progression, separate from EquipTier.
   * Weapons and armor both use this on the instance (default 1 when identified/forged).
   */
  level?: number;
  /** Crafted weapon instance affix. */
  wepAffix?: import('./weaponInstAffix').WepAffixId;
  /** Named armor set id (armor only; fog until known). */
  setId?: import('./armorSets').ArmorSetId;
  /**
   * Per-copy base-stat rolls (weapons, v21). 1.00 = neutral; ±8% on forge / identify.
   * Missing on older weapons → treated as 1.00.
   */
  rollDmg?: number;
  rollPoise?: number;
  /** Remaining 重锻词缀 attempts (v21). Missing → full allowance by quality. */
  reforgeLeft?: number;
}

export interface RunInventory {
  potions: number;
  /** Exactly 4 sortie pill slots (type + count, or empty). */
  pillSlots: PillSlot[];
  /**
   * Exactly 2 combat 灵符 slots (v16).
   * Legacy v15 `talisman` migrates into slots[0].
   */
  talismanSlots: TalismanSlot[];
}

export interface SaveData {
  /** v22 = InherentQuality + EquipTier; v21 gear sell/reforge/rolls; v20 skills/pills/talismans; v19 armor sets. */
  version: 22;
  crystals: number;
  materials: MaterialBag;
  blueprints: WeaponId[];
  /** Weapon types of which at least one identified instance exists (empty at bare start). */
  ownedWeapons: WeaponId[];
  /**
   * Legacy type-level mirrors — kept in sync from the equipped instance for
   * older readers; prefer GearItem.level/quality + equippedWeaponUid.
   */
  weaponLevels: Partial<Record<WeaponId, number>>;
  weaponQuality: Partial<Record<WeaponId, InherentQuality>>;
  /** Moveset / catalog id of the equipped weapon instance; empty string = bare hands. */
  equippedWeapon: WeaponId;
  /** gearBag uid of the equipped weapon instance (v13). */
  equippedWeaponUid?: string;
  /**
   * All weapon instances + armor / unidentified drops (bag + equipped).
   * Equipped armor stays here; `equippedSlots` points at their uid.
   * Equipped weapon uses `equippedWeaponUid`.
   */
  gearBag: GearItem[];
  /** Armor paper-doll: slot → gear uid. Weapon uses equippedWeaponUid. */
  equippedSlots: Partial<Record<EquipSlotId, string>>;
  skills: SkillId[];
  skillRanks: Partial<Record<SkillId, number>>;
  skillProf: Partial<Record<SkillId, number>>;
  activeSkills: SkillId[];
  knownNeigong: NeigongId[];
  equippedNeigong: NeigongId | null;
  neigongRanks: Partial<Record<NeigongId, number>>;
  knownRecipes: PillId[];
  pills: PillBag;
  /** Combat talisman stock (hub). */
  talismans: TalismanBag;
  /** Talisman recipes known (fog until craft once). */
  knownTalismans: TalismanId[];
  runInv: RunInventory;
  runs: number;
  clears: number;
  /** Highest act index the player may start (0..3). Unlock next on clear. */
  unlockedAct: number;
  /** Act indices cleared at least once (0-based). */
  clearedActs: number[];
  /** 局内接受黑残页后，山门可净秽. */
  pendingCurseCleanse?: boolean;
  unlockedTitles?: import('./titles').TitleId[];
  knownSetQualities?: InherentQuality[];
  /** Revealed named armor set ids. */
  knownArmorSets?: import('./armorSets').ArmorSetId[];
  codex?: import('./codex').CodexData;
  legacyPending?: boolean;
  /** Last death: offer legacy next hub start. */
  lastDeathLegacy?: boolean;
  /** Training / dojo visits (cosmetic). */
  dojoVisits?: number;
}

export interface RunMods {
  maxHp: number;
  atk: number;
  def: number;
  chip: number;
  rage: number;
  parryWindow: number;
  dashIframes: number;
  enemyScale: number;
  startPotions: number;
  weaponId: WeaponId;
  weaponLevel: number;
  weaponQuality: InherentQuality;
  /** Per-copy forge roll on the equipped weapon (1 = neutral). */
  weaponRollDmg?: number;
  weaponRollPoise?: number;
  doubleJump: boolean;
  /** 闪身步 unlocked. */
  canDash: boolean;
  jumpBoost: number;
  dashKickBonus: number;
  pojunMult: number;
  pojunDuration: number;
  pojunCd: number;
  healAmt: number;
  healCd: number;
  activeSkills: SkillId[];
  /** Snapshot of the 4 hub-assigned pill slots at run start. */
  startPillSlots: PillSlot[];
  /** Snapshot of prepared combat 灵符 slots at run start (len 2). */
  startTalismanSlots: TalismanSlot[];
  skillRanks: Partial<Record<SkillId, number>>;
  wugongBonus: number;
  equippedNeigong: NeigongId | null;
  neigongRank: number;
  /** Plate armor pool from gear (+ base applied in player). */
  maxArmor: number;
  maxNeili: number;
  neiliRegen: number;
  wepAffix?: import('./weaponInstAffix').WepAffixId | null;
  neigongPoiseMul?: number;
  neigongExecuteMul?: number;
  neigongLifesteal?: number;
  neigongParryRage?: number;
  setEchoLabel?: string;
  setDashCdMul?: number;
  setDashIframes?: number;
  setDmgTakenMul?: number;
  setLifesteal?: number;
  setExecuteMul?: number;
  setPoiseMul?: number;
  setNeiliRegenMul?: number;
  setParryWindowBonus?: number;
  setAffixDmgMul?: number;
  setCurseTakenMul?: number;
}

export interface RunLootSummary {
  materials: Partial<Record<MaterialId, number>>;
  blueprints: WeaponId[];
  gear: number;
}

export interface RunRewards {
  crystals: number;
  kills: number;
  parries: number;
  victory: boolean;
  loot: RunLootSummary;
}

export const SAVE_KEY = 'requiem-save-v1';

export type { EquipSlotId, ArmorSlotKind, GearBonus };
