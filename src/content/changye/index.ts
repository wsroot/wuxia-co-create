/**
 * 官方默认大包「长夜」— Cordis id `changye`（always-on）。
 *
 * Oc3：由 `bootOfficialPack()` / `bootMenpai()` **显式**加载；`menpai-core` 仅为兼容壳、不再转调。
 * 勿塞进 `OPTIONAL_PACKS`。禁止与 ContentCore / menpai-core 双登记同一批 id。
 * 石兽状态机 / drawKind 闭集另债，本包只灌条目数据。
 *
 * 可独立 `game.plugin(Changye)`；生产默认 `bootMenpai()` → `bootOfficialPack()` → 本包。
 */
import { Context, Schema } from 'cordis';
import {
  setTempScribeId, setTempScribeCost, setBossChestGuaranteeBp,
  setDirectorBpDrop, setTideClearLoot, setTideSpawn, clearMenpaiRunConfig,
} from '../../meta/pluginConfig';
import {
  CORE_MATERIALS, CORE_WEAPONS, CORE_PILLS, CORE_TALISMANS, CORE_SCRIPTS,
  CORE_ANIM_RECIPES, CORE_STAGES, CORE_BETWEEN_ACT_BEATS, CORE_ACT_POOLS,
  CORE_BOSS_KITS, CORE_ARMOR_SETS, CORE_WEP_AFFIXES, CORE_AFFIXES, CORE_ENEMIES,
  CORE_ELITE_MODS, CORE_TITLES, CORE_FRAGMENTS, CORE_ARMOR_PIECES, CORE_SKILLS,
  CORE_NEIGONGS, CORE_ATTACK_BOXES, CORE_POSES, CORE_PROJECTILES, CORE_FX_RECIPES,
  CORE_SHEETS, CORE_SFX, CORE_VOLLEYS, CORE_SILHOUETTES, CORE_BEHAVIORS,
  CORE_BACKDROPS, CORE_BOSS_MOVES, CORE_WEAPON_LOOKS, CORE_COLLIDERS,
  CORE_COMBAT_STYLES,
} from './data';

/** Cordis / 产品技术 id（商店兼容 id 仍为 `core`，见 menpai CORE_MENPAI_ID）。 */
export const CHANGYE_PACK_ID = 'changye';

export const ChangyeMaterials = {
  name: 'changye-materials',
  inject: ['materials'],
  apply(ctx: Context) {
    for (const m of CORE_MATERIALS) ctx.materials.add(m);
  },
};

export const ChangyeWeaponLooks = {
  name: 'changye-weapon-looks',
  inject: ['weaponLooks'],
  apply(ctx: Context) {
    for (const d of CORE_WEAPON_LOOKS) ctx.weaponLooks.add(d);
  },
};

export const ChangyeWeapons = {
  name: 'changye-weapons',
  inject: ['weapons'],
  apply(ctx: Context) {
    for (const w of CORE_WEAPONS) ctx.weapons.add(w);
  },
};

export const ChangyePills = {
  name: 'changye-pills',
  inject: ['pills'],
  apply(ctx: Context) {
    for (const p of CORE_PILLS) ctx.pills.add(p);
  },
};

export const ChangyeTalismans = {
  name: 'changye-talismans',
  inject: ['talismans'],
  apply(ctx: Context) {
    for (const s of CORE_SCRIPTS) ctx.talismans.script(s);
    for (const t of CORE_TALISMANS) ctx.talismans.add(t);
  },
};

export const ChangyeCampaign = {
  name: 'changye-campaign',
  inject: ['stages', 'acts'],
  apply(ctx: Context) {
    for (const s of CORE_STAGES) ctx.stages.add(s);
    CORE_ACT_POOLS.forEach((pool, i) => ctx.acts.pool(i, pool));
    CORE_BETWEEN_ACT_BEATS.forEach((beat, i) => ctx.acts.beat(i, beat));
  },
};

export const ChangyeArmorSets = {
  name: 'changye-armor-sets',
  inject: ['armorSets'],
  apply(ctx: Context) {
    for (const s of CORE_ARMOR_SETS) ctx.armorSets.add(s);
  },
};

export const ChangyeWepAffixes = {
  name: 'changye-wep-affixes',
  inject: ['wepAffixes'],
  apply(ctx: Context) {
    for (const a of CORE_WEP_AFFIXES) ctx.wepAffixes.add(a);
  },
};

export const ChangyeEnemies = {
  name: 'changye-enemies',
  inject: ['enemies'],
  apply(ctx: Context) {
    for (const e of CORE_ENEMIES) ctx.enemies.add(e);
  },
};

export const ChangyeAffixes = {
  name: 'changye-affixes',
  inject: ['affixes'],
  apply(ctx: Context) {
    for (const a of CORE_AFFIXES) ctx.affixes.add(a);
  },
};

export const ChangyeEliteMods = {
  name: 'changye-elite-mods',
  inject: ['eliteMods'],
  apply(ctx: Context) {
    for (const m of CORE_ELITE_MODS) ctx.eliteMods.add(m);
  },
};

export const ChangyeTitles = {
  name: 'changye-titles',
  inject: ['titles'],
  apply(ctx: Context) {
    for (const t of CORE_TITLES) ctx.titles.add(t);
  },
};

export const ChangyeBossKits = {
  name: 'changye-boss-kits',
  inject: ['bossKits'],
  apply(ctx: Context) {
    for (const k of CORE_BOSS_KITS) ctx.bossKits.add(k);
  },
};

export const ChangyeFragments = {
  name: 'changye-fragments',
  inject: ['fragments'],
  apply(ctx: Context) {
    for (const f of CORE_FRAGMENTS) ctx.fragments.add(f);
  },
};

export const ChangyeArmorPieces = {
  name: 'changye-armor-pieces',
  inject: ['armorPieces'],
  apply(ctx: Context) {
    for (const a of CORE_ARMOR_PIECES) ctx.armorPieces.add(a);
  },
};

/** B-tier surfaces（攻击盒/姿态/投射物/特效/图集/音效/弹幕/剪影/行为/氛围/Boss招）. */
export const ChangyeCombatCatalog = {
  name: 'changye-combat-catalog',
  inject: ['attacks', 'combatStyles', 'poses', 'projectiles', 'fxRecipes', 'volleys', 'bossMoves', 'animRecipes'],
  apply(ctx: Context) {
    for (const d of CORE_ATTACK_BOXES) ctx.attacks.add(d);
    for (const d of CORE_COMBAT_STYLES) ctx.combatStyles.add(d);
    for (const d of CORE_POSES) ctx.poses.add(d);
    for (const d of CORE_PROJECTILES) ctx.projectiles.add(d);
    for (const d of CORE_FX_RECIPES) ctx.fxRecipes.add(d);
    for (const d of CORE_VOLLEYS) ctx.volleys.add(d);
    for (const d of CORE_BOSS_MOVES) ctx.bossMoves.add(d);
    for (const d of CORE_ANIM_RECIPES) ctx.animRecipes.add(d);
  },
};

export const ChangyeMediaCatalog = {
  name: 'changye-media-catalog',
  inject: ['sheets', 'sfx', 'backdrops'],
  apply(ctx: Context) {
    for (const d of CORE_SHEETS) ctx.sheets.add(d);
    for (const d of CORE_SFX) ctx.sfx.add(d);
    for (const d of CORE_BACKDROPS) ctx.backdrops.add(d);
  },
};

export const ChangyeBodyCatalog = {
  name: 'changye-body-catalog',
  inject: ['silhouettes', 'behaviors', 'colliders'],
  apply(ctx: Context) {
    for (const d of CORE_SILHOUETTES) ctx.silhouettes.add(d);
    for (const d of CORE_BEHAVIORS) ctx.behaviors.add(d);
    for (const d of CORE_COLLIDERS) ctx.colliders.add(d);
  },
};

export const ChangyeSkills = {
  name: 'changye-skills',
  inject: ['skills'],
  apply(ctx: Context) {
    for (const s of CORE_SKILLS) ctx.skills.add(s);
  },
};

export const ChangyeNeigong = {
  name: 'changye-neigong',
  inject: ['neigong'],
  apply(ctx: Context) {
    for (const n of CORE_NEIGONGS) ctx.neigong.add(n);
  },
};

export interface ChangyeConfig {
  /**
   * Talisman id used by ↓+技 temporary scribe. Omit / empty → first known or
   * first catalog talisman; if none, the action is disabled.
   */
  tempScribeId?: string;
  /** Materials spent to scribe the temporary talisman (soft material ids). */
  tempScribeCost?: Record<string, number>;
  /** Boss-chest guarantee blueprint (soft weapon id; skip if known / missing). */
  bossChestGuarantee?: string;
  /** Director post-arena blueprint drop. */
  directorBpDrop?: { blueprintId: string; minArenaIdx: number; chance: number };
  /** Tide-clear loot (soft refs). */
  tideClearLoot?: Array<{ kind: 'crystal' | 'material' | 'blueprint' | 'gear'; id?: string; amount?: number }>;
  /** Tide spawn list (soft enemy ids). */
  tideSpawn?: Array<{ enemyId: string; dx: number; eliteChance: number }>;
}

/**
 * 官方默认大包「长夜」— 全量出厂目录 + 局内软配置默认。
 * Cordis `name` = `changye`。
 */
export const Changye = {
  name: CHANGYE_PACK_ID,
  Config: Schema.object({
    tempScribeId: Schema.string().default('jiekong'),
  }) as Schema<ChangyeConfig>,
  apply(ctx: Context, config: ChangyeConfig) {
    ctx.plugin(ChangyeMediaCatalog);
    ctx.plugin(ChangyeCombatCatalog);
    ctx.plugin(ChangyeBodyCatalog);
    ctx.plugin(ChangyeMaterials);
    ctx.plugin(ChangyeWeaponLooks);
    ctx.plugin(ChangyeWeapons);
    ctx.plugin(ChangyePills);
    ctx.plugin(ChangyeTalismans);
    ctx.plugin(ChangyeCampaign);
    ctx.plugin(ChangyeArmorSets);
    ctx.plugin(ChangyeWepAffixes);
    ctx.plugin(ChangyeAffixes);
    ctx.plugin(ChangyeEnemies);
    ctx.plugin(ChangyeEliteMods);
    ctx.plugin(ChangyeTitles);
    ctx.plugin(ChangyeBossKits);
    ctx.plugin(ChangyeFragments);
    ctx.plugin(ChangyeArmorPieces);
    ctx.plugin(ChangyeSkills);
    ctx.plugin(ChangyeNeigong);

    const sid = config?.tempScribeId ?? 'jiekong';
    setTempScribeId(sid);
    setTempScribeCost(config?.tempScribeCost ?? { herb: 1, cinnabar: 1 });
    setBossChestGuaranteeBp(config?.bossChestGuarantee ?? 'bell');
    setDirectorBpDrop(config?.directorBpDrop ?? { blueprintId: 'twin', minArenaIdx: 2, chance: 0.08 });
    setTideClearLoot(config?.tideClearLoot ?? [
      { kind: 'crystal', amount: 12 },
      { kind: 'material', id: 'spiritjade' },
      { kind: 'blueprint', id: 'thorn' },
    ]);
    setTideSpawn(config?.tideSpawn ?? [
      { enemyId: 'axe', dx: 200, eliteChance: 0.55 },
      { enemyId: 'shield', dx: 260, eliteChance: 0.4 },
      { enemyId: 'archer', dx: 320, eliteChance: 0.35 },
      { enemyId: 'axe', dx: 120, eliteChance: 0.45 },
    ]);
    ctx.effect(() => () => clearMenpaiRunConfig());
  },
};

export * from './data';
