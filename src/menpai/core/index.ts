/**
 * 遗留兼容壳 `menpai-core`（Oc3）。
 *
 * 出厂目录登记在官方大包 `changye`（`src/content/changye`），由
 * `bootOfficialPack()` / `bootMenpai({ officialPack: true })` **显式**加载。
 * 本模块：
 * - re-export `Changye*` / `CHANGYE_PACK_ID` 供旧 import
 * - `CoreMenpai.apply` **不再**转调 Changye（禁止双登记）
 *
 * 商店兼容 id 仍为 `CORE_MENPAI_ID='core'`（见 `src/menpai/index.ts`）。
 * 核心解释器 ≠ 长夜包：解释器只留服务/Schema；长夜内容只走 changye。
 */
import { Context, Schema } from 'cordis';
import {
  Changye,
  ChangyeMaterials, ChangyeWeaponLooks, ChangyeWeapons, ChangyePills,
  ChangyeTalismans, ChangyeCampaign, ChangyeArmorSets, ChangyeWepAffixes,
  ChangyeAffixes, ChangyeEnemies, ChangyeEliteMods, ChangyeTitles,
  ChangyeBossKits, ChangyeFragments, ChangyeArmorPieces,
  ChangyeCombatCatalog, ChangyeMediaCatalog, ChangyeBodyCatalog,
  ChangyeSkills, ChangyeNeigong,
  type ChangyeConfig,
} from '../../content/changye';

/** @deprecated Prefer Changye* from `content/changye`; kept for legacy imports. */
export const CoreMaterials = ChangyeMaterials;
/** @deprecated Prefer ChangyeWeaponLooks */
export const CoreWeaponLooks = ChangyeWeaponLooks;
/** @deprecated Prefer ChangyeWeapons */
export const CoreWeapons = ChangyeWeapons;
/** @deprecated Prefer ChangyePills */
export const CorePills = ChangyePills;
/** @deprecated Prefer ChangyeTalismans */
export const CoreTalismans = ChangyeTalismans;
/** @deprecated Prefer ChangyeCampaign */
export const CoreCampaign = ChangyeCampaign;
/** @deprecated Prefer ChangyeArmorSets */
export const CoreArmorSets = ChangyeArmorSets;
/** @deprecated Prefer ChangyeWepAffixes */
export const CoreWepAffixes = ChangyeWepAffixes;
/** @deprecated Prefer ChangyeAffixes */
export const CoreAffixes = ChangyeAffixes;
/** @deprecated Prefer ChangyeEnemies */
export const CoreEnemies = ChangyeEnemies;
/** @deprecated Prefer ChangyeEliteMods */
export const CoreEliteMods = ChangyeEliteMods;
/** @deprecated Prefer ChangyeTitles */
export const CoreTitles = ChangyeTitles;
/** @deprecated Prefer ChangyeBossKits */
export const CoreBossKits = ChangyeBossKits;
/** @deprecated Prefer ChangyeFragments */
export const CoreFragments = ChangyeFragments;
/** @deprecated Prefer ChangyeArmorPieces */
export const CoreArmorPieces = ChangyeArmorPieces;
/** @deprecated Prefer ChangyeCombatCatalog */
export const CoreCombatCatalog = ChangyeCombatCatalog;
/** @deprecated Prefer ChangyeMediaCatalog */
export const CoreMediaCatalog = ChangyeMediaCatalog;
/** @deprecated Prefer ChangyeBodyCatalog */
export const CoreBodyCatalog = ChangyeBodyCatalog;
/** @deprecated Prefer ChangyeSkills */
export const CoreSkills = ChangyeSkills;
/** @deprecated Prefer ChangyeNeigong */
export const CoreNeigong = ChangyeNeigong;

export type CoreMenpaiConfig = ChangyeConfig;

/**
 * 兼容壳 — **不**灌出厂目录。请用 `bootOfficialPack()` / `bootMenpai()`。
 * Do NOT also `game.plugin(Changye)` alongside a content-loading path, or catalogs double-register.
 */
export const CoreMenpai = {
  name: 'menpai-core',
  Config: Schema.object({
    tempScribeId: Schema.string().default('jiekong'),
  }) as Schema<CoreMenpaiConfig>,
  apply(ctx: Context, _config: CoreMenpaiConfig) {
    ctx.logger('menpai-core').warn(
      'menpai-core 仅为兼容壳，不再登记出厂目录；请用 bootOfficialPack()/bootMenpai() 加载 changye',
    );
  },
};

export { Changye, CHANGYE_PACK_ID } from '../../content/changye';
