/**
 * 官方默认大包「长夜」数据面（Oc4）。
 *
 * Cordis 技术 id：`changye`（always-on；勿进 OPTIONAL_PACKS）。
 * 出厂 `CORE_*` **字面量**在 `./seeds/`；本 barrel 为包内规范出口。
 * 框架侧若仍见同名 export，仅为 Oc4 兼容 re-export（Oc5 可删）。
 *
 * 禁止与 menpai-core / content-core 再各灌一遍同一批 id。
 */
export { CORE_MATERIALS } from './seeds/materials';
export { CORE_WEAPONS } from './seeds/weapons';
export { CORE_PILLS } from './seeds/pills';
export { CORE_TALISMANS } from './seeds/talismans';
export { CORE_SCRIPTS } from './seeds/talismanScripts';
export { CORE_ANIM_RECIPES } from './seeds/animRecipes';
export { CORE_STAGES, CORE_BETWEEN_ACT_BEATS } from './seeds/stages';
export { CORE_ACT_POOLS } from './seeds/actPools';
export { CORE_BOSS_KITS } from './seeds/bossKits';
export { CORE_ARMOR_SETS } from './seeds/armorSets';
export { CORE_WEP_AFFIXES } from './seeds/wepAffixes';
export { CORE_AFFIXES } from './seeds/affixes';
export { CORE_ENEMIES } from './seeds/enemies';
export { CORE_ELITE_MODS } from './seeds/eliteMods';
export { CORE_TITLES } from './seeds/titles';
export { CORE_FRAGMENTS } from './seeds/fragments';
export { CORE_ARMOR_PIECES } from './seeds/armorPieces';
export { CORE_SKILLS } from './seeds/skills';
export { CORE_NEIGONGS } from './seeds/neigongs';
export {
  CORE_ATTACK_BOXES, CORE_POSES, CORE_PROJECTILES, CORE_FX_RECIPES,
  CORE_SHEETS, CORE_SFX, CORE_VOLLEYS, CORE_SILHOUETTES, CORE_BEHAVIORS,
  CORE_BACKDROPS, CORE_BOSS_MOVES, CORE_COLLIDERS,
} from './seeds/coreData';
export { CORE_WEAPON_LOOKS } from './seeds/weaponLooks';
export { CORE_COMBAT_STYLES } from './seeds/combatStyles';
