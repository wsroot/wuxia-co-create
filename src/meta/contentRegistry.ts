/**
 * Read-only facade over the Cordis content services (src/plugins/services.ts).
 *
 * Content is registered by Cordis plugins: 门派 via ctx.skills / ctx.neigong,
 * 内容包 via the other services (see docs/门派与内容包.md). Game code reads
 * catalogs through these helpers or live aliases (WEAPONS / …).
 *
 * Effect data now on defs (skills / neigong / pills / eliteMods / affixes / enemies /
 * fragments / bossKits / armorPieces). Elite weaponCounters live on EliteModDef.
 * B-tier catalogs (attacks/poses/projectiles/fxRecipes/animRecipes/sheets/sfx/volleys/
 * silhouettes/behaviors/backdrops/bossMoves/weaponLooks/colliders/combatStyles) are plugin-fillable. Still core:
 *   - Interpreters (hitbox runner, bone solver, emitters, sheet decode, mix bus)
 *   - Combat loop, physics, save format, taxonomy rulers, sandbox limits
 *   - High-risk boss primitives (dive/roar) — kits weight registered move ids
 *   - New ScriptStep / BehaviorStep / SilhouettePart kinds (C-tier rare expand)
 *
 * Player-facing UI must not expose plugin jargon; this module is internal.
 */
import type { WeaponDef } from './weapons';
import type { PillDef } from './alchemy';
import type { MaterialDef } from './materials';
import type { TalismanDef } from './talismans';
import type { TalismanScriptDef } from './talismanScripts';
import type { StageDef } from '../level/stage';
import type { ActPool } from '../level/actPools';
import type { StageBeat } from '../level/narrative';
import type { SkillDef } from './skills';
import type { AnimRecipeDef } from './animScripts';
import type { WeaponLookDef } from './weaponLooks';
import type { CombatStyleDef } from '../combat/playerMoves';
import {
  BLADE_CHAIN_STYLE, BARE_CHAIN_STYLE, categoryDefaultCombatStyleId,
} from '../combat/playerMoves';
import type { WeaponCategory } from './weapons';
import type { NeigongDef } from './neigong';
import type { ArmorSetDef } from './armorSets';
import type { WepAffixDef } from './weaponInstAffix';
import type { AffixDef } from '../level/affixes';
import type { EnemyDef } from '../entities/enemies/factory';
import type { EliteModDef } from '../level/eliteMods';
import type { TitleDef } from './titles';
import type { BossKitDef } from '../level/actPools';
import type { FragmentDef } from './runFragments';
import type { ArmorDef } from './gear';
import type {
  AttackBoxDef, PoseDef, ProjectileDef, FxRecipeDef, SheetDef, SfxDef,
  VolleyDef, SilhouetteDef, BehaviorDef, BackdropDef, BossMoveDef,
  ColliderProfile,
} from './bTier';
import type { Pose } from '../render/rig';
import { game } from '../plugins/root';
import type { AudioEngine } from '../audio/audio';
import { hasSfxBuffer, isValidSfxFileSrc, requestSfxDecode } from '../audio/sfxBuffers';

/* ── weapons / pills / materials / talismans ─────────────── */

export const getWeapon = (id: string): WeaponDef | undefined => game.weapons.get(id);
export const listWeapons = (): WeaponDef[] => game.weapons.list();
export const weaponMapView = (): Record<string, WeaponDef> => game.weapons.map();

export const getPill = (id: string): PillDef | undefined => game.pills.get(id);
export const listPills = (): PillDef[] => game.pills.list();
export const pillMapView = (): Record<string, PillDef> => game.pills.map();

export const getMaterial = (id: string): MaterialDef | undefined => game.materials.get(id);
export const listMaterials = (): MaterialDef[] => game.materials.list();
export const materialMapView = (): Record<string, MaterialDef> => game.materials.map();

export const getTalisman = (id: string): TalismanDef | undefined => game.talismans.get(id);
export const listTalismans = (): TalismanDef[] => game.talismans.list();
export const talismanMapView = (): Record<string, TalismanDef> => game.talismans.map();

export const getTalismanScript = (id: string): TalismanScriptDef | undefined => game.talismans.getScript(id);
export const listTalismanScripts = (): TalismanScriptDef[] => game.talismans.listScripts();

/* ── stages / acts ───────────────────────────────────────── */

export const getStage = (id: string): StageDef | undefined => game.stages.get(id);
/** Live campaign list — index === actIndex; may contain holes. */
export const listStages = (): StageDef[] => game.stages.list();
export const campaignLength = (): number => game.stages.count();
export const getStageByActIndex = (actIndex: number): StageDef => game.stages.at(actIndex);

export const listActPools = (): ActPool[] => game.acts.listPools();
export const getActPoolByIndex = (actIndex: number): ActPool => game.acts.getPool(actIndex);

export const listBetweenActBeats = (): StageBeat[] => game.acts.listBeats();
export const getBetweenActBeat = (fromAct: number): StageBeat | undefined => game.acts.getBeat(fromAct);

/* ── skills / neigong / armor / affixes / titles ─────────── */

export const getSkill = (id: string): SkillDef | undefined => game.skills.get(id);
export const listSkills = (): SkillDef[] => game.skills.list();
export const skillMapView = (): Record<string, SkillDef> => game.skills.map();

export const getNeigong = (id: string): NeigongDef | undefined => game.neigong.get(id);
export const listNeigongs = (): NeigongDef[] => game.neigong.list();
export const neigongMapView = (): Record<string, NeigongDef> => game.neigong.map();

export const getArmorSet = (id: string): ArmorSetDef | undefined => game.armorSets.get(id);
export const listArmorSets = (): ArmorSetDef[] => game.armorSets.list();
export const armorSetMapView = (): Record<string, ArmorSetDef> => game.armorSets.map();

export const getWepAffix = (id: string): WepAffixDef | undefined => game.wepAffixes.get(id);
export const listWepAffixes = (): WepAffixDef[] => game.wepAffixes.list();
export const wepAffixMapView = (): Record<string, WepAffixDef> => game.wepAffixes.map();

export const getAffix = (id: string): AffixDef | undefined => game.affixes.get(id);
export const listAffixes = (): AffixDef[] => game.affixes.list();
export const affixMapView = (): Record<string, AffixDef> => game.affixes.map();

export const getEnemy = (id: string): EnemyDef | undefined => game.enemies.get(id);
export const listEnemies = (): EnemyDef[] => game.enemies.list();
export const enemyMapView = (): Record<string, EnemyDef> => game.enemies.map();

export const getEliteMod = (id: string): EliteModDef | undefined => game.eliteMods.get(id);
export const listEliteMods = (): EliteModDef[] => game.eliteMods.list();
export const eliteModMapView = (): Record<string, EliteModDef> => game.eliteMods.map();

export const getTitle = (id: string): TitleDef | undefined => game.titles.get(id);
export const listTitles = (): TitleDef[] => game.titles.list();
export const titleMapView = (): Record<string, TitleDef> => game.titles.map();

export const getBossKit = (id: string): BossKitDef | undefined => game.bossKits.get(id);
export const listBossKits = (): BossKitDef[] => game.bossKits.list();
export const bossKitMapView = (): Record<string, BossKitDef> => game.bossKits.map();

export const getFragment = (id: string): FragmentDef | undefined => game.fragments.get(id);
export const listFragments = (): FragmentDef[] => game.fragments.list();
export const fragmentMapView = (): Record<string, FragmentDef> => game.fragments.map();

export const getArmorPiece = (id: string): ArmorDef | undefined => game.armorPieces.get(id);
export const listArmorPieces = (): ArmorDef[] => game.armorPieces.list();
export const armorPieceMapView = (): Record<string, ArmorDef> => game.armorPieces.map();

/* ── B-tier catalogs ─────────────────────────────────────── */

export const getAttackBox = (id: string): AttackBoxDef | undefined => game.attacks.get(id);
export const listAttackBoxes = (): AttackBoxDef[] => game.attacks.list();
export const attackBoxMapView = (): Record<string, AttackBoxDef> => game.attacks.map();

export const getCombatStyle = (id: string): CombatStyleDef | undefined => game.combatStyles.get(id);
export const listCombatStyles = (): CombatStyleDef[] => game.combatStyles.list();
export const combatStyleMapView = (): Record<string, CombatStyleDef> => game.combatStyles.map();

/**
 * Resolve 普攻链 Style for a weapon (or unarmed).
 * Priority:
 *   1. WeaponDef.combatStyleId → ctx.combatStyles (miss → soft-skip)
 *   2. category bare → id `bare`; else → `blade`
 *   3. ctx.combatStyles.get(id); miss → CORE seed constant (BLADE/BARE)
 * Never throws.
 */
export function resolveCombatStyle(
  weapon?: { combatStyleId?: string; category?: WeaponCategory } | null,
): CombatStyleDef {
  const seedOf = (id: string): CombatStyleDef =>
    id === 'bare' ? BARE_CHAIN_STYLE : BLADE_CHAIN_STYLE;
  if (weapon?.combatStyleId) {
    const hit = game.combatStyles.get(weapon.combatStyleId);
    if (hit) return hit;
    // soft-skip missing combatStyleId
  }
  const defId = categoryDefaultCombatStyleId(weapon?.category);
  return game.combatStyles.get(defId) ?? seedOf(defId);
}

export const getPose = (id: string): PoseDef | undefined => game.poses.get(id);
export const listPoses = (): PoseDef[] => game.poses.list();
export const poseMapView = (): Record<string, PoseDef> => game.poses.map();
/** Soft pose lookup; missing → slash1 (or undefined if catalog empty). */
export function getAttackPose(id: string): PoseDef | undefined {
  return game.poses.get(id) ?? game.poses.get('slash1');
}

/** Soft single-frame locomotion: catalog `id` strike if registered, else hard fallback.
 *  Loco convention: player `hp.<slot>`, trash `sp.<slot>`; PoseDef still three-frame (often same). */
export function locoPose(id: string, fallback: Pose): Pose {
  return getPose(id)?.strike ?? fallback;
}

export const getProjectile = (id: string): ProjectileDef | undefined => game.projectiles.get(id);
export const listProjectiles = (): ProjectileDef[] => game.projectiles.list();
export const projectileMapView = (): Record<string, ProjectileDef> => game.projectiles.map();

/**
 * Soft AttackBox id for a projectile recipe (ArrowProj1/3).
 * Explicit `def.attackKey` wins; else fireball drawKind/kindHint → `'gFire'`; else `'arrow'`.
 * Boss fireball spawn and rangedAttack both use this so CORE fireball stays bit-identical to gFire.
 */
export function resolveProjectileAttackKey(
  def: ProjectileDef | undefined,
  kindHint?: string,
): string {
  if (def?.attackKey) return def.attackKey;
  const draw = def?.drawKind ?? (kindHint === 'fireball' ? 'fireball' : undefined);
  if (draw === 'fireball' || kindHint === 'fireball') return 'gFire';
  return 'arrow';
}

export const getFxRecipe = (id: string): FxRecipeDef | undefined => game.fxRecipes.get(id);
export const listFxRecipes = (): FxRecipeDef[] => game.fxRecipes.list();
export const fxRecipeMapView = (): Record<string, FxRecipeDef> => game.fxRecipes.map();

export const getSheet = (id: string): SheetDef | undefined => game.sheets.get(id);
export const listSheets = (): SheetDef[] => game.sheets.list();
export const sheetMapView = (): Record<string, SheetDef> => game.sheets.map();

export const getSfxDef = (id: string): SfxDef | undefined => game.sfx.get(id);
export const listSfx = (): SfxDef[] => game.sfx.list();
export const sfxMapView = (): Record<string, SfxDef> => game.sfx.map();

/**
 * Soft hit sfx for a projectile recipe (hitSfx 命中消费 + R4a 文件).
 * Returns catalog id when currently playable (cached buffer and/or synth).
 * src-only without buffer → undefined (kick lazy decode if audio given) → today hit/hitHeavy.
 * Missing / unknown / illegal → undefined.
 */
export function resolveProjectileHitSfx(
  def: ProjectileDef | undefined,
  audio?: AudioEngine,
): string | undefined {
  const id = def?.hitSfx?.trim();
  if (!id) return undefined;
  const sdef = getSfxDef(id);
  if (!sdef) return undefined;
  if (hasSfxBuffer(id)) return id;
  if (sdef.synth) {
    if (audio && sdef.src && isValidSfxFileSrc(sdef.src, sdef.format)) {
      requestSfxDecode(audio, sdef);
    }
    return id;
  }
  if (sdef.src && isValidSfxFileSrc(sdef.src, sdef.format)) {
    if (audio) requestSfxDecode(audio, sdef);
    return undefined;
  }
  return undefined;
}


export const getVolley = (id: string): VolleyDef | undefined => game.volleys.get(id);
export const listVolleys = (): VolleyDef[] => game.volleys.list();
export const volleyMapView = (): Record<string, VolleyDef> => game.volleys.map();

export const getSilhouette = (id: string): SilhouetteDef | undefined => game.silhouettes.get(id);
export const listSilhouettes = (): SilhouetteDef[] => game.silhouettes.list();
export const silhouetteMapView = (): Record<string, SilhouetteDef> => game.silhouettes.map();

export const getBehavior = (id: string): BehaviorDef | undefined => game.behaviors.get(id);
export const listBehaviors = (): BehaviorDef[] => game.behaviors.list();
export const behaviorMapView = (): Record<string, BehaviorDef> => game.behaviors.map();

export const getBackdrop = (id: string): BackdropDef | undefined => game.backdrops.get(id);
export const listBackdrops = (): BackdropDef[] => game.backdrops.list();
export const backdropMapView = (): Record<string, BackdropDef> => game.backdrops.map();

export const getBossMove = (id: string): BossMoveDef | undefined => game.bossMoves.get(id);
export const listBossMoves = (): BossMoveDef[] => game.bossMoves.list();
export const bossMoveMapView = (): Record<string, BossMoveDef> => game.bossMoves.map();

export const getAnimRecipe = (id: string): AnimRecipeDef | undefined => game.animRecipes.get(id);
export const listAnimRecipes = (): AnimRecipeDef[] => game.animRecipes.list();
export const animRecipeMapView = (): Record<string, AnimRecipeDef> => game.animRecipes.map();

export const getWeaponLook = (id: string): WeaponLookDef | undefined => game.weaponLooks.get(id);
export const listWeaponLooks = (): WeaponLookDef[] => game.weaponLooks.list();
export const weaponLookMapView = (): Record<string, WeaponLookDef> => game.weaponLooks.map();

export const getCollider = (id: string): ColliderProfile | undefined => game.colliders.get(id);
export const listColliders = (): ColliderProfile[] => game.colliders.list();
export const colliderMapView = (): Record<string, ColliderProfile> => game.colliders.map();
