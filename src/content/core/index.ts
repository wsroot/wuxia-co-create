/**
 * @deprecated Official world content registers via 官方大包 `changye`
 * (`src/content/changye`) through `bootOfficialPack()` / `bootMenpai()`.
 *
 * Oc3：本模块 **冻结** — `ContentCore.apply` 不再登记任何目录，以免与 changye 双载。
 * Prefer `Changye` or `bootOfficialPack()`. `bootContent()` does not load this.
 */
import { Context, Schema } from 'cordis';
import {
  ChangyeMaterials, ChangyeWeapons, ChangyePills, ChangyeTalismans, ChangyeCampaign,
  ChangyeArmorSets, ChangyeWepAffixes, ChangyeAffixes, ChangyeEnemies, ChangyeEliteMods,
  ChangyeTitles, ChangyeBossKits, ChangyeFragments, ChangyeArmorPieces,
  ChangyeCombatCatalog, ChangyeMediaCatalog, ChangyeBodyCatalog,
} from '../changye';

/** @deprecated Prefer Changye* from `content/changye` */
export const CoreMaterials = ChangyeMaterials;
/** @deprecated */
export const CoreWeapons = ChangyeWeapons;
/** @deprecated */
export const CorePills = ChangyePills;
/** @deprecated */
export const CoreTalismans = ChangyeTalismans;
/** @deprecated */
export const CoreCampaign = ChangyeCampaign;
/** @deprecated */
export const CoreArmorSets = ChangyeArmorSets;
/** @deprecated */
export const CoreWepAffixes = ChangyeWepAffixes;
/** @deprecated */
export const CoreAffixes = ChangyeAffixes;
/** @deprecated */
export const CoreEnemies = ChangyeEnemies;
/** @deprecated */
export const CoreEliteMods = ChangyeEliteMods;
/** @deprecated */
export const CoreTitles = ChangyeTitles;
/** @deprecated */
export const CoreBossKits = ChangyeBossKits;
/** @deprecated */
export const CoreFragments = ChangyeFragments;
/** @deprecated */
export const CoreArmorPieces = ChangyeArmorPieces;
/** @deprecated */
export const CoreCombatCatalog = ChangyeCombatCatalog;
/** @deprecated */
export const CoreMediaCatalog = ChangyeMediaCatalog;
/** @deprecated */
export const CoreBodyCatalog = ChangyeBodyCatalog;

export interface ContentCoreConfig {}

/**
 * Legacy alias — frozen no-op. Prefer `bootOfficialPack()` / `Changye`.
 */
export const ContentCore = {
  name: 'content-core',
  Config: Schema.object({}) as Schema<ContentCoreConfig>,
  apply(ctx: Context) {
    ctx.logger('content-core').warn(
      'content-core 已冻结：出厂目录请用 bootOfficialPack()/Changye；跳过登记以免双载',
    );
  },
};
