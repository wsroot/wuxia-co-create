import type { GearItem, RunInventory, SaveData } from './types';
import { SAVE_KEY } from './types';
import { WEAPON_BY_ID, isWeaponId, type WeaponId } from './weapons';
import { isMaterialId, type MaterialBag } from './materials';
import { isSkillId, SKILL_BY_ID, type SkillId } from './skills';
import {
  isPillId, PILL_BY_ID, PILL_SLOT_COUNT, pillSlotMigrateOrder,
  emptyPillSlots, type PillBag, type PillId, type PillSlot,
} from './alchemy';
import { isNeigongId, type NeigongId } from './neigong';
import {
  isTalismanId, emptyTalismanSlots, TALISMAN_SLOT_COUNT,
  type TalismanBag, type TalismanId, type TalismanSlot,
} from './talismans';
import { statRoll } from './craft';
import { migrateQuality, clampEquipTier, QUALITY_DEFAULT_TIER, type InherentQuality } from './taxonomy';
import { isWepAffixId, reforgeMax } from './weaponInstAffix';
import { isArmorSetId } from './armorSets';
import { emptyCodex } from './codex';
import {
  isArmorSlotKind, isEquipSlotId, guessSlotFromLegacyName,
  type EquipSlotId, type GearBonus,
} from './gear';

export const emptyInv = (): RunInventory => ({ potions: 0, pillSlots: emptyPillSlots(), talismanSlots: emptyTalismanSlots() });

/** New game: empty shell — no weapon / neigong / skills / pills / talismans until plugins or drops grant them. Bare hands = unequipped. */
export function freshSave(): SaveData {
  return {
    version: 22,
    crystals: 0,
    materials: {},
    blueprints: [],
    ownedWeapons: [],
    weaponLevels: {},
    weaponQuality: {},
    equippedWeapon: '',
    equippedWeaponUid: '',
    gearBag: [],
    equippedSlots: {},
    skills: [],
    skillRanks: {},
    skillProf: {},
    activeSkills: [],
    knownNeigong: [],
    equippedNeigong: null,
    neigongRanks: {},
    knownRecipes: [],
    pills: {},
    talismans: {},
    knownTalismans: [],
    runInv: emptyInv(),
    runs: 0,
    clears: 0,
    unlockedAct: 0,
    clearedActs: [],
    pendingCurseCleanse: false,
    unlockedTitles: [],
    knownSetQualities: [],
    knownArmorSets: [],
    codex: emptyCodex(),
    legacyPending: false,
    dojoVisits: 0,
  };
}

function clampInt(n: unknown, lo: number, hi: number, fallback: number): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : fallback;
  return Math.max(lo, Math.min(hi, v));
}

function parseMaterials(raw: unknown): MaterialBag {
  const out: MaterialBag = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isMaterialId(k)) out[k] = clampInt(v, 0, 9999, 0);
  }
  return out;
}

function parsePills(raw: unknown): PillBag {
  const out: PillBag = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isPillId(k)) out[k] = clampInt(v, 0, 99, 0);
  }
  return out;
}


/** Convert legacy runInv.pills bag into up to 4 slots (combat-first order). */
export function bagToPillSlots(bag: PillBag): PillSlot[] {
  const slots = emptyPillSlots();
  let i = 0;
  for (const id of pillSlotMigrateOrder()) {
    if (i >= PILL_SLOT_COUNT) break;
    const n = bag[id] ?? 0;
    if (n <= 0) continue;
    const cap = PILL_BY_ID[id].carryCap;
    slots[i] = { id, n: Math.min(n, cap) };
    i++;
  }
  return slots;
}

function parsePillSlots(rawInv: unknown): PillSlot[] {
  const slots = emptyPillSlots();
  if (!rawInv || typeof rawInv !== 'object') return slots;
  const inv = rawInv as Record<string, unknown>;
  // New shape: pillSlots array
  if (Array.isArray(inv.pillSlots)) {
    for (let i = 0; i < PILL_SLOT_COUNT; i++) {
      const s = inv.pillSlots[i];
      if (!s || typeof s !== 'object') { slots[i] = null; continue; }
      const o = s as Record<string, unknown>;
      if (typeof o.id === 'string' && isPillId(o.id)) {
        const n = clampInt(o.n, 0, PILL_BY_ID[o.id].carryCap, 0);
        slots[i] = n > 0 ? { id: o.id, n } : null;
      } else {
        slots[i] = null;
      }
    }
    return slots;
  }
  // Legacy bag → slots
  if (inv.pills && typeof inv.pills === 'object') {
    return bagToPillSlots(parsePills(inv.pills));
  }
  return slots;
}

function parseSkills(raw: unknown): SkillId[] {
  if (!Array.isArray(raw)) return [];
  const out: SkillId[] = [];
  for (const id of raw) {
    if (typeof id === 'string' && isSkillId(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

function parseBlueprints(raw: unknown, owned: WeaponId[]): WeaponId[] {
  const out: WeaponId[] = [];
  const src = Array.isArray(raw) ? raw : [];
  for (const id of src) {
    if (typeof id === 'string' && isWeaponId(id) && id !== 'fist' && !out.includes(id)) out.push(id);
  }
  // Owned craftable weapons imply blueprint known; fist is not a blueprint
  for (const id of owned) {
    if (id !== 'fist' && !out.includes(id)) out.push(id);
  }
  return out;
}

function parseOwned(raw: unknown): WeaponId[] {
  const owned: WeaponId[] = [];
  const rawOwned = Array.isArray(raw) ? raw : [];
  for (const id of rawOwned) {
    // Legacy fist → drop (bare = unequipped, not a weapon id)
    if (typeof id === 'string' && id === 'fist') continue;
    if (typeof id === 'string' && isWeaponId(id) && !owned.includes(id)) owned.push(id);
  }
  return owned;
}

function parseBonus(raw: unknown): GearBonus | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const b = raw as Record<string, unknown>;
  const out: GearBonus = {};
  if (typeof b.hp === 'number') out.hp = b.hp;
  if (typeof b.atk === 'number') out.atk = b.atk;
  if (typeof b.def === 'number') out.def = b.def;
  if (typeof b.rage === 'number') out.rage = b.rage;
  if (typeof b.wugong === 'number') out.wugong = b.wugong;
  return out;
}

function parseGearBag(raw: unknown): GearItem[] {
  if (!Array.isArray(raw)) return [];
  const out: GearItem[] = [];
  for (const g of raw) {
    if (!g || typeof g !== 'object') continue;
    const o = g as Record<string, unknown>;
    const uid = typeof o.uid === 'string' ? o.uid : `g${Math.random().toString(36).slice(2, 9)}`;
    // legacy accessory → armor
    const kind: GearItem['kind'] =
      o.kind === 'accessory' || o.kind === 'armor' ? 'armor' : 'weapon';
    const identified = !!o.identified;
    const item: GearItem = { uid, kind, identified };
    if (typeof o.weaponId === 'string' && o.weaponId !== 'fist' && isWeaponId(o.weaponId)) item.weaponId = o.weaponId;
    if (typeof o.quality === 'string') item.quality = migrateQuality(o.quality);
    if (o.tier !== undefined) item.tier = clampEquipTier(o.tier, QUALITY_DEFAULT_TIER[item.quality ?? 'fan']);
    if (typeof o.name === 'string') item.name = o.name;
    if (typeof o.armorId === 'string') item.armorId = o.armorId;
    if (typeof o.slot === 'string' && isArmorSlotKind(o.slot)) {
      item.slot = o.slot;
    } else if (kind === 'armor') {
      item.slot = guessSlotFromLegacyName(item.name);
    }
    const bonus = parseBonus(o.bonus);
    if (bonus) item.bonus = bonus;
    // Keep instance affix / set id across save round-trips
    if (typeof o.wepAffix === 'string' && isWepAffixId(o.wepAffix)) item.wepAffix = o.wepAffix;
    if (typeof o.setId === 'string' && isArmorSetId(o.setId)) item.setId = o.setId;
    // v21: per-copy stat rolls + reforge allowance (weapons)
    if (kind === 'weapon') {
      if (typeof o.rollDmg === 'number' && Number.isFinite(o.rollDmg)) item.rollDmg = statRoll(o.rollDmg);
      if (typeof o.rollPoise === 'number' && Number.isFinite(o.rollPoise)) item.rollPoise = statRoll(o.rollPoise);
      if (typeof o.reforgeLeft === 'number' && Number.isFinite(o.reforgeLeft)) {
        item.reforgeLeft = clampInt(o.reforgeLeft, 0, reforgeMax(item.quality), reforgeMax(item.quality));
      }
    }
    // v12/v13: reinforce level on armor and identified/forged weapons (淬炼, not EquipTier)
    if (kind === 'armor' || kind === 'weapon') {
      if (identified || typeof o.level === 'number') {
        item.level = clampInt(o.level, 1, 5, 1);
      }
      // v22: EquipTier 1..9 — default from quality when missing
      if (identified && item.tier === undefined) {
        item.tier = QUALITY_DEFAULT_TIER[item.quality ?? 'fan'];
      }
    }
    out.push(item);
  }
  return out;
}

function parseEquippedSlots(raw: unknown, bag: GearItem[]): Partial<Record<EquipSlotId, string>> {
  const out: Partial<Record<EquipSlotId, string>> = {};
  if (!raw || typeof raw !== 'object') return out;
  const uids = new Set(bag.map((g) => g.uid));
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isEquipSlotId(k)) continue;
    if (typeof v !== 'string' || !uids.has(v)) continue;
    const item = bag.find((g) => g.uid === v);
    if (!item || item.kind !== 'armor' || !item.identified) continue;
    out[k] = v;
  }
  return out;
}

function syncSkillsFromRanks(ranks: Partial<Record<SkillId, number>>): { skills: SkillId[]; skillRanks: Partial<Record<SkillId, number>> } {
  const skillRanks: Partial<Record<SkillId, number>> = {};
  const skills: SkillId[] = [];
  for (const [k, v] of Object.entries(ranks)) {
    if (!isSkillId(k)) continue;
    const r = clampInt(v, 0, 5, 0);
    if (r >= 1) {
      skillRanks[k] = r;
      skills.push(k);
    }
  }
  return { skills, skillRanks };
}

function parseWeaponBlock(raw: Record<string, unknown>): {
  owned: WeaponId[]; levels: Partial<Record<WeaponId, number>>; quality: Partial<Record<WeaponId, InherentQuality>>; eq: WeaponId;
} {
  const owned = parseOwned(raw.ownedWeapons);
  const levels: Partial<Record<WeaponId, number>> = {};
  const quality: Partial<Record<WeaponId, InherentQuality>> = {};
  const rawLevels = (raw.weaponLevels ?? {}) as Record<string, number>;
  const rawQ = (raw.weaponQuality ?? {}) as Record<string, string>;
  for (const id of owned) {
    levels[id] = clampInt(rawLevels[id], 1, 5, 1);
    const q = rawQ[id];
    quality[id] = migrateQuality(q);
  }
  let eq: WeaponId = '';
  const rawEq = typeof raw.equippedWeapon === 'string' ? raw.equippedWeapon : '';
  if (rawEq === 'fist') {
    eq = ''; // legacy bare
  } else if (rawEq && isWeaponId(rawEq) && owned.includes(rawEq)) {
    eq = rawEq;
  }
  return { owned, levels, quality, eq };
}

function parseCombatSkills(raw: Record<string, unknown>): {
  skills: SkillId[]; skillRanks: Partial<Record<SkillId, number>>; skillProf: Partial<Record<SkillId, number>>; activeSkills: SkillId[];
} {
  let ranks: Partial<Record<SkillId, number>> = {};
  if (raw.skillRanks && typeof raw.skillRanks === 'object') {
    for (const [k, v] of Object.entries(raw.skillRanks as Record<string, unknown>)) {
      // strip legacy neijin
      if (k === 'neijin') continue;
      if (isSkillId(k)) ranks[k] = clampInt(v, 0, 5, 0);
    }
  } else {
    for (const id of parseSkills(raw.skills)) ranks[id] = 1;
  }
  const synced = syncSkillsFromRanks(ranks);
  const prof: Partial<Record<SkillId, number>> = {};
  if (raw.skillProf && typeof raw.skillProf === 'object') {
    for (const [k, v] of Object.entries(raw.skillProf as Record<string, unknown>)) {
      if (isSkillId(k) && synced.skills.includes(k)) prof[k] = clampInt(v, 0, 99999, 0);
    }
  }
  // Uncapped: every learned active is usable (ignore legacy 2-slot saves)
  const activeSkills = synced.skills.filter((s) => SKILL_BY_ID[s].kind === 'active');
  return { ...synced, skillProf: prof, activeSkills };
}

function defaultNeigong(): Pick<SaveData, 'knownNeigong' | 'equippedNeigong' | 'neigongRanks'> {
  return { knownNeigong: [], equippedNeigong: null, neigongRanks: {} };
}

/** Map legacy neijin rank → hunyuan if that 心法 is registered by a loaded 门派. */
function migrateNeijin(raw: Record<string, unknown>): Pick<SaveData, 'knownNeigong' | 'equippedNeigong' | 'neigongRanks'> {
  const ranks = (raw.skillRanks ?? {}) as Record<string, number>;
  const skills = Array.isArray(raw.skills) ? raw.skills as string[] : [];
  let nj = clampInt(ranks.neijin, 0, 5, 0);
  if (nj < 1 && skills.includes('neijin')) nj = 1;
  if (nj < 1) return defaultNeigong();
  // Only grant hunyuan when the official menpai (or another plugin) registered it
  if (!isNeigongId('hunyuan')) return defaultNeigong();
  return {
    knownNeigong: ['hunyuan'],
    equippedNeigong: 'hunyuan',
    neigongRanks: { hunyuan: nj },
  };
}


function parseRecipes(raw: Record<string, unknown>): PillId[] {
  const out: PillId[] = [];
  const src = Array.isArray(raw.knownRecipes) ? raw.knownRecipes : [];
  for (const id of src) {
    if (typeof id === 'string' && isPillId(id) && !out.includes(id)) out.push(id);
  }
  // Migration: if they already have pill stock, those recipes are known
  const stock = raw.pills && typeof raw.pills === 'object' ? raw.pills as Record<string, number> : {};
  for (const id of Object.keys(stock)) {
    if (isPillId(id) && (stock[id] ?? 0) > 0 && !out.includes(id)) out.push(id);
  }
  return out;
}

function parseNeigong(raw: Record<string, unknown>): Pick<SaveData, 'knownNeigong' | 'equippedNeigong' | 'neigongRanks'> {
  if (!('knownNeigong' in raw) && !('equippedNeigong' in raw) && !('neigongRanks' in raw)) {
    return migrateNeijin(raw);
  }
  const known: NeigongId[] = [];
  const src = Array.isArray(raw.knownNeigong) ? raw.knownNeigong : [];
  for (const id of src) {
    if (typeof id === 'string' && isNeigongId(id) && !known.includes(id)) known.push(id);
  }
  const ngRanks: Partial<Record<NeigongId, number>> = {};
  if (raw.neigongRanks && typeof raw.neigongRanks === 'object') {
    for (const [k, v] of Object.entries(raw.neigongRanks as Record<string, unknown>)) {
      if (isNeigongId(k)) ngRanks[k] = clampInt(v, 0, 5, 0);
    }
  }
  // Ensure known entries exist
  for (const id of known) {
    if (ngRanks[id] === undefined) ngRanks[id] = 0;
  }
  let eq: NeigongId | null = null;
  if (typeof raw.equippedNeigong === 'string' && isNeigongId(raw.equippedNeigong) && known.includes(raw.equippedNeigong)) {
    eq = raw.equippedNeigong;
  } else if (known.length && (ngRanks[known[0]] ?? 0) >= 1) {
    eq = known[0];
  }
  // Equipped must have rank >= 1; if wiped, clear equip
  if (eq && (ngRanks[eq] ?? 0) < 1) {
    ngRanks[eq] = 1; // safety: equipped implies at least 1 after load of mid-switch corruption
  }
  return { knownNeigong: known, equippedNeigong: eq, neigongRanks: ngRanks };
}

/**
 * Migrate v1/v2 → materials/weapons then lift through v5.
 */
function migrateFromLegacy(raw: Record<string, unknown>): SaveData {
  const base = freshSave();
  const crystals = clampInt(raw.crystals, 0, 999999, 0);
  const clears = clampInt(raw.clears, 0, 99999, 0);
  const runs = clampInt(raw.runs, 0, 99999, 0);
  const owned = parseOwned(raw.ownedWeapons);
  if (clears > 0 && !owned.includes('bell')) owned.push('bell');
  const { levels, quality, eq } = parseWeaponBlock({ ...raw, ownedWeapons: owned });
  const mats: MaterialBag = { iron: 4, bone: 3, herb: 2, cinnabar: 1 };
  const bump = (id: keyof MaterialBag, n: number) => { mats[id] = (mats[id] ?? 0) + n; };
  const u = (raw.upgrades ?? {}) as Record<string, number>;
  bump('iron', clampInt(u.vamp, 0, 5, 0) * 2 + clampInt(u.blade, 0, 5, 0) * 2);
  bump('bone', clampInt(u.armor, 0, 5, 0) * 2);
  bump('cinnabar', clampInt(u.rage, 0, 5, 0) * 2);
  bump('herb', clampInt(u.parry, 0, 2, 0) * 2 + clampInt(u.dash, 0, 3, 0));
  const a = (raw.attrs ?? {}) as Record<string, number>;
  const attrSum = clampInt(a.hp, 0, 10, 0) + clampInt(a.atk, 0, 10, 0) + clampInt(a.def, 0, 10, 0) + clampInt(a.rage, 0, 10, 0);
  bump('iron', attrSum);
  bump('herb', Math.ceil(attrSum / 2));
  const unspent = clampInt(raw.unspent, 0, 99, 0);
  const level = clampInt(raw.level, 1, 20, 1);
  return {
    ...base,
    crystals: crystals + unspent * 8 + Math.max(0, level - 1) * 5,
    materials: mats,
    blueprints: [...owned],
    ownedWeapons: owned,
    weaponLevels: levels,
    weaponQuality: quality,
    equippedWeapon: eq,
    runInv: { potions: clampInt((raw.runInv as { potions?: number } | undefined)?.potions, 0, 9, 0), pillSlots: emptyPillSlots(), talismanSlots: emptyTalismanSlots() },
    runs,
    clears,
  };
}

/**
 * v13: ensure each ownedWeapons type has ≥1 identified GearItem (kind weapon),
 * set equippedWeaponUid from equippedWeapon, keep type mirrors in sync.
 */
function ensureWeaponInstances(data: SaveData): void {
  const byType = new Map<WeaponId, GearItem[]>();
  for (const g of data.gearBag) {
    if (g.kind !== 'weapon' || !g.weaponId) continue;
    const list = byType.get(g.weaponId) ?? [];
    list.push(g);
    byType.set(g.weaponId, list);
  }

  const ensureOwned = (id: WeaponId) => {
    if (!data.ownedWeapons.includes(id)) data.ownedWeapons.push(id);
  };

  for (const id of [...data.ownedWeapons]) {
    if (id === 'fist' || !isWeaponId(id)) continue; // bare / unknown — do not materialize
    const list = byType.get(id) ?? [];
    const identified = list.filter((g) => g.identified);
    if (identified.length === 0) {
      const lv = clampInt(data.weaponLevels[id], 1, 5, 1);
      const q = data.weaponQuality[id] ?? 'fan';
      const item: GearItem = {
        uid: `mig-w-${id}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'weapon',
        identified: true,
        weaponId: id,
        name: WEAPON_BY_ID[id]?.name ?? id,
        quality: q,
        tier: QUALITY_DEFAULT_TIER[q],
        level: lv,
      };
      data.gearBag.push(item);
      const next = byType.get(id) ?? [];
      next.push(item);
      byType.set(id, next);
    } else {
      for (const g of identified) {
        if (g.level === undefined) g.level = clampInt(data.weaponLevels[id], 1, 5, 1);
        if (!g.quality) g.quality = data.weaponQuality[id] ?? 'fan';
        if (g.tier === undefined) g.tier = QUALITY_DEFAULT_TIER[g.quality ?? 'fan'];
        if (!g.name) g.name = WEAPON_BY_ID[id]?.name ?? id;
      }
    }
    ensureOwned(id);
  }

  // Strip legacy fist gear (bare = unequipped, not a WeaponDef)
  data.gearBag = data.gearBag.filter((g) => !(g.kind === 'weapon' && g.weaponId === 'fist'));
  for (const id of ['fist']) {
    byType.delete(id as WeaponId);
    data.ownedWeapons = data.ownedWeapons.filter((w) => w !== id);
    delete data.weaponLevels[id as WeaponId];
    delete data.weaponQuality[id as WeaponId];
  }
  if (data.equippedWeapon === 'fist') data.equippedWeapon = '';

  // Resolve equippedWeaponUid — missing / fist → bare (empty)
  let eqUid = typeof (data as SaveData).equippedWeaponUid === 'string'
    ? (data as SaveData).equippedWeaponUid
    : undefined;
  if (eqUid) {
    const hit = data.gearBag.find((g) => g.uid === eqUid && g.kind === 'weapon' && g.identified && g.weaponId !== 'fist');
    if (!hit) eqUid = undefined;
  }
  if (!eqUid && data.equippedWeapon && data.equippedWeapon !== 'fist') {
    const prefer = data.equippedWeapon;
    const candidates = (byType.get(prefer) ?? []).filter((g) => g.identified);
    const pick = candidates[0];
    if (pick) {
      eqUid = pick.uid;
      data.equippedWeapon = pick.weaponId ?? '';
    }
  }
  data.equippedWeaponUid = eqUid ?? '';

  // Sync type mirrors from equipped instance
  if (eqUid) {
    const eq = data.gearBag.find((g) => g.uid === eqUid);
    if (eq?.weaponId) {
      data.equippedWeapon = eq.weaponId;
      data.weaponLevels[eq.weaponId] = eq.level ?? 1;
      data.weaponQuality[eq.weaponId] = eq.quality ?? 'fan';
    }
  } else {
    data.equippedWeapon = '';
  }
  // Rebuild ownedWeapons from identified weapon instances (no fist)
  const ownedSet = new Set<WeaponId>();
  for (const g of data.gearBag) {
    if (g.kind === 'weapon' && g.identified && g.weaponId && g.weaponId !== 'fist') ownedSet.add(g.weaponId);
  }
  data.ownedWeapons = [...ownedSet];
}



function parseTalismans(raw: unknown): TalismanBag {
  const out: TalismanBag = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isTalismanId(k)) out[k] = clampInt(v, 0, 99, 0);
  }
  return out;
}

function parseKnownTalismans(raw: unknown, bag: TalismanBag): TalismanId[] {
  const out: TalismanId[] = [];
  if (Array.isArray(raw)) {
    for (const id of raw) {
      if (typeof id === 'string' && isTalismanId(id) && !out.includes(id)) out.push(id);
    }
  }
  for (const id of Object.keys(bag) as TalismanId[]) {
    if ((bag[id] ?? 0) > 0 && !out.includes(id)) out.push(id);
  }
  return out;
}

function parseOneTalismanSlot(raw: unknown): TalismanSlot {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id === 'string' && isTalismanId(o.id)) {
    const n = clampInt(o.n, 0, 9, 0);
    return n > 0 ? { id: o.id, n } : null;
  }
  return null;
}

/** v16 dual slots; migrate v15 single `talisman` into [0]. */
function parseTalismanSlots(rawInv: unknown): TalismanSlot[] {
  const out = emptyTalismanSlots();
  if (!rawInv || typeof rawInv !== 'object') return out;
  const inv = rawInv as Record<string, unknown>;
  if (Array.isArray(inv.talismanSlots)) {
    for (let i = 0; i < TALISMAN_SLOT_COUNT; i++) {
      out[i] = parseOneTalismanSlot(inv.talismanSlots[i]);
    }
    return out;
  }
  // v15 single slot
  if (inv.talisman) out[0] = parseOneTalismanSlot(inv.talisman);
  return out;
}

function parseClearedActs(raw: unknown, clears: number): number[] {
  const out: number[] = [];
  if (Array.isArray(raw)) {
    for (const v of raw) {
      const n = typeof v === 'number' ? Math.floor(v) : -1;
      if (n >= 0 && n <= 3 && !out.includes(n)) out.push(n);
    }
  }
  // Migrate: any prior full clear unlocks all acts
  if (clears > 0 && out.length === 0) {
    out.push(0, 1, 2, 3);
  }
  return out;
}

function toV5(raw: Record<string, unknown>): SaveData {
  const base = freshSave();
  const { owned, levels, quality, eq } = parseWeaponBlock(raw);
  const combat = parseCombatSkills(raw);
  const ng = parseNeigong(raw);
  const gearBag = parseGearBag(
    (raw as { gearBag?: unknown; gear?: unknown }).gearBag ?? (raw as { gear?: unknown }).gear,
  );
  const data: SaveData = {
    ...base,
    crystals: clampInt(raw.crystals, 0, 999999, 0),
    materials: parseMaterials(raw.materials),
    blueprints: parseBlueprints(raw.blueprints, owned),
    ownedWeapons: owned,
    weaponLevels: levels,
    weaponQuality: quality,
    equippedWeapon: eq,
    gearBag,
    equippedSlots: {},
    skills: combat.skills,
    skillRanks: combat.skillRanks,
    skillProf: combat.skillProf,
    activeSkills: combat.activeSkills,
    knownNeigong: ng.knownNeigong,
    equippedNeigong: ng.equippedNeigong,
    neigongRanks: ng.neigongRanks,
    knownRecipes: parseRecipes(raw),
    pills: parsePills(raw.pills),
    talismans: parseTalismans((raw as { talismans?: unknown }).talismans),
    knownTalismans: [],
    runInv: {
      potions: clampInt((raw.runInv as { potions?: number } | undefined)?.potions, 0, 9, 0),
      pillSlots: parsePillSlots(raw.runInv),
      talismanSlots: parseTalismanSlots(raw.runInv),
    },
    runs: clampInt(raw.runs, 0, 99999, 0),
    clears: clampInt(raw.clears, 0, 99999, 0),
    unlockedAct: clampInt((raw as { unlockedAct?: unknown }).unlockedAct, 0, 3, 0),
    clearedActs: parseClearedActs((raw as { clearedActs?: unknown }).clearedActs, clampInt(raw.clears, 0, 99999, 0)),
  };
  // v8 slots; pre-v8 accessories stay unequipped in bag
  data.equippedSlots = parseEquippedSlots(
    (raw as { equippedSlots?: unknown }).equippedSlots,
    data.gearBag,
  );
  data.knownTalismans = parseKnownTalismans(
    (raw as { knownTalismans?: unknown }).knownTalismans,
    data.talismans,
  );
  // No framework starter talisman — empty known list stays empty.
  // v13 equippedWeaponUid (if already present)
  const rawEqUid = (raw as { equippedWeaponUid?: unknown }).equippedWeaponUid;
  if (typeof rawEqUid === 'string') data.equippedWeaponUid = rawEqUid;
  ensureWeaponInstances(data);
  // Unlock next act after highest cleared; prior clears unlock all
  if (data.clears > 0) {
    data.unlockedAct = Math.max(data.unlockedAct, 3);
    for (let i = 0; i < 4; i++) if (!data.clearedActs.includes(i)) data.clearedActs.push(i);
  } else if (data.clearedActs.length) {
    const maxCleared = Math.max(...data.clearedActs);
    data.unlockedAct = Math.max(data.unlockedAct, Math.min(3, maxCleared + 1));
  }
  data.pendingCurseCleanse = !!(raw as { pendingCurseCleanse?: unknown }).pendingCurseCleanse;
  data.unlockedTitles = Array.isArray((raw as { unlockedTitles?: unknown }).unlockedTitles)
    ? ((raw as { unlockedTitles: string[] }).unlockedTitles.filter(Boolean) as import('./titles').TitleId[])
    : [];
  data.knownSetQualities = Array.isArray((raw as { knownSetQualities?: unknown }).knownSetQualities)
    ? (raw as { knownSetQualities: unknown[] }).knownSetQualities.map(migrateQuality)
    : [];
  data.knownArmorSets = Array.isArray((raw as { knownArmorSets?: unknown }).knownArmorSets)
    ? ((raw as { knownArmorSets: string[] }).knownArmorSets.filter(
        (id) => typeof id === 'string',
      ) as import('./armorSets').ArmorSetId[])
    : [];
  // migrate: leave setId on gear as-is if present
  for (const g of data.gearBag) {
    if (g.kind === 'armor' && g.setId && typeof g.setId === 'string') {
      /* keep */
    }
  }
  data.legacyPending = !!(raw as { legacyPending?: unknown }).legacyPending;
  data.dojoVisits = typeof (raw as { dojoVisits?: unknown }).dojoVisits === 'number'
    ? Math.max(0, Math.floor((raw as { dojoVisits: number }).dojoVisits)) : 0;
  // codex
  {
    const rawC = (raw as { codex?: unknown }).codex;
    data.codex = emptyCodex();
    if (rawC && typeof rawC === 'object') {
      const o = rawC as Record<string, unknown>;
      if (Array.isArray(o.elites)) data.codex.elites = o.elites as never[];
      if (Array.isArray(o.affixes)) data.codex.affixes = o.affixes as never[];
      if (Array.isArray(o.fragments)) data.codex.fragments = o.fragments as never[];
      if (Array.isArray(o.talismans)) data.codex.talismans = o.talismans as never[];
      if (Array.isArray(o.wepAffixes)) data.codex.wepAffixes = o.wepAffixes as never[];
    }
  }
  // migrate wepAffix on gear
  for (const g of data.gearBag) {
    if (g.kind === 'weapon' && g.identified && !g.wepAffix && g.weaponId && g.weaponId !== 'fist') {
      // leave empty for old gear; reforge can add
    }
  }
  // v21: identified weapons without a reforge counter get their full allowance.
  // Missing stat rolls stay undefined (= neutral 100%), no surprises for old saves.
  for (const g of data.gearBag) {
    if (g.kind === 'weapon' && g.identified && g.reforgeLeft === undefined) {
      g.reforgeLeft = reforgeMax(g.quality);
    }
  }
  // v22: migrate legacy quality ids + ensure EquipTier on identified gear.
  for (const g of data.gearBag) {
    if (g.quality) g.quality = migrateQuality(g.quality);
    if (g.identified && g.tier === undefined) {
      g.tier = QUALITY_DEFAULT_TIER[g.quality ?? 'fan'];
    }
  }
  data.version = 22;
  if (data.pendingCurseCleanse == null) data.pendingCurseCleanse = false;
  return data;
}

export function normalize(raw: Partial<SaveData> | Record<string, unknown> | null | undefined): SaveData {
  const base = freshSave();
  if (!raw || typeof raw !== 'object') return base;
  const ver = (raw as { version?: number }).version;
  if (ver === 1 || ver === 2) return toV5(migrateFromLegacy(raw as Record<string, unknown>) as unknown as Record<string, unknown>);
  if (typeof ver === 'number' && ver >= 3 && ver <= 22) return toV5(raw as Record<string, unknown>);
  if ('level' in raw || 'attrs' in raw || 'upgrades' in raw) {
    return toV5(migrateFromLegacy(raw as Record<string, unknown>) as unknown as Record<string, unknown>);
  }
  if ('skills' in raw || 'skillRanks' in raw || 'crystals' in raw) return toV5(raw as Record<string, unknown>);
  return base;
}

export function loadSave(): SaveData {
  try {
    const t = localStorage.getItem(SAVE_KEY);
    if (!t) return freshSave();
    return normalize(JSON.parse(t) as Partial<SaveData>);
  } catch {
    return freshSave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(normalize(data)));
  } catch { /* */ }
}

export function clearSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* */ }
}

export { WEAPON_BY_ID };
