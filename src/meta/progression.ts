/**
 * Meta v3 — craft / identify / skills / alchemy. No levels or attribute points.
 *
 * Kill rewards: crystals + materials; blueprint / gear / 丹方仅精英或 Boss。
 * Boss clear: chests grant loot (葬钟图纸 / 妖核 / 玄铁 via chest tables, not silent settle).
 */
import type { GearItem, RunLootSummary, RunMods, RunRewards, SaveData } from './types';
import { clearSave, freshSave, loadSave, writeSave } from './save';
import {
  WEAPON_BY_ID, WEAPON_LEVEL_MAX, WEAPONS,
  weaponUpgradeCost, CATEGORY_NAME, weaponCategory, isWeaponId, unknownBlueprintPool,
  type WeaponDef, type WeaponId,
} from './weapons';
import {
  MATERIAL_BY_ID, MATERIALS, addMaterial, hasMaterials, spendMaterials,
  rollMaterials, isMaterialId, type MaterialId, type MaterialBag,
} from './materials';
import {
  SKILLS, SKILL_BY_ID, MAX_ACTIVE_SLOTS, SKILL_RANK_MAX, isSkillId,
  effectsAtRank, tipAtRank, profToNext, skillUsableWith, gateLabel,
  type SkillId,
} from './skills';
import {
  NEIGONGS, NEIGONG_BY_ID, NEIGONG_RANK_MAX, isNeigongId,
  neigongEffects, neigongTip, neigongMeditateCost, NEIGONG_RETRAIN_FEE, neigongMaxTip,
  type NeigongId,
} from './neigong';
import {
  PILLS, PILL_BY_ID, isPillId, emptyPillSlots, pillSlotsCount, PILL_SLOT_COUNT,
  PILL_SHORT, PILL_COLOR,
  type PillId, type PillSlot,
} from './alchemy';
import {
  CRAFT_RECIPES, IDENTIFY_FEE, QUALITY_NAME, QUALITY_COLOR, LOOT_TINT, MATERIAL_QUALITY,
  qualityBonus, rollQuality, rollCraftQuality, rollStatMul, statRoll, QUALITY_DEFAULT_TIER, type Quality,
} from './craft';
import { sellPrice, sellNeedsConfirm, matSellPrice, matBuyPrice } from './sell';
import {
  ARMOR_BY_ID, EQUIP_SLOTS, SLOT_KIND_NAME, rollArmorDef, equipTargetsFor,
  ARMOR_LEVEL_MAX, armorUpgradeCost, armorUpgradeMats, computeArmorBonus,
  isArmorSlotKind, type EquipSlotId, type ArmorSlotKind,
} from './gear';
import type { EnemyDef, EnemyLootEntry } from '../entities/enemies/factory';
import {
  isInherentQuality,
  isEliteOnlyKillLootKind,
  KILL_LOOT_CHANCE,
  ELITE_ONLY_TABLE_CHANCE_MUL,
} from './taxonomy';
import { computeMaxArmor, gearArmorPoints, maxNeiliFor, neiliRegenFor } from '../combat/hardcore';
import { rollWepAffix, reforgeLeft, reforgeMax, REFORGE_FEE, REFORGE_MATS, WEP_AFFIXES, WEP_AFFIX_BY_ID, isWepAffixId, type WepAffixId } from './weaponInstAffix';
import { TITLES, TITLE_BY_ID, type TitleId, emptyTitleProgress } from './titles';
import { emptyCodex, codexDiscover, type CodexData } from './codex';
import { computeSetEcho, setEchoBonuses, setEchoLabel } from './setEcho';
import {
  rollArmorSetId, computeNamedSet, activeSetBonuses, namedSetLabel,
  setProgressInBag, ARMOR_SETS, ARMOR_SET_BY_ID, isArmorSetId, setDisplayName,
  type ArmorSetId,
} from './armorSets';
import { actPool } from '../level/actPools';
import {
  TALISMANS, TALISMAN_BY_ID, isTalismanId, emptyTalismanSlots, cloneTalismanSlots,
  TALISMAN_SLOT_COUNT, type TalismanId, type TalismanSlot,
} from './talismans';

let _uid = 0;
function nextUid(): string {
  _uid++;
  return `g${Date.now().toString(36)}${_uid}`;
}

export class Progression {
  data: SaveData;
  runCrystals = 0;
  /** Act bias for armor set drops (set by Game). */
  _lootAct = 0;
  runParries = 0;
  runLoot: RunLootSummary = { materials: {}, blueprints: [], gear: 0 };
  /** Most recent forged weapon (for the hub toast). */
  lastCrafted: GearItem | null = null;
  private dirty = false;

  constructor(seed?: SaveData) {
    this.data = seed ? { ...seed } : loadSave();
    this.ensureSkillLists(); // sync uncapped actives
  }

  persist(): void {
    if (!this.dirty) return;
    writeSave(this.data);
    this.dirty = false;
  }

  mark(): void { this.dirty = true; this.persist(); }

  reset(): void {
    clearSave();
    this.data = freshSave();
    this.dirty = false;
  }

  // ---- queries ----

  owns(id: WeaponId): boolean { return this.data.ownedWeapons.includes(id); }
  knowsBlueprint(id: WeaponId): boolean { return this.data.blueprints.includes(id); }
  /** Type-level level (legacy); prefer instance via equippedWeaponItem / bagWeapons. */
  weaponLevel(id: WeaponId): number { return this.data.weaponLevels[id] ?? (this.owns(id) ? 1 : 0); }
  weaponQuality(id: WeaponId): Quality { return this.data.weaponQuality[id] ?? 'fan'; }
  equipped(): WeaponDef | undefined {
    const id = this.data.equippedWeapon;
    if (!id) return undefined;
    return WEAPON_BY_ID[id];
  }

  /** Identified weapon instances in bag (including equipped). */
  bagWeapons(filter?: WeaponId): GearItem[] {
    return this.data.gearBag.filter((g) => {
      if (g.kind !== 'weapon' || !g.identified || !g.weaponId) return false;
      if (filter && g.weaponId !== filter) return false;
      return true;
    });
  }

  equippedWeaponItem(): GearItem | undefined {
    const uid = this.data.equippedWeaponUid;
    if (!uid) return undefined;
    const g = this.gearByUid(uid);
    if (!g || g.kind !== 'weapon' || !g.identified) return undefined;
    return g;
  }

  private syncWeaponMirrorsFrom(item: GearItem): void {
    if (!item.weaponId) return;
    this.data.equippedWeapon = item.weaponId;
    this.data.equippedWeaponUid = item.uid;
    this.data.weaponLevels[item.weaponId] = item.level ?? 1;
    this.data.weaponQuality[item.weaponId] = item.quality ?? 'fan';
    if (!this.data.ownedWeapons.includes(item.weaponId)) {
      this.data.ownedWeapons.push(item.weaponId);
    }
  }

  private ensureOwnedType(id: WeaponId): void {
    if (!this.data.ownedWeapons.includes(id)) this.data.ownedWeapons.push(id);
  }
  hasSkill(id: SkillId): boolean { return this.skillRank(id) >= 1; }
  skillRank(id: SkillId): number { return this.data.skillRanks[id] ?? 0; }
  skillProf(id: SkillId): number { return this.data.skillProf[id] ?? 0; }

  knowsNeigong(id: NeigongId): boolean { return this.data.knownNeigong.includes(id); }
  neigongRank(id: NeigongId): number { return this.data.neigongRanks[id] ?? 0; }
  equippedNeigong(): NeigongId | null { return this.data.equippedNeigong; }

  mat(id: MaterialId): number { return this.data.materials[id] ?? 0; }
  pillStock(id: PillId): number { return this.data.pills[id] ?? 0; }
  knowsRecipe(id: PillId): boolean { return this.data.knownRecipes.includes(id); }

  unlockRecipe(id: PillId): boolean {
    if (!isPillId(id) || this.knowsRecipe(id)) return false;
    this.data.knownRecipes.push(id);
    this.mark();
    return true;
  }

  /** Loot / drop unlock for a talisman recipe (fog reveal). Soft: unknown id → false. */
  unlockTalismanDrop(id: TalismanId): boolean {
    if (!isTalismanId(id) || this.knowsTalisman(id)) return false;
    this.data.knownTalismans.push(id);
    this.mark();
    return true;
  }

  /** First time a material is obtained, unlock recipes that use it (fog reveal). */
  discoverRecipesForMat(mat: MaterialId): PillId[] {
    const unlocked: PillId[] = [];
    for (const p of PILLS) {
      if (this.knowsRecipe(p.id)) continue;
      if (p.cost[mat]) {
        this.data.knownRecipes.push(p.id);
        unlocked.push(p.id);
      }
    }
    if (unlocked.length) this.mark();
    return unlocked;
  }

  /** Parallel to丹方：拾得相关材料后领悟可绘符咒（hub 不展示未获条目）。 */
  discoverTalismansForMat(mat: MaterialId): TalismanId[] {
    const unlocked: TalismanId[] = [];
    for (const t of TALISMANS) {
      if (this.knowsTalisman(t.id)) continue;
      if (t.cost[mat]) {
        this.data.knownTalismans.push(t.id);
        unlocked.push(t.id);
      }
    }
    if (unlocked.length) this.mark();
    return unlocked;
  }

  private ensureSkillLists(): void {
    const skills: SkillId[] = [];
    for (const [k, r] of Object.entries(this.data.skillRanks)) {
      if (isSkillId(k) && (r ?? 0) >= 1) skills.push(k);
    }
    this.data.skills = skills;
    // All learned actives are always available (no equip-slot cap)
    this.data.activeSkills = skills.filter((id) => SKILL_BY_ID[id].kind === 'active');
  }

  /** Every learned active 外功 (uncapped). */
  learnedActives(): SkillId[] {
    return this.data.skills.filter((id) => SKILL_BY_ID[id]?.kind === 'active');
  }

  mods(): RunMods {
    const { skills, runInv, skillRanks, equippedNeigong } = this.data;
    const eqItem = this.equippedWeaponItem();
    const equippedWeapon: WeaponId = eqItem?.weaponId ?? (this.data.equippedWeapon || '');
    const wLevel = eqItem?.level ?? (equippedWeapon ? (this.data.weaponLevels[equippedWeapon] ?? 1) : 1);
    const q: Quality = eqItem?.quality ?? (equippedWeapon ? (this.data.weaponQuality[equippedWeapon] ?? 'fan') : 'fan');
    const qb = qualityBonus(q);
    let maxHp = 100;
    let atk = 1;
    let def = 0;
    let rage = 1;
    let doubleJump = false;
    let canDash = false;
    let jumpBoost = 1;
    let dashKickBonus = 0;
    let pojunMult = 1.55, pojunDuration = 360, pojunCd = 1080, healAmt = 28, healCd = 1320;
    let wugongBonus = 0;
    const ngId = equippedNeigong;
    const ngRank = ngId ? this.neigongRank(ngId) : 0;
    let ngFx = ngId && ngRank >= 1 ? neigongEffects(ngId, ngRank) : null;
    if (ngFx) {
      wugongBonus = ngFx.damageBonus;
      rage += ngFx.rageBonus;
      def += ngFx.defBonus;
    }
    // 具名套装 + 品质影兜底
    const eqArmor: GearItem[] = [];
    for (const slot of EQUIP_SLOTS) {
      const uid = this.data.equippedSlots[slot.id];
      if (!uid) continue;
      const g = this.data.gearBag.find((x) => x.uid === uid);
      if (g) eqArmor.push(g);
    }
    const named = computeNamedSet(eqArmor, this.data.knownArmorSets ?? []);
    if (named.id && named.count >= 2) this.noteArmorSet(named.id);
    const sb = activeSetBonuses(named);
    def += sb.def ?? 0;
    atk += sb.atk ?? 0;
    rage += sb.rage ?? 0;
    // 品质「影」仅在无具名 2 件时微弱兜底
    let echoLabel = '';
    if (!named.id || named.count < 2) {
      const echo = computeSetEcho(eqArmor, this.data.knownSetQualities ?? []);
      if (echo.revealed && echo.quality) this.noteSetQuality(echo.quality);
      const eb = setEchoBonuses(echo);
      def += eb.def;
      atk += eb.atk;
      echoLabel = setEchoLabel(echo);
    } else {
      const named2 = computeNamedSet(eqArmor, this.data.knownArmorSets ?? []);
      echoLabel = namedSetLabel(named2);
    }
    // 称号 QoL
    let startPotionsBonus = 0;
    let parryTitle = 0;
    for (const tid of this.data.unlockedTitles ?? []) {
      const td = TITLE_BY_ID[tid];
      if (td.startPotions) startPotionsBonus += td.startPotions;
      if (td.parryWindowBonus) parryTitle += td.parryWindowBonus;
    }
    // Aggregate passive/active effect tables from every learned skill (plugin-safe)
    for (const sid of this.data.skills) {
      const r = this.skillRank(sid);
      if (r < 1) continue;
      const defTable = SKILL_BY_ID[sid]?.effects;
      const fx = effectsAtRank(sid, r);
      def += fx.defBonus;
      if (fx.doubleJump) { doubleJump = true; jumpBoost = Math.max(jumpBoost, fx.jumpBoost); }
      else if (defTable?.jumpBoost) jumpBoost = Math.max(jumpBoost, fx.jumpBoost);
      if (fx.canDash) canDash = true;
      dashKickBonus += fx.dashKickBonus;
      if (defTable?.pojunMult) { pojunMult = fx.pojunMult; pojunDuration = fx.pojunDuration; pojunCd = fx.pojunCd; }
      if (defTable?.healAmt) { healAmt = fx.healAmt; healCd = fx.healCd; }
    }
    const gearBonuses: { hp?: number; def?: number }[] = [];
    for (const slot of EQUIP_SLOTS) {
      const uid = this.data.equippedSlots[slot.id];
      if (!uid) continue;
      const g = this.data.gearBag.find((x) => x.uid === uid);
      if (!g?.identified || g.kind !== 'armor' || !g.bonus) continue;
      maxHp += g.bonus.hp ?? 0;
      atk += (g.bonus.atk ?? 0) / 100;
      def += (g.bonus.def ?? 0) / 100;
      rage += g.bonus.rage ?? 0;
      wugongBonus += (g.bonus.wugong ?? 0) / 100;
      gearBonuses.push(g.bonus);
    }
    def = Math.min(0.55, def);
    const maxArmor = computeMaxArmor({ gearArmor: gearArmorPoints(gearBonuses), defPercent: def });
    const maxNeili = maxNeiliFor(ngRank);
    let neiliRegen = neiliRegenFor(ngRank);
    if (ngFx) neiliRegen *= ngFx.neiliRegenMul;
    if (sb.neiliRegenMul) neiliRegen *= sb.neiliRegenMul;
    const wItem = this.equippedWeaponItem();
    const wepAffix = wItem?.wepAffix;
    return {
      maxHp,
      atk: atk * qb.damage,
      def,
      chip: 1,
      rage,
      parryWindow: 10 + (ngFx?.parryWindowBonus ?? 0) + parryTitle + (sb.parryWindowBonus ?? 0),
      dashIframes: 13 + (sb.dashIframes ?? 0),
      enemyScale: 1,
      startPotions: runInv.potions + startPotionsBonus,
      weaponId: equippedWeapon,
      weaponLevel: wLevel,
      weaponQuality: q,
      weaponRollDmg: statRoll(eqItem?.rollDmg),
      weaponRollPoise: statRoll(eqItem?.rollPoise),
      doubleJump,
      canDash,
      jumpBoost,
      dashKickBonus,
      pojunMult, pojunDuration, pojunCd, healAmt, healCd,
      activeSkills: skills.filter((s) => SKILL_BY_ID[s]?.kind === 'active'),
      startPillSlots: (runInv.pillSlots ?? emptyPillSlots()).map((s) => (s ? { ...s } : null)),
      startTalismanSlots: cloneTalismanSlots(runInv.talismanSlots),
      skillRanks: { ...skillRanks },
      wugongBonus,
      equippedNeigong: ngId,
      neigongRank: ngRank,
      maxArmor,
      maxNeili,
      neiliRegen,
      wepAffix: wepAffix ?? null,
      neigongPoiseMul: ngFx?.poiseMul ?? 1,
      neigongExecuteMul: ngFx?.executeMul ?? 1,
      neigongLifesteal: ngFx?.lifesteal ?? 0,
      neigongParryRage: ngFx?.parryRageBonus ?? 0,
      setEchoLabel: echoLabel,
      setDashCdMul: sb.dashCdMul,
      setDashIframes: sb.dashIframes,
      setDmgTakenMul: sb.dmgTakenMul,
      setLifesteal: sb.lifesteal,
      setExecuteMul: sb.executeMul,
      setPoiseMul: sb.poiseMul,
      setNeiliRegenMul: sb.neiliRegenMul,
      setParryWindowBonus: sb.parryWindowBonus,
      setAffixDmgMul: sb.affixDmgMul,
      setCurseTakenMul: sb.curseTakenMul,
    };
  }

  beginRun(): RunMods {
    const m = this.mods();
    this.runCrystals = 0;
    this.runParries = 0;
    this.runLoot = { materials: {}, blueprints: [], gear: 0 };
    this.data.runs++;
    this.data.runInv = { potions: 0, pillSlots: emptyPillSlots(), talismanSlots: emptyTalismanSlots() };
    this.mark();
    return m;
  }

  /** Highest act the player may start from hub (0..3). */
  unlockedAct(): number {
    return Math.max(0, Math.min(3, this.data.unlockedAct | 0));
  }

  /** Act indices cleared at least once. */
  clearedActs(): number[] {
    return [...(this.data.clearedActs ?? [])];
  }

  /**
   * Mark an act cleared and unlock the next. Does not settle the run.
   * Full-campaign clear still goes through settle(victory).
   */
  onActCleared(actIndex: number): void {
    const i = Math.max(0, Math.min(3, actIndex | 0));
    if (!this.data.clearedActs.includes(i)) this.data.clearedActs.push(i);
    this.data.unlockedAct = Math.max(this.data.unlockedAct, Math.min(3, i + 1));
    // Clearing final act also marks campaign unlock complete
    if (i >= 3) this.data.unlockedAct = 3;
    this.mark();
  }

  /**
   * ?boss=1 jump target: highest unlocked act (final if all unlocked).
   */
  bossJumpAct(): number {
    return this.unlockedAct();
  }

  // ---- earning during a run ----

  /**
   * Roll kill loot descriptors. Does NOT bank materials/gear/blueprints into runLoot —
   * banking happens when the player picks up the ground drop (or vacuum on settle/arena exit).
   * Crystals still credit to runCrystals immediately (orb pickup is bonus).
   */
  onKill(enemyMaxHp: number, isElite = false, isBoss = false): {
    crystals: number;
    orb: number;
    materials: MaterialId[];
    blueprint?: WeaponId;
    gear?: GearItem;
  } {
    const crystals = 2 + Math.floor(enemyMaxHp / 40);
    this.runCrystals += crystals;

    let materials: MaterialId[] = [];
    let blueprint: WeaponId | undefined;
    let gear: GearItem | undefined;

    // Materials: normals often 1–2 kinds; elites 2–4 different kinds (unchanged)
    if (isElite || isBoss) {
      materials = rollMaterials(2 + Math.floor(Math.random() * 3), Math.random() < 0.55);
    } else if (Math.random() < 0.55) {
      const n = Math.random() < 0.4 ? 2 : 1;
      materials = rollMaterials(n, Math.random() < 0.12);
    }
    // 图纸 / 装备：仅精英或 Boss；普通杂兵恒 0（尺子见 taxonomy.KILL_LOOT_CHANCE）
    const rareOk = isElite || isBoss;
    if (rareOk) {
      const bpChance = isBoss ? KILL_LOOT_CHANCE.blueprintBoss : KILL_LOOT_CHANCE.blueprintElite;
      if (Math.random() < bpChance) {
        const candidates = unknownBlueprintPool((id) => this.knowsBlueprint(id));
        if (candidates.length) {
          blueprint = candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
      const gearChance = isBoss ? KILL_LOOT_CHANCE.gearBoss : KILL_LOOT_CHANCE.gearElite;
      if (Math.random() < gearChance) {
        gear = this.makeUnidentifiedDrop(true, this._lootAct);
      }
    }

    const orb = Math.random() < 0.18 ? 3 + Math.floor(Math.random() * 3) : 0;
    return { crystals, orb, materials, blueprint, gear };
  }

  /**
   * Roll EnemyDef.loot — **additional** independent chance rolls beside global onKill /
   * secret skill·neigong rates. Soft catalog ids: if missing from the live catalog at
   * roll time, skip silently (no throw). Does not bank; returns pickup / unlock descriptors.
   *
   * 图纸 / 装备 / 丹方（taxonomy.ELITE_ONLY_KILL_LOOT_KINDS）仅精英或 Boss 可掷；
   * 普通杂兵跳过。精英表内该类 chance 再乘 ELITE_ONLY_TABLE_CHANCE_MUL。
   *
   * @param opts.elite  精英击杀（eliteMod）
   * @param opts.boss   Boss 档（EnemyDef.isBoss）
   */
  rollEnemyDefLoot(
    def: EnemyDef | null | undefined,
    opts: { elite?: boolean; boss?: boolean } = {},
  ): {
    pickups: Array<{
      kind: 'material' | 'crystal' | 'blueprint' | 'gear';
      materialId?: MaterialId;
      materialN?: number;
      amount?: number;
      blueprintId?: WeaponId;
      gear?: GearItem;
    }>;
    banners: Array<{ title: string; sub: string }>;
  } {
    const pickups: Array<{
      kind: 'material' | 'crystal' | 'blueprint' | 'gear';
      materialId?: MaterialId;
      materialN?: number;
      amount?: number;
      blueprintId?: WeaponId;
      gear?: GearItem;
    }> = [];
    const banners: Array<{ title: string; sub: string }> = [];
    const table = def?.loot;
    if (!table || !table.length) return { pickups, banners };

    const rareOk = !!opts.elite || !!opts.boss;
    for (const entry of table) {
      // 图纸 / 装备 / 丹方：普通杂兵直接跳过
      if (isEliteOnlyKillLootKind(entry.kind) && !rareOk) continue;
      let chance = entry.chance;
      if (isEliteOnlyKillLootKind(entry.kind) && !opts.boss) {
        chance *= ELITE_ONLY_TABLE_CHANCE_MUL;
      }
      if (!(chance > 0) || Math.random() >= chance) continue;
      const got = this.resolveEnemyLootEntry(entry);
      if (!got) continue;
      if (got.pickup) pickups.push(got.pickup);
      if (got.banner) banners.push(got.banner);
    }
    return { pickups, banners };
  }

  /** Resolve one loot entry against live catalogs; null = skip (missing id / already known). */
  private resolveEnemyLootEntry(entry: EnemyLootEntry): {
    pickup?: {
      kind: 'material' | 'crystal' | 'blueprint' | 'gear';
      materialId?: MaterialId;
      materialN?: number;
      amount?: number;
      blueprintId?: WeaponId;
      gear?: GearItem;
    };
    banner?: { title: string; sub: string };
  } | null {
    const id = entry.id;
    switch (entry.kind) {
      case 'material': {
        if (!id || !isMaterialId(id)) return null;
        const n = Math.max(1, entry.amount ?? 1);
        return { pickup: { kind: 'material', materialId: id, materialN: n } };
      }
      case 'crystal': {
        const amount = Math.max(1, entry.amount ?? 3);
        return { pickup: { kind: 'crystal', amount } };
      }
      case 'blueprint': {
        if (!id || !isWeaponId(id)) return null;
        return { pickup: { kind: 'blueprint', blueprintId: id } };
      }
      case 'gear': {
        const gear = this.makeLootTableGear(entry);
        if (!gear) return null;
        return { pickup: { kind: 'gear', gear } };
      }
      case 'skill': {
        if (!id || !isSkillId(id)) return null;
        if (!this.unlockSkillDrop(id)) return null;
        return { banner: { title: '武学秘籍', sub: SKILL_BY_ID[id]?.name ?? id } };
      }
      case 'neigong': {
        if (!id || !isNeigongId(id)) return null;
        if (!this.unlockNeigongDrop(id)) return null;
        return { banner: { title: '心法秘籍', sub: NEIGONG_BY_ID[id]?.name ?? id } };
      }
      case 'pillRecipe': {
        if (!id || !isPillId(id)) return null;
        if (!this.unlockRecipe(id)) return null;
        return { banner: { title: '丹方领悟', sub: PILL_BY_ID[id]?.name ?? id } };
      }
      case 'talismanRecipe': {
        if (!id || !isTalismanId(id)) return null;
        if (!this.unlockTalismanDrop(id)) return null;
        return { banner: { title: '符咒领悟', sub: TALISMAN_BY_ID[id]?.name ?? id } };
      }
      default:
        return null;
    }
  }

  /**
   * Build an unidentified gear drop from loot-table hints.
   * Soft refs: unknown weapon/armor/set ids are skipped (returns null).
   */
  private makeLootTableGear(entry: EnemyLootEntry): GearItem | null {
    const id = entry.id;
    const q = entry.quality && isInherentQuality(entry.quality) ? entry.quality : undefined;
    const setId = entry.setId && isArmorSetId(entry.setId) ? entry.setId : undefined;

    // Weapon catalog id → unidentified weapon instance
    if (id && isWeaponId(id)) {
      const item: GearItem = { uid: nextUid(), kind: 'weapon', identified: false, weaponId: id };
      if (q) item.quality = q;
      return item;
    }
    // Armor catalog id
    if (id && ARMOR_BY_ID[id]) {
      const def = ARMOR_BY_ID[id]!;
      const item: GearItem = {
        uid: nextUid(), kind: 'armor', identified: false,
        armorId: def.id, slot: def.slot, setId,
      };
      if (q) item.quality = q;
      return item;
    }
    // Unknown soft id (not weapon, not armor) → skip
    if (id) return null;

    // Hints only: slot / setId / quality
    let slot: ArmorSlotKind | undefined =
      entry.slot && isArmorSlotKind(entry.slot) ? entry.slot : undefined;
    if (setId && !slot) {
      const set = ARMOR_SET_BY_ID[setId];
      if (set?.slots?.length) slot = set.slots[Math.floor(Math.random() * set.slots.length)]!;
    }
    let def = rollArmorDef({ elite: false });
    if (slot) {
      const pool = Object.values(ARMOR_BY_ID).filter((d) => d.slot === slot);
      if (pool.length) def = pool[Math.floor(Math.random() * pool.length)]!;
    }
    const item: GearItem = {
      uid: nextUid(), kind: 'armor', identified: false,
      armorId: def.id, slot: def.slot, setId,
    };
    if (q) item.quality = q;
    return item;
  }

  /** Bank a picked-up material into this run's loot summary. */
  bankMaterial(id: MaterialId, n = 1): void {
    this.runLoot.materials[id] = (this.runLoot.materials[id] ?? 0) + n;
  }

  /** Bank a picked-up blueprint (also grants if new). */
  bankBlueprint(id: WeaponId): void {
    if (!this.runLoot.blueprints.includes(id)) this.runLoot.blueprints.push(id);
    this.grantBlueprint(id);
  }

  /** Bank unidentified gear pickup (stash + count). */
  bankGearDrop(item: GearItem): void {
    this.stashGear(item);
    this.runLoot.gear++;
  }

  onParry(): { crystals: number } {
    this.runParries++;
    const crystals = this.runParries <= 12 ? 1 : 0;
    this.runCrystals += crystals;
    return { crystals };
  }

  /** Crystal bonus + material descriptors to spawn as ground loot (not auto-banked). */
  onArenaClear(): { materials: MaterialId[] } {
    this.runCrystals += 15;
    // 3–4 different materials for a richer clear burst
    const materials = rollMaterials(3 + (Math.random() < 0.5 ? 1 : 0), Math.random() < 0.2);
    return { materials };
  }

  /** Apply end-of-run bank. Victory keeps 100%; death keeps 60% crystals. Loot always banks. */
  settle(victory: boolean): RunRewards {
    if (!victory) this.flagLegacyPending();
    const keep = victory ? 1 : 0.6;
    let crystals = Math.floor(this.runCrystals * keep);
    if (victory) {
      crystals += 120;
      this.data.clears++;
      // Boss mats / 葬钟图纸 come from chest loot (opened or vacuumed), not silent grants.
    }
    this.data.crystals += crystals;

    // Bank materials / blueprints / gear collected this run
    for (const [k, n] of Object.entries(this.runLoot.materials)) {
      addMaterial(this.data.materials, k as MaterialId, n ?? 0);
    }
    for (const bp of this.runLoot.blueprints) {
      if (!this.knowsBlueprint(bp)) this.data.blueprints.push(bp);
    }
    // gear instances were pushed live during run into data.gearBag already

    this.runCrystals = 0;
    const loot = { ...this.runLoot, materials: { ...this.runLoot.materials }, blueprints: [...this.runLoot.blueprints] };
    this.mark();
    return {
      crystals,
      kills: 0,
      parries: this.runParries,
      victory,
      loot,
    };
  }

  /** Create unidentified drop and stash in bag immediately (survives death). */
  stashGear(item: GearItem): void {
    this.data.gearBag.push(item);
    this.mark();
  }

  /** Public wrapper for chest / kill loot tables. */
  rollUnidentifiedDrop(elite = false, actIndex?: number): GearItem {
    return this.makeUnidentifiedDrop(elite, actIndex);
  }

  private makeUnidentifiedDrop(elite: boolean, actIndex?: number): GearItem {
    if (Math.random() < 0.55) {
      const pool = unknownBlueprintPool(() => false);
      const weaponId = pool.length
        ? pool[Math.floor(Math.random() * pool.length)]
        : (WEAPONS[Math.floor(Math.random() * Math.max(1, WEAPONS.length))]?.id ?? 'silver');
      return { uid: nextUid(), kind: 'weapon', identified: false, weaponId };
    }
    // Armor — slot/name fogged until 鉴定; prefer common 布衣 path early
    const preferCommon = !this.data.equippedSlots.body
      && !this.data.gearBag.some((g) => g.kind === 'armor' && g.slot === 'body' && g.identified);
    const def = rollArmorDef({ elite, preferCommon });
    const act = actIndex ?? this._lootAct ?? 0;
    const bias = actPool(act).setLean;
    const setId = rollArmorSetId(def.slot, { bias, elite }) ?? undefined;
    return {
      uid: nextUid(),
      kind: 'armor',
      identified: false,
      armorId: def.id,
      slot: def.slot,
      setId,
      // name/bonus filled on identify from catalog + quality
    };
  }

  // ---- 铁匠 craft / upgrade ----

  /**
   * Forge a NEW weapon instance from a known blueprint (repeatable).
   * Each craft pushes an identified GearItem into gearBag.
   */
  craftWeapon(id: WeaponId): string | true {
    if (!this.knowsBlueprint(id)) return '未获图纸';
    const recipe = CRAFT_RECIPES[id];
    if (!recipe) return '无此配方';
    if (this.data.crystals < recipe.fee) return '血晶不足';
    if (!hasMaterials(this.data.materials, recipe.materials)) return '材料不足';
    this.data.crystals -= recipe.fee;
    spendMaterials(this.data.materials, recipe.materials);
    const aff = rollWepAffix();
    // Each forge rolls its own quality + base-stat variance (same blueprint, different blade).
    const quality = rollCraftQuality();
    const item: GearItem = {
      uid: nextUid(),
      kind: 'weapon',
      identified: true,
      weaponId: id,
      name: WEAPON_BY_ID[id].name,
      quality,
      tier: QUALITY_DEFAULT_TIER[quality],
      level: 1,
      wepAffix: aff,
      rollDmg: rollStatMul(),
      rollPoise: rollStatMul(),
      reforgeLeft: reforgeMax(quality),
    };
    this.lastCrafted = item;
    this.discoverWepAffix(aff);
    this.data.gearBag.push(item);
    this.ensureOwnedType(id);
    // If nothing equipped yet, auto-equip the new piece
    if (!this.equippedWeaponItem()) this.syncWeaponMirrorsFrom(item);
    this.mark();
    return true;
  }

  /**
   * Reinforce an identified weapon instance by gearBag uid.
   * (Accepts legacy WeaponId for safety — looks up equipped/first instance.)
   */
  upgradeWeapon(uidOrId: string): string | true {
    let item = this.gearByUid(uidOrId);
    if (!item && isWeaponId(uidOrId)) {
      // Legacy: type id → prefer equipped instance of that type, else first
      const wid = uidOrId as WeaponId;
      const eq = this.equippedWeaponItem();
      if (eq?.weaponId === wid) item = eq;
      else item = this.bagWeapons(wid)[0];
    }
    if (!item || item.kind !== 'weapon') return '未拥有';
    if (!item.identified || !item.weaponId) return '尚未鉴定';
    const id = item.weaponId;
    const cur = item.level ?? 1;
    if (cur >= WEAPON_LEVEL_MAX) return '已至淬炼上限';
    const next = cur + 1;
    const crystalCost = weaponUpgradeCost(next);
    const recipe = CRAFT_RECIPES[id];
    if (!recipe) return '无此配方';
    const mats: MaterialBag = recipe.upgradeMats(next);
    if (this.data.crystals < crystalCost) return '血晶不足';
    if (!hasMaterials(this.data.materials, mats)) return '材料不足';
    this.data.crystals -= crystalCost;
    spendMaterials(this.data.materials, mats);
    item.level = next;
    if (this.data.equippedWeaponUid === item.uid) this.syncWeaponMirrorsFrom(item);
    else this.data.weaponLevels[id] = Math.max(this.data.weaponLevels[id] ?? 1, next);
    this.mark();
    return true;
  }

  /** Reinforce identified armor (equipped or in bag). Recomputes bonus from catalog. */
  upgradeArmor(uid: string): string | true {
    const item = this.gearByUid(uid);
    if (!item || item.kind !== 'armor') return '无此防具';
    if (!item.identified) return '尚未鉴定';
    const cur = item.level ?? 1;
    if (cur >= ARMOR_LEVEL_MAX) return '已至强化上限';
    const next = cur + 1;
    const crystalCost = armorUpgradeCost(next);
    const mats = armorUpgradeMats(next) as MaterialBag;
    if (this.data.crystals < crystalCost) return '血晶不足';
    if (!hasMaterials(this.data.materials, mats)) return '材料不足';
    this.data.crystals -= crystalCost;
    spendMaterials(this.data.materials, mats);
    item.level = next;
    const q = item.quality ?? 'fan';
    item.bonus = computeArmorBonus(item.armorId, q, next, item.bonus);
    this.mark();
    return true;
  }

  /** Equip by weapon type (first matching instance) — legacy. Prefer equipWeaponUid. */
  equipWeapon(id: WeaponId): boolean {
    const eq = this.equippedWeaponItem();
    if (eq?.weaponId === id) return true;
    const item = this.bagWeapons(id)[0];
    if (!item) return false;
    return this.equipWeaponUid(item.uid);
  }

  /** Equip a specific weapon instance by gearBag uid. */
  equipWeaponUid(uid: string): boolean {
    const item = this.gearByUid(uid);
    if (!item || item.kind !== 'weapon' || !item.identified || !item.weaponId) return false;
    this.syncWeaponMirrorsFrom(item);
    this.mark();
    return true;
  }

  /** Unequip 兵刃 → bare hands (no weapon instance / empty slot). */
  unequipWeapon(): boolean {
    this.data.equippedWeaponUid = '';
    this.data.equippedWeapon = '';
    this.mark();
    return true;
  }

  /** True when no weapon equipped (空手 = empty slot, not a WeaponDef). */
  isBareHands(): boolean {
    return !this.equippedWeaponItem();
  }

  grantBlueprint(id: WeaponId): boolean {
    if (this.knowsBlueprint(id)) return false;
    if (!(id in WEAPON_BY_ID)) return false;
    this.data.blueprints.push(id);
    this.mark();
    return true;
  }

  // ---- 鉴定 ----

  unidentified(): GearItem[] {
    return this.data.gearBag.filter((g) => !g.identified);
  }

  identify(uid: string): string | true {
    const item = this.data.gearBag.find((g) => g.uid === uid);
    if (!item) return '无此物';
    if (item.identified) return '已鉴定';
    if (this.data.crystals < IDENTIFY_FEE) return '血晶不足';
    this.data.crystals -= IDENTIFY_FEE;
    item.identified = true;
    const q = rollQuality();
    item.quality = q;
    item.tier = QUALITY_DEFAULT_TIER[q];
    if (item.kind === 'weapon' && item.weaponId) {
      item.name = WEAPON_BY_ID[item.weaponId].name;
      item.level = 1;
      item.quality = q;
      item.tier = QUALITY_DEFAULT_TIER[q];
      item.rollDmg = rollStatMul();
      item.rollPoise = rollStatMul();
      item.reforgeLeft = reforgeMax(q);
      this.ensureOwnedType(item.weaponId);
      if (!this.knowsBlueprint(item.weaponId)) {
        this.data.blueprints.push(item.weaponId);
      }
      // If nothing equipped, auto-equip this newly identified blade
      if (!this.equippedWeaponItem()) this.syncWeaponMirrorsFrom(item);
    } else if (item.kind === 'armor') {
      const def = item.armorId ? ARMOR_BY_ID[item.armorId] : undefined;
      item.name = def?.name ?? item.name ?? '玄甲';
      item.slot = def?.slot ?? item.slot ?? 'neck';
      item.level = 1;
      item.bonus = computeArmorBonus(item.armorId, q, 1, item.bonus ?? def?.base);
      // setId may already be on drop; if missing (legacy), leave unset
      if (item.setId && isArmorSetId(item.setId)) {
        const n = this.data.gearBag.filter(
          (g) => g.kind === 'armor' && g.identified && g.setId === item.setId,
        ).length;
        if (n >= 2) this.noteArmorSet(item.setId);
      }
    }
    this.mark();
    return true;
  }


  // ---- 装备 paper-doll ----

  gearByUid(uid: string): GearItem | undefined {
    return this.data.gearBag.find((g) => g.uid === uid);
  }

  /** Identified armor in bag (not currently equipped). */
  bagArmor(filter?: ArmorSlotKind): GearItem[] {
    const worn = new Set(Object.values(this.data.equippedSlots).filter(Boolean) as string[]);
    return this.data.gearBag.filter((g) => {
      if (g.kind !== 'armor' || !g.identified) return false;
      if (worn.has(g.uid)) return false;
      if (filter && g.slot !== filter) return false;
      return true;
    });
  }

  equippedIn(slot: EquipSlotId): GearItem | undefined {
    const uid = this.data.equippedSlots[slot];
    return uid ? this.gearByUid(uid) : undefined;
  }

  /**
   * Equip identified armor into a matching slot.
   * For rings: prefer empty ring1/ring2, else replace ring1.
   * Replaces existing piece (old returns to bag automatically).
   */
  equipArmor(uid: string, preferSlot?: EquipSlotId): string | true {
    const item = this.gearByUid(uid);
    if (!item || item.kind !== 'armor') return '无此防具';
    if (!item.identified || !item.slot) return '尚未鉴定';
    const targets = preferSlot && equipTargetsFor(item.slot).includes(preferSlot)
      ? [preferSlot, ...equipTargetsFor(item.slot).filter((s) => s !== preferSlot)]
      : equipTargetsFor(item.slot);
    // Prefer empty slot
    let slot = targets.find((s) => !this.data.equippedSlots[s]);
    if (!slot) slot = targets[0];
    // If already equipped somewhere, unequip first
    for (const [s, u] of Object.entries(this.data.equippedSlots)) {
      if (u === uid) delete this.data.equippedSlots[s as EquipSlotId];
    }
    this.data.equippedSlots[slot] = uid;
    this.mark();
    return true;
  }

  unequipSlot(slot: EquipSlotId): string | true {
    if (!this.data.equippedSlots[slot]) return '该部位为空';
    delete this.data.equippedSlots[slot];
    this.mark();
    return true;
  }

  unequipArmor(uid: string): string | true {
    let found = false;
    for (const [s, u] of Object.entries(this.data.equippedSlots)) {
      if (u === uid) {
        delete this.data.equippedSlots[s as EquipSlotId];
        found = true;
      }
    }
    if (!found) return '未装备此物';
    this.mark();
    return true;
  }

  // ---- 内功心法 ----

  /**
   * 打坐当前已装备心法（或指定已装备的那一门）。
   * 未装备不可打坐；rank 0（重修后）打坐到 1；已有则 +1。
   */
  meditateNeigong(id?: NeigongId): string | true {
    const target = id ?? this.data.equippedNeigong;
    if (!target) return '未装备心法';
    if (!this.knowsNeigong(target)) return '未获此心法';
    if (this.data.equippedNeigong !== target) return '请先切换并重修后再打坐此门';
    const cur = this.neigongRank(target);
    if (cur >= NEIGONG_RANK_MAX) return '心法已至化境';
    const next = Math.max(1, cur + 1);
    const { mats, fee } = neigongMeditateCost(target, next);
    if (this.data.crystals < fee) return '血晶不足';
    if (!hasMaterials(this.data.materials, mats)) return '材料不足';
    this.data.crystals -= fee;
    spendMaterials(this.data.materials, mats);
    this.data.neigongRanks[target] = next;
    this.mark();
    return true;
  }

  /** @deprecated */
  meditate(_id: SkillId): string | true {
    return '武学不可打坐；请在内功区打坐心法';
  }
  learnSkill(id: SkillId): string | true { return this.meditate(id); }

  /**
   * 切换心法（重修）：
   * - 卸下的心法：仍「已知」，rank → 0
   * - 新装备心法：rank → 1（从入门重练）
   */
  switchNeigong(id: NeigongId): string | true {
    if (!this.knowsNeigong(id)) return '未获此心法';
    if (this.data.equippedNeigong === id) return '已在修炼此门';
    if (this.data.crystals < NEIGONG_RETRAIN_FEE) return `重修需血晶 ${NEIGONG_RETRAIN_FEE}`;
    const prev = this.data.equippedNeigong;
    if (prev) this.data.neigongRanks[prev] = 0;
    this.data.crystals -= NEIGONG_RETRAIN_FEE;
    this.data.equippedNeigong = id;
    this.data.neigongRanks[id] = 1;
    this.mark();
    return true;
  }

  /** 山门净秽：清除局内诅咒标记（黑残页已随结算清空）. */
  cleanseCurse(): string | true {
    if (!this.data.pendingCurseCleanse) return '无需净秽';
    const fee = 25;
    if (this.data.crystals < fee) return `净秽需血晶 ${fee}`;
    if ((this.data.materials.cinnabar ?? 0) < 1 || (this.data.materials.herb ?? 0) < 1) return '需朱砂·灵草各 1';
    this.data.crystals -= fee;
    this.data.materials.cinnabar = (this.data.materials.cinnabar ?? 0) - 1;
    this.data.materials.herb = (this.data.materials.herb ?? 0) - 1;
    this.data.pendingCurseCleanse = false;
    this.mark();
    return true;
  }

  /** 秘籍掉落解锁心法（已知列表；若无装备则自动装备并给 1 阶）。不提升已有阶。 */
  unlockNeigongDrop(id: NeigongId): boolean {
    if (!isNeigongId(id)) return false;
    if (this.knowsNeigong(id)) return false;
    this.data.knownNeigong.push(id);
    this.data.neigongRanks[id] = 0;
    if (!this.data.equippedNeigong) {
      this.data.equippedNeigong = id;
      this.data.neigongRanks[id] = 1;
    }
    this.mark();
    return true;
  }


  /** Remaining 重锻词缀 attempts on a weapon. */
  reforgeLeft(item: GearItem): number { return reforgeLeft(item); }

  reforgeWeapon(uid: string): string | true {
    const item = this.gearByUid(uid);
    if (!item || item.kind !== 'weapon' || !item.identified) return '无法重锻';
    if (!item.weaponId || !(item.weaponId in WEAPON_BY_ID)) return '空手无从重锻';
    const left = reforgeLeft(item);
    if (left <= 0) return '此兵刃重锻已尽';
    if (this.data.crystals < REFORGE_FEE) return `需血晶 ${REFORGE_FEE}`;
    if (!hasMaterials(this.data.materials, REFORGE_MATS)) return '材料不足（精铁·煤铁·朱砂）';
    this.data.crystals -= REFORGE_FEE;
    spendMaterials(this.data.materials, REFORGE_MATS);
    let next = rollWepAffix();
    if (item.wepAffix && next === item.wepAffix) next = rollWepAffix();
    item.wepAffix = next;
    item.reforgeLeft = left - 1;
    this.discoverWepAffix(next);
    this.mark();
    return true;
  }

  // ---- 市集兑出 / 购入 ----

  /** Crystals this identified piece would fetch at the market. */
  sellPrice(item: GearItem): number { return sellPrice(item); }
  sellNeedsConfirm(item: GearItem): boolean { return sellNeedsConfirm(item); }
  matSellPrice(id: MaterialId, n = 1): number { return matSellPrice(id, n); }
  matBuyPrice(id: MaterialId, n = 1): number { return matBuyPrice(id, n); }

  /** Why this gear can't go to market (null = ok). Identified only. */
  sellBlock(item: GearItem): string | null {
    if (!item.identified) return '未辨之物须先赴铁匠铺烛下辨认';
    if (item.kind === 'weapon') {
      if (!item.weaponId) return '空手无从兑出';
      if (item.uid === this.data.equippedWeaponUid) return '在手兵刃不可兑出，请先卸下';
      const others = this.bagWeapons().filter((g) => g.uid !== item.uid).length;
      if (others <= 0) return '仅此一把兵刃，不可兑出';
    } else if (Object.values(this.data.equippedSlots).includes(item.uid)) {
      return '在身防具不可兑出，请先解下';
    }
    return null;
  }

  /** Deliver identified gear to the market for 血晶. */
  sellGear(uid: string): number | string {
    const idx = this.data.gearBag.findIndex((g) => g.uid === uid);
    if (idx < 0) return '无此物';
    const item = this.data.gearBag[idx]!;
    const block = this.sellBlock(item);
    if (block) return block;
    const price = sellPrice(item);
    if (price <= 0) return '市集不收此物';
    this.data.gearBag.splice(idx, 1);
    this.data.crystals += price;
    if (item.kind === 'weapon' && item.identified && item.weaponId) {
      const wid = item.weaponId;
      if (!this.bagWeapons(wid).length) {
        this.data.ownedWeapons = this.data.ownedWeapons.filter((w) => w !== wid);
      }
    }
    this.mark();
    return price;
  }

  /** Deliver materials to the market for 血晶. */
  sellMaterial(id: MaterialId, n = 1): number | string {
    const qty = Math.max(1, Math.floor(n));
    const have = this.mat(id);
    if (have < qty) return '材料不足';
    const price = matSellPrice(id, qty);
    if (price <= 0) return '市集不收此物';
    this.data.materials[id] = have - qty;
    if ((this.data.materials[id] ?? 0) <= 0) delete this.data.materials[id];
    this.data.crystals += price;
    this.mark();
    return price;
  }

  /** Buy materials from NPC market stock with 血晶. */
  buyMaterial(id: MaterialId, n = 1): true | string {
    const qty = Math.max(1, Math.floor(n));
    const cost = matBuyPrice(id, qty);
    if (this.data.crystals < cost) return `需血晶 ${cost}`;
    this.data.crystals -= cost;
    addMaterial(this.data.materials, id, qty);
    this.mark();
    return true;
  }

  discoverWepAffix(id: WepAffixId): void {
    const c = this.ensureCodex();
    if (codexDiscover(c.wepAffixes, id)) this.mark();
  }

  ensureCodex(): CodexData {
    if (!this.data.codex) this.data.codex = emptyCodex();
    return this.data.codex;
  }

  unlockTitle(id: TitleId): boolean {
    if (!this.data.unlockedTitles) this.data.unlockedTitles = [];
    if (this.data.unlockedTitles.includes(id)) return false;
    this.data.unlockedTitles.push(id);
    this.mark();
    return true;
  }

  hasTitle(id: TitleId): boolean {
    return (this.data.unlockedTitles ?? []).includes(id);
  }

  noteSetQuality(q: Quality): void {
    if (!this.data.knownSetQualities) this.data.knownSetQualities = [];
    if (!this.data.knownSetQualities.includes(q)) {
      this.data.knownSetQualities.push(q);
      this.mark();
    }
  }

  noteArmorSet(id: ArmorSetId): void {
    if (!this.data.knownArmorSets) this.data.knownArmorSets = [];
    if (!this.data.knownArmorSets.includes(id)) {
      this.data.knownArmorSets.push(id);
      this.mark();
    }
  }

  knownArmorSet(id: ArmorSetId): boolean {
    return (this.data.knownArmorSets ?? []).includes(id);
  }

  armorSetProgress(): ReturnType<typeof setProgressInBag> {
    return setProgressInBag(this.data.gearBag);
  }

  /** Offer legacy after death settle. */
  flagLegacyPending(): void {
    this.data.legacyPending = true;
    this.data.lastDeathLegacy = true;
    this.mark();
  }

  pickLegacy(choice: 'boon' | 'risk'): void {
    this.data.legacyPending = false;
    this.data.lastDeathLegacy = false;
    (this as unknown as { _legacyChoice?: string })._legacyChoice = choice;
    this.mark();
  }

  consumeLegacyChoice(): 'boon' | 'risk' | null {
    const c = (this as unknown as { _legacyChoice?: 'boon' | 'risk' })._legacyChoice ?? null;
    (this as unknown as { _legacyChoice?: string })._legacyChoice = undefined;
    return c;
  }

  // ---- 武学技能 ----


  /** 秘籍掉落：解锁到 1 阶（已有则不变，不跳级）。 */
  unlockSkillDrop(id: SkillId): boolean {
    if (this.hasSkill(id)) return false;
    if (!(id in SKILL_BY_ID)) return false;
    this.data.skillRanks[id] = 1;
    this.data.skillProf[id] = 0;
    this.ensureSkillLists();
    this.mark();
    return true;
  }

  /**
   * Grant combat proficiency. Returns true if rank increased.
   * Neigong ignores combat prof.
   */
  addProf(id: SkillId, amount: number): boolean {
    if (amount <= 0) return false;
    const def = SKILL_BY_ID[id];
    if (!def || def.track !== 'combat') return false;
    const rank = this.skillRank(id);
    if (rank < 1 || rank >= SKILL_RANK_MAX) return false;
    let prof = (this.data.skillProf[id] ?? 0) + amount;
    let ranked = false;
    let need = profToNext(rank);
    let cur = rank;
    while (cur < SKILL_RANK_MAX && need > 0 && prof >= need) {
      prof -= need;
      cur++;
      ranked = true;
      need = profToNext(cur);
    }
    this.data.skillRanks[id] = cur;
    this.data.skillProf[id] = cur >= SKILL_RANK_MAX ? 0 : prof;
    this.ensureSkillLists();
    this.mark();
    return ranked;
  }

  /** Small passive prof on kill for all owned combat skills. */
  onKillProf(): SkillId[] {
    const ups: SkillId[] = [];
    for (const id of this.data.skills) {
      if (SKILL_BY_ID[id].track !== 'combat') continue;
      if (this.addProf(id, 1)) ups.push(id);
    }
    return ups;
  }

  /** @deprecated slots removed — all learned actives work via combo commands. */
  setActiveSkill(_slot: number, _id: SkillId | null): boolean {
    this.ensureSkillLists();
    this.mark();
    return true;
  }

  /** @deprecated no unequip — learned actives stay available. */
  toggleActiveSkill(id: SkillId): string | true {
    if (!this.hasSkill(id) || SKILL_BY_ID[id].kind !== 'active') return '尚未掌握此外功';
    this.ensureSkillLists();
    this.mark();
    return true;
  }

  // ---- 炼丹 ----

  brew(id: PillId): string | true {
    const def = PILL_BY_ID[id];
    if (!def) return '无此丹方';
    if (!this.knowsRecipe(id)) return '尚未习得此丹方';
    if (this.data.crystals < def.fee) return '血晶不足';
    if (!hasMaterials(this.data.materials, def.cost)) return '材料不足';
    this.data.crystals -= def.fee;
    spendMaterials(this.data.materials, def.cost);
    this.data.pills[id] = (this.data.pills[id] ?? 0) + 1;
    this.mark();
    return true;
  }


  // ---- 灵符 (combat talismans) ----

  talismanStock(id: TalismanId): number { return this.data.talismans[id] ?? 0; }
  knowsTalisman(id: TalismanId): boolean { return this.data.knownTalismans.includes(id); }

  craftTalisman(id: TalismanId): string | true {
    if (!isTalismanId(id)) return '未知符箓';
    if (!this.knowsTalisman(id)) return '尚未领悟此符咒';
    const def = TALISMAN_BY_ID[id];
    if ((this.data.talismans[id] ?? 0) >= def.stockCap) return '库存已满';
    if (this.data.crystals < def.fee) return '血晶不足';
    if (!hasMaterials(this.data.materials, def.cost)) return '材料不足';
    spendMaterials(this.data.materials, def.cost);
    this.data.crystals -= def.fee;
    this.data.talismans[id] = (this.data.talismans[id] ?? 0) + 1;
    if (!this.data.knownTalismans.includes(id)) this.data.knownTalismans.push(id);
    const c = this.ensureCodex();
    codexDiscover(c.talismans, id);
    this.mark();
    return true;
  }

  /** Pack one charge into a sortie talisman slot (0..1). Consumes bag stock. */
  equipTalisman(id: TalismanId, slotIndex = 0): string | true {
    if (!isTalismanId(id)) return '未知符箓';
    if ((this.data.talismans[id] ?? 0) <= 0) return '库存不足';
    const def = TALISMAN_BY_ID[id];
    const inv = this.ensureRunInv();
    const slots = this.ensureTalismanSlots();
    const si = Math.max(0, Math.min(TALISMAN_SLOT_COUNT - 1, slotIndex | 0));
    // Same id already in another slot? still allow (two charges)
    const prev = slots[si];
    if (prev) {
      this.data.talismans[prev.id] = (this.data.talismans[prev.id] ?? 0) + prev.n;
    }
    this.data.talismans[id] = (this.data.talismans[id] ?? 0) - 1;
    slots[si] = { id, n: def.runCharges };
    inv.talismanSlots = slots;
    if (!this.data.knownTalismans.includes(id)) this.data.knownTalismans.push(id);
    this.mark();
    return true;
  }

  clearTalismanSlot(slotIndex = 0): string | true {
    const inv = this.ensureRunInv();
    const slots = this.ensureTalismanSlots();
    const si = Math.max(0, Math.min(TALISMAN_SLOT_COUNT - 1, slotIndex | 0));
    const prev = slots[si];
    if (!prev) return '槽位已空';
    this.data.talismans[prev.id] = (this.data.talismans[prev.id] ?? 0) + prev.n;
    slots[si] = null;
    inv.talismanSlots = slots;
    this.mark();
    return true;
  }

  ensureTalismanSlots(): TalismanSlot[] {
    const inv = this.ensureRunInv();
    if (!inv.talismanSlots || inv.talismanSlots.length !== TALISMAN_SLOT_COUNT) {
      inv.talismanSlots = emptyTalismanSlots();
    }
    return inv.talismanSlots;
  }

  private ensureRunInv(): import('./types').RunInventory {
    if (!this.data.runInv) {
      this.data.runInv = { potions: 0, pillSlots: emptyPillSlots(), talismanSlots: emptyTalismanSlots() };
    }
    if (!this.data.runInv.pillSlots) this.data.runInv.pillSlots = emptyPillSlots();
    if (!this.data.runInv.talismanSlots || this.data.runInv.talismanSlots.length !== TALISMAN_SLOT_COUNT) {
      // migrate leftover v15 shape if present on live object
      const legacy = (this.data.runInv as { talisman?: TalismanSlot }).talisman;
      const slots = emptyTalismanSlots();
      if (legacy) slots[0] = { ...legacy };
      this.data.runInv.talismanSlots = slots;
      delete (this.data.runInv as { talisman?: TalismanSlot }).talisman;
    }
    return this.data.runInv;
  }

  ensurePillSlots(): PillSlot[] {
    if (!this.data.runInv.pillSlots || this.data.runInv.pillSlots.length !== PILL_SLOT_COUNT) {
      this.data.runInv.pillSlots = emptyPillSlots();
    }
    return this.data.runInv.pillSlots;
  }

  /**
   * Pack pills from hub stock into a sortie slot (0–3).
   * Same type may stack in one slot up to carryCap (global across slots).
   */
  packPill(id: PillId, slotIndex: number, n = 1): string | true {
    const def = PILL_BY_ID[id];
    if (!def) return '无此丹药';
    if (slotIndex < 0 || slotIndex >= PILL_SLOT_COUNT) return '无效丹槽';
    const stock = this.data.pills[id] ?? 0;
    if (stock < n) return '库存不足';
    const slots = this.ensurePillSlots();
    const slot = slots[slotIndex];
    if (slot && slot.id !== id) return '请先清空该槽';
    const total = pillSlotsCount(slots, id);
    if (total + n > def.carryCap) return `每次出征最多携带 ${def.carryCap}`;
    this.data.pills[id] = stock - n;
    if (this.data.pills[id]! <= 0) delete this.data.pills[id];
    if (slot) slot.n += n;
    else slots[slotIndex] = { id, n };
    this.mark();
    return true;
  }

  /** Unpack n from a sortie slot back to hub stock. */
  unpackPill(slotIndex: number, n = 1): string | true {
    const slots = this.ensurePillSlots();
    if (slotIndex < 0 || slotIndex >= PILL_SLOT_COUNT) return '无效丹槽';
    const slot = slots[slotIndex];
    if (!slot || slot.n < n) return '该槽无丹';
    const id = slot.id;
    slot.n -= n;
    if (slot.n <= 0) slots[slotIndex] = null;
    this.data.pills[id] = (this.data.pills[id] ?? 0) + n;
    this.mark();
    return true;
  }

  /** Clear an entire sortie slot back to stock. */
  clearPillSlot(slotIndex: number): string | true {
    const slots = this.ensurePillSlots();
    const slot = slots[slotIndex];
    if (!slot) return '该槽为空';
    return this.unpackPill(slotIndex, slot.n);
  }

  // ---- debug seed ----

  seedForTest(): void {
    this.data = freshSave();
    this.data.crystals = 320;
    this.data.materials = {
      iron: 20, bone: 16, cinnabar: 12, herb: 14, hide: 10, silk: 8, coal: 6, xuaniron: 4, spiritjade: 2, yaohe: 3,
    };
    this.data.blueprints = ['silver', 'thorn', 'spear', 'axe'];
    this.data.ownedWeapons = ['silver', 'thorn'];
    this.data.weaponLevels = { silver: 2, thorn: 1 };
    this.data.weaponQuality = { silver: 'huang', thorn: 'fan' };
    this.data.equippedWeapon = 'thorn';
    this.data.equippedWeaponUid = 'seed-thorn';
    this.data.skillRanks = { qinggong: 2, shanshen: 1, lianhuan: 1, pojun: 1, liaoshang: 1, bengquan: 1, huzhua: 1, daomang: 1 };
    this.data.skillProf = { qinggong: 40, shanshen: 10, lianhuan: 20 };
    this.data.skills = ['qinggong', 'shanshen', 'lianhuan', 'pojun', 'liaoshang', 'bengquan', 'huzhua', 'daomang'];
    this.ensureSkillLists();
    this.data.knownNeigong = ['hunyuan', 'xueying', 'qingxu'];
    this.data.equippedNeigong = 'hunyuan';
    this.data.neigongRanks = { hunyuan: 3, xueying: 0, qingxu: 0 };
    this.data.knownRecipes = ['heal', 'rage'];
    this.data.pills = { heal: 2, rage: 1 };
    this.data.gearBag = [
       { uid: 'seed-silver', kind: 'weapon', identified: true, weaponId: 'silver',
        name: '安魂银刃', quality: 'huang', tier: 2, level: 2 },
      { uid: 'seed-thorn', kind: 'weapon', identified: true, weaponId: 'thorn',
        name: '血棘短剑', quality: 'fan', tier: 1, level: 1 },
      { uid: 'seed-u1', kind: 'weapon', identified: false, weaponId: 'spear' },
      { uid: 'seed-u2', kind: 'armor', identified: false, armorId: 'yupei', slot: 'neck' },
      { uid: 'seed-buyi', kind: 'armor', identified: true, armorId: 'buyi', slot: 'body',
        name: '布衣', quality: 'fan', tier: 1, level: 1, bonus: { hp: 8, def: 1 } },
      { uid: 'seed-tong', kind: 'armor', identified: true, armorId: 'tongjie', slot: 'ring',
        name: '铜戒', quality: 'huang', tier: 2, level: 1, bonus: { atk: 1 } },
    ];
    this.data.equippedSlots = {};
    this.data.runs = 3;
    this.data.clears = 0;
    this.data.unlockedAct = 1;
    this.data.clearedActs = [0];
    this.mark();
  }

  unlockHint(id: WeaponId): string {
    const def = WEAPON_BY_ID[id];
    if (!this.knowsBlueprint(id)) {
      const u = def?.unlock;
      if (u?.type === 'bossClear') return ('hint' in u && u.hint) ? u.hint : '击败首领可获图纸';
      if (u && 'hint' in u && u.hint) return u.hint;
      return '需寻得图纸';
    }
    const r = CRAFT_RECIPES[id];
    if (!r) return def ? '不可锻造' : '初始兵刃';
    const mats = Object.entries(r.materials).map(([k, n]) => {
      const name = MATERIAL_BY_ID[k as MaterialId]?.name ?? k;
      return `${name}×${n}`;
    }).join(' · ');
    return `锻造：${mats} · 血晶 ${r.fee}`;
  }

  summaryLine(): string {
    const m = this.mods();
    const w = this.equipped();
    const matN = Object.values(this.data.materials).reduce<number>((a, b) => a + (b ?? 0), 0);
    const ng = m.equippedNeigong ? NEIGONG_BY_ID[m.equippedNeigong].name : '无心法';
    return `血晶 ${this.data.crystals} · ${ng} · ${w?.name ?? '空手'} · 武功+${Math.round(m.wugongBonus * 100)}% · 生命 ${m.maxHp}`;
  }
}

export {
  MATERIALS, MATERIAL_BY_ID, SKILLS, SKILL_BY_ID, PILLS, PILL_BY_ID,
  WEAPONS, WEAPON_BY_ID, WEAPON_LEVEL_MAX, weaponUpgradeCost, CRAFT_RECIPES, unknownBlueprintPool,
  IDENTIFY_FEE, QUALITY_NAME, QUALITY_COLOR, LOOT_TINT, MATERIAL_QUALITY, QUALITY_DEFAULT_TIER,
  MAX_ACTIVE_SLOTS, SKILL_RANK_MAX,
  PILL_SHORT, PILL_COLOR, PILL_SLOT_COUNT, emptyPillSlots,
  tipAtRank, profToNext, effectsAtRank,
  NEIGONGS, NEIGONG_BY_ID, NEIGONG_RANK_MAX, NEIGONG_RETRAIN_FEE, neigongTip, neigongMaxTip, neigongMeditateCost, neigongEffects,
  EQUIP_SLOTS, SLOT_KIND_NAME, ARMOR_BY_ID, ARMOR_LEVEL_MAX, armorUpgradeCost, armorUpgradeMats,
  CATEGORY_NAME, weaponCategory, skillUsableWith, gateLabel,
  TALISMANS, TALISMAN_BY_ID, TALISMAN_SLOT_COUNT, emptyTalismanSlots,
  TITLES, TITLE_BY_ID, REFORGE_FEE, WEP_AFFIXES, statRoll, reforgeMax, WEP_AFFIX_BY_ID,
  ARMOR_SETS, ARMOR_SET_BY_ID, setDisplayName,
  matSellPrice, matBuyPrice,
};
export type { TitleId, WepAffixId, ArmorSetId };
export {
  gongfaRankName, GONGFA_RANK_MAX_LABEL, equipTierName, GRADE_NAME,
  type InherentQuality, type ConsumableGrade, type GongfaRankId,
} from './taxonomy';
export type { WeaponId, SkillId, PillId, PillSlot, MaterialId, Quality, GearItem, NeigongId, EquipSlotId, ArmorSlotKind, TalismanId };
