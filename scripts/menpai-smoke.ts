/**
 * Node smoke test for the 门派 (Cordis) content services.
 * Run: npm run test:menpai   (bundles with esbuild, then runs in node)
 */
import { game } from '../src/plugins/root';
import { bootMenpai, bootOfficialPack, isOfficialPackLoaded, CHANGYE_PACK_ID, loadMenpai, unloadMenpai, loadPack, unloadPack, listMenpaiCatalog, listLoadedMenpai, isMenpaiLoaded, listDlcStore, listPackCatalog, isPackLoaded, enableDlc } from '../src/menpai';
import { WEAPONS, WEAPON_BY_ID } from '../src/meta/weapons';
import { scaleAttack, loadout, affinityVs } from '../src/combat/weaponRuntime';
import { PM, BLADE_CHAIN_STYLE, BARE_CHAIN_STYLE, SEED_BY_NAME, hasCombatCue } from '../src/combat/playerMoves';
import { CORE_COMBAT_STYLES, CORE_ACT_POOLS } from '../src/content/changye/data';
import { PILLS, PILL_BY_ID } from '../src/meta/alchemy';
import { MATERIALS } from '../src/meta/materials';
import { TALISMANS, TALISMAN_BY_ID } from '../src/meta/talismans';
import { talismanIconUrl } from '../src/render/artAssets';
import { TALISMAN_SCRIPTS, getTalismanScript } from '../src/meta/talismanScripts';
import { CHAPTERS, BETWEEN_ACT_BEATS, actCount, getChapter } from '../src/level/stage';
import { ACT_POOLS, actPool, BOSS_KITS, BOSS_KIT_BY_ID, bossMoveWeights, getBossKit } from '../src/level/actPools';
import { SKILLS, SKILL_BY_ID, effectsAtRank } from '../src/meta/skills';
import { NEIGONGS, NEIGONG_BY_ID, neigongEffects } from '../src/meta/neigong';
import { ARMOR_SETS, ARMOR_SET_BY_ID } from '../src/meta/armorSets';
import { WEP_AFFIXES, WEP_AFFIX_BY_ID } from '../src/meta/weaponInstAffix';
import { AFFIXES, AFFIX_BY_ID, pickAffixForAct, pickSecondaryAffix, primaryAffixPool, secondaryAffixPool, collectStageAffixBias } from '../src/level/affixes';
import { ENEMIES, ENEMY_BY_ID, makeEnemy, makeBoss, resolveBossKit } from '../src/entities/enemies/factory';
import { loadoutIncomingMul, scaleLoadoutAttack, tryCastBossLoadout, tickEnemyLoadoutTimers, BOSS_LOADOUT_CAST_STATES } from '../src/entities/enemies/loadout';
import { tickBossBehaviorGap, BOSS_GAP_LOCO_KINDS } from '../src/entities/enemies/behaviorInterp';
import { BEHAVIOR_STEP_KINDS } from '../src/meta/bTier/types';
import { Player } from '../src/entities/player';
import { SPEAR_THRUST } from '../src/entities/enemies/bodyAttacks';
import * as bodyAttacksMod from '../src/entities/enemies/bodyAttacks';
import { BUILTIN_BOSS_ATTACKS } from '../src/entities/boss/bossMoves';
import { applyClawMoveSoft, walkCooldownFromMove, windFramesFromMove, GSM4_WIND_DEFAULTS, DFR1_ROAR_DEFAULTS, roarRadiusFromMove, roarActiveFromMove, DFR2_FB_DEFAULTS, fbRiseFromMove, fbCountFromMove, fbGapFromMove, fbProjectileIdFromMove, DFR3_DIVE_DEFAULTS, diveAimWindFromMove, diveWaveRadiusFromMove, diveRecoverFromMove, diveBodyKeyFromMove, diveWaveKeyFromMove } from '../src/entities/boss/gargoyle';
import { ELITE_MODS, ELITE_MOD_BY_ID } from '../src/level/eliteMods';
import { TITLES, TITLE_BY_ID } from '../src/meta/titles';
import { FRAGMENTS, FRAGMENT_BY_ID, rollFragmentId, fragmentSkillDmgMul, fragmentAtkMul, emptyFragments, tryAddFragment } from '../src/meta/runFragments';
import { ARMOR_DEFS, ARMOR_BY_ID, rollArmorDef } from '../src/meta/gear';
import {
  listAttackBoxes, listPoses, listProjectiles, listFxRecipes, listSheets, listSfx,
  listVolleys, listSilhouettes, listBehaviors, listBackdrops, listBossMoves, listAnimRecipes,
  listWeaponLooks, listColliders, listCombatStyles,
  getAttackBox, getAttackPose, getPose, locoPose, getProjectile, resolveProjectileAttackKey, resolveProjectileHitSfx, getFxRecipe, getSheet, getSfxDef,
  getVolley, getSilhouette, getBehavior, getBackdrop, getBossMove, getAnimRecipe,
  getWeaponLook, getCollider, getCombatStyle, resolveCombatStyle,
  getEliteMod, getFragment, getTitle,
  getMaterial, getArmorSet, getArmorPiece, getWepAffix, getAffix,
  getPill, getNeigong,
  getBetweenActBeat,
} from '../src/meta/contentRegistry';
import {
  hasSfxBuffer, isValidSfxFileSrc, putSfxBuffer, clearSfxBuffer, clearAllSfxBuffers,
  SFX_FILE_MAX_BYTES,
} from '../src/audio/sfxBuffers';
import { existsSync } from 'node:fs';
import { weaponCounterElite } from '../src/combat/weaponCounters';
import { resolveSilhouetteWeaponLook } from '../src/render/resolveSilhouetteLook';
import { resolveGargoyleSilhouetteLook } from '../src/render/drawGargoyle';
import { appearanceFromWeapon } from '../src/render/drawWeaponAppearance';
import { HP, SP, SKEL_ATTACKS, GARG_ATTACKS } from '../src/render/poses';
import { attackPose, P } from '../src/render/rig';
import { AnimScriptPlayer } from '../src/meta/animScripts';
import { validateAnimSteps } from '../src/plugins/schemas';
import type { Pose } from '../src/render/rig';
import { WEAPON_LOOK_PART_KINDS } from '../src/meta/weaponLooks';
import { freshSave } from '../src/meta/save';
import { Progression } from '../src/meta/progression';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyContent, REMOTE_DLC_INJECT } from '../src/dlc/remote';
import type { DlcContentBody } from '../src/dlc/types';

let fail = 0;
const ok = (cond: unknown, msg: string) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) fail++;
};
const ids = (a: Array<{ id: string } | undefined>) => a.filter(Boolean).map((x) => x!.id);
const snapshot = () => ({
  weapons: ids(WEAPONS), pills: ids(PILLS), materials: ids(MATERIALS), talismans: ids(TALISMANS),
  scripts: ids(TALISMAN_SCRIPTS), stages: ids(CHAPTERS),
  actPools: ACT_POOLS.filter(Boolean).map((p) => p.kit), beats: ids(BETWEEN_ACT_BEATS),
  skills: ids(SKILLS), neigong: ids(NEIGONGS), armorSets: ids(ARMOR_SETS),
  wepAffixes: ids(WEP_AFFIXES), affixes: ids(AFFIXES), enemies: ids(ENEMIES), eliteMods: ids(ELITE_MODS), titles: ids(TITLES),
  bossKits: ids(BOSS_KITS), fragments: ids(FRAGMENTS), armorPieces: ids(ARMOR_DEFS),
  attacks: ids(listAttackBoxes()), poses: ids(listPoses()), projectiles: ids(listProjectiles()),
  fxRecipes: ids(listFxRecipes()), sheets: ids(listSheets()), sfx: ids(listSfx()),
  volleys: ids(listVolleys()), silhouettes: ids(listSilhouettes()), behaviors: ids(listBehaviors()),
  backdrops: ids(listBackdrops()), bossMoves: ids(listBossMoves()),
  animRecipes: ids(listAnimRecipes()),
  weaponLooks: ids(listWeaponLooks()),
  colliders: ids(listColliders()),
  combatStyles: ids(listCombatStyles()),
});

ok(WEAPONS.length === 0 && SKILLS.length === 0 && AFFIXES.length === 0 && ENEMIES.length === 0
  && FRAGMENTS.length === 0 && ARMOR_DEFS.length === 0 && BOSS_KITS.length === 0, 'catalogs empty before boot');

// Oc3: officialPack=false → 目录空/近空；OPTIONAL 仍可叠；再开包 → 长夜齐全
bootMenpai([], [], { officialPack: false });
ok(!isOfficialPackLoaded() && !isMenpaiLoaded('core'), 'Oc3: pack off → not loaded');
{
  const emptyOff = snapshot();
  ok(emptyOff.weapons.length === 0 && emptyOff.skills.length === 0 && emptyOff.stages.length === 0
    && emptyOff.enemies.length === 0 && emptyOff.attacks.length === 0 && emptyOff.pills.length === 0,
    'Oc3: pack off → catalogs near-empty');
  ok(loadPack('hanmang') && !!TALISMAN_BY_ID['hanmangfu'], 'Oc3: OPTIONAL stacks with pack off');
  ok(unloadPack('hanmang') && !('hanmangfu' in TALISMAN_BY_ID), 'Oc3: OPTIONAL unload with pack off');
  ok(JSON.stringify(snapshot()) === JSON.stringify(emptyOff), 'Oc3: back to empty after OPTIONAL unload');
}
bootOfficialPack();
ok(isOfficialPackLoaded() && isMenpaiLoaded('core') && isMenpaiLoaded(CHANGYE_PACK_ID), 'Oc3: pack on → 官方包 changye/core 壳 loaded');
const after = snapshot();
const counts = Object.fromEntries(Object.entries(after).map(([k, v]) => [k, v.length]));
console.log('counts:', JSON.stringify(counts));

// Pre-migration expected counts for newly migrated catalogs (and prior ones).
const EXPECTED: Record<string, number> = {
  weapons: 14, pills: 14, materials: 10, talismans: 12, scripts: 12,
  stages: 4, actPools: 4, beats: 3,
  skills: 19, neigong: 4, armorSets: 7, wepAffixes: 6, affixes: 7, enemies: 5, eliteMods: 6, titles: 5,
  bossKits: 4, fragments: 7, armorPieces: 21,
  // B-tier handed back
  attacks: 53, poses: 21, projectiles: 2, fxRecipes: 7, sheets: 6, sfx: 30,
  volleys: 3, silhouettes: 5, behaviors: 5, backdrops: 4, bossMoves: 10,
  animRecipes: 13,
  weaponLooks: 8,
  colliders: 5,
  combatStyles: 2,
};
for (const [k, n] of Object.entries(EXPECTED)) {
  ok(counts[k] === n, `${k} count ${counts[k]} === ${n}`);
}

const expected = process.env.PRE_JSON ? JSON.parse(process.env.PRE_JSON) : null;
if (expected) ok(JSON.stringify(after) === JSON.stringify(expected), 'ids + order identical to pre-migration snapshot');
ok(actCount() === 4 && getChapter(9).id === 'act4' && actPool(2).kit === 'tomb', 'campaign lookups clamp like before');

// Anim recipes + skill/talisman castAnim hooks
ok(!!getAnimRecipe('slashInk')?.steps?.length, 'core anim slashInk');
ok(!!getAnimRecipe('thrustInk')?.steps?.length, 'core anim thrustInk');
ok(!!getAnimRecipe('sealBurst')?.steps?.length, 'core anim sealBurst');
ok(!!getAnimRecipe('hopSlash')?.steps?.some((s) => s.kind === 'hop'), 'core anim hopSlash has hop');
ok(!!getAnimRecipe('hopSlash')?.steps?.some((s) => s.kind === 'fallStrike'), 'core anim hopSlash has fallStrike');
ok(!!getAnimRecipe('dashThrust')?.steps?.some((s) => s.kind === 'dash'), 'core anim dashThrust has dash');
ok(!!getAnimRecipe('crescentInk')?.steps?.some((s) => s.kind === 'crescentSlash'), 'core anim crescentInk');
ok(!!getAnimRecipe('groundBreak')?.steps?.some((s) => s.kind === 'groundCrack'), 'core anim groundBreak');
ok(!!getAnimRecipe('mistRise')?.steps?.some((s) => s.kind === 'riseMist'), 'core anim mistRise');
ok(!!getAnimRecipe('sealStampFull')?.steps?.some((s) => s.kind === 'sealStamp'), 'core anim sealStampFull');
ok(talismanIconUrl('quxie', 128) === './art/icons/H-05-tal-1_128.png', 'talismanIconUrl resolves H-05 key');
ok(TALISMAN_BY_ID['quxie']?.icon === 'H-05-tal-1', '官方包 quxie icon key');
ok(!!getAnimRecipe('sealRainCast')?.steps?.some((s) => s.kind === 'sealRain'), 'core anim sealRainCast');
ok(!!getAnimRecipe('baguaBind')?.steps?.some((s) => s.kind === 'baguaRing'), 'core anim baguaBind');
ok(!!getAnimRecipe('paperBurnBurst')?.steps?.some((s) => s.kind === 'paperBurn'), 'core anim paperBurnBurst');
ok(!!getAnimRecipe('exorcismPulse')?.steps?.some((s) => s.kind === 'exorcismWave'), 'core anim exorcismPulse');
ok(game.talismans.getScript('quxie')?.anim === 'exorcismPulse', 'quxie anim=exorcismPulse');
ok(game.talismans.getScript('dingshen')?.anim === 'baguaBind', 'dingshen anim=baguaBind');
ok(SKILL_BY_ID['tuci']?.castAnim === 'dashThrust', 'tuci castAnim=dashThrust');
ok(SKILL_BY_ID['zhanma']?.castAnim === 'hopSlash', 'zhanma castAnim=hopSlash');
// F4: 官方包 skills castAnim → official skill recipes (spot-check)
ok(SKILL_BY_ID['daomang']?.castAnim === 'crescentInk', 'daomang castAnim=crescentInk');
ok(SKILL_BY_ID['qiangjue']?.castAnim === 'thrustInk', 'qiangjue castAnim=thrustInk');
ok(SKILL_BY_ID['bengquan']?.castAnim === 'groundBreak', 'bengquan castAnim=groundBreak');
ok(SKILL_BY_ID['huzhua']?.castAnim === 'slashInk', 'huzhua castAnim=slashInk');
ok(SKILL_BY_ID['huixuan']?.castAnim === 'crescentInk', 'huixuan castAnim=crescentInk');
ok(SKILL_BY_ID['chuanxin']?.castAnim === 'thrustInk', 'chuanxin castAnim=thrustInk');
ok(SKILL_BY_ID['hengsao']?.castAnim === 'slashInk', 'hengsao castAnim=slashInk');
ok(SKILL_BY_ID['kaitian']?.castAnim === 'groundBreak', 'kaitian castAnim=groundBreak');
ok(SKILL_BY_ID['tieshan']?.castAnim === 'dashThrust', 'tieshan castAnim=dashThrust');
ok(SKILL_BY_ID['fanyun']?.castAnim === 'hopSlash', 'fanyun castAnim=hopSlash');
ok(SKILL_BY_ID['liaoshang']?.castAnim === 'mistRise', 'liaoshang castAnim=mistRise');
ok(SKILL_BY_ID['pojun']?.castAnim === 'mistRise', 'pojun castAnim=mistRise');
ok(SKILL_BY_ID['ningqi']?.castAnim === 'mistRise', 'ningqi castAnim=mistRise');
ok(listAnimRecipes().length === 13, '官方包 animRecipes still 13 (F4 no new recipes)');
{
  const plug = game.plugin({
    name: 'anim-reject-test', inject: ['animRecipes'],
    apply(ctx) {
      ctx.animRecipes.add({ id: 'bad_anim', steps: [{ kind: 'notARealKind' as any }] as any });
    },
  });
  ok(!getAnimRecipe('bad_anim'), 'unknown AnimStep kind rejected at register');
  plug.dispose();
}
{
  const plug = game.plugin({
    name: 'anim-hop-test', inject: ['animRecipes'],
    apply(ctx) {
      ctx.animRecipes.add({
        id: 'hop_ok',
        steps: [
          { kind: 'hop', vy: -12, vx: 3, faceMul: true },
          { kind: 'bounce', hops: 2, vy: -7, gapFrames: 12 },
          { kind: 'hover', frames: 10, vy: -0.5 },
          { kind: 'fallStrike', vy: 11 },
        ],
      });
      ctx.animRecipes.add({
        id: 'anim_ext_ok',
        steps: [
          { kind: 'dash', dist: 80, frames: 5 },
          { kind: 'face', dir: 'player' },
          { kind: 'scalePunch', scale: 1.2, frames: 6 },
          { kind: 'landDust', n: 4 },
          { kind: 'sparkBurst', n: 4 },
          { kind: 'flareBurst', size: 40 },
          { kind: 'ringPulse', size: 50 },
          { kind: 'swordQiFlash' },
          { kind: 'camZoom', z: 1.05 },
          { kind: 'slowmo', rate: 0.5, frames: 10 },
          { kind: 'parryFlash' },
          { kind: 'guardGlow', frames: 8 },
          { kind: 'chainPose', poseIds: ['slash1', 'thrust'], frameEach: 4 },
          { kind: 'loopPose', poseId: 'slash1', frames: 8 },
          { kind: 'pullIn', n: 4, frames: 8 },
          { kind: 'orbitRing', n: 4, frames: 8 },
          { kind: 'beamLine', length: 80 },
          { kind: 'crescentSlash', radius: 70 },
          { kind: 'groundCrack', width: 60 },
          { kind: 'riseMist', frames: 10 },
          { kind: 'sealPaper', frames: 8 },
          { kind: 'sealStamp', text: '印' },
          { kind: 'sealSpin', text: '符', revs: 1 },
          { kind: 'sealRain', count: 3 },
          { kind: 'sealChain', count: 2, gap: 3 },
          { kind: 'talismanTrail', frames: 8 },
          { kind: 'inkSplash', size: 30 },
          { kind: 'baguaRing', frames: 10 },
          { kind: 'runeOrbit', count: 4, frames: 10 },
          { kind: 'paperBurn', frames: 10 },
          { kind: 'exorcismWave', radius: 80, frames: 10 },
          { kind: 'bindThreads', frames: 10 },
          { kind: 'soulBell', frames: 10 },
        ],
      });
      ctx.animRecipes.add({
        id: 'hop_bad_vy',
        steps: [{ kind: 'hop', vy: -99 } as any],
      });
    },
  });
  ok(!!getAnimRecipe('hop_ok'), 'motion AnimSteps accepted at register');
  ok(!!getAnimRecipe('anim_ext_ok'), 'extended AnimSteps accepted at register');
  ok(!getAnimRecipe('hop_bad_vy'), 'hop vy out of range rejected');
  plug.dispose();
}

// Empty interpreter + changye pack yields playable catalog; fresh save is bare
{
  const s = freshSave();
  ok(s.ownedWeapons.length === 0 && !s.equippedWeapon && !s.equippedWeaponUid, 'fresh save: no weapon');
  ok(s.skills.length === 0 && Object.keys(s.skillRanks).length === 0, 'fresh save: no skills');
  ok(s.knownNeigong.length === 0 && s.equippedNeigong === null, 'fresh save: no neigong');
  ok(Object.keys(s.pills).length === 0 && s.knownRecipes.length === 0, 'fresh save: no pills/recipes');
  ok(Object.keys(s.talismans).length === 0 && s.knownTalismans.length === 0, 'fresh save: no talismans');
  const prog = new Progression(s);
  ok(prog.isBareHands(), 'fresh Progression is bare hands');
  ok(!WEAPON_BY_ID['fist'], 'fist is not a registered weapon id');
}

// Spot-check live maps
ok(SKILL_BY_ID['qinggong']?.name === '轻功' && NEIGONG_BY_ID['hunyuan']?.name === '混元功', 'skills/neigong maps live');
ok(ARMOR_SET_BY_ID['yexing']?.name === '夜行残响' && WEP_AFFIX_BY_ID['poshi']?.name === '破势', 'armor/wepAffix maps live');
ok(AFFIX_BY_ID['duwu']?.name === '毒雾' && ELITE_MOD_BY_ID['tongpi']?.name === '铜皮' && TITLE_BY_ID['wushang']?.name === '无伤归客', 'affix/elite/title maps live');
ok(ENEMY_BY_ID['axe']?.name === '山贼亡魂' && ENEMY_BY_ID['gargoyle']?.isBoss === true, 'enemy catalog maps live');

// Effect-on-def: 官方包 ids match pre-migration numbers
ok(effectsAtRank('tiebushan', 5).defBonus === 0.12, 'tiebushan r5 defBonus 0.12');
ok(effectsAtRank('qinggong', 3).jumpBoost === 1.12 && effectsAtRank('qinggong', 1).doubleJump === true, 'qinggong jump/double');
ok(effectsAtRank('pojun', 1).pojunMult === 1.35 && effectsAtRank('pojun', 1).pojunDuration === Math.round(5 * 60), 'pojun r1 table');
ok(effectsAtRank('liaoshang', 5).healAmt === 36 && effectsAtRank('daomang', 5).skillDmgMult === 1.3, 'heal/attack tables');
ok(neigongEffects('hunyuan', 5).damageBonus === 0.2 && neigongEffects('xueying', 5).lifesteal === 0.04, 'neigong effect tables');
ok(neigongEffects('qingxu', 5).parryWindowBonus === 4 && neigongEffects('lieshan', 5).poiseMul === 1.22, 'neigong signature scale');
// Neigong drop candidates mirror game.ts: catalog minus already-known
{
  const known = new Set(['hunyuan']);
  const candidates = NEIGONGS.map((n) => n.id).filter((id) => !known.has(id));
  ok(candidates.includes('xueying') && candidates.includes('qingxu') && candidates.includes('lieshan'), 'neigong drop candidates from catalog');
  ok(!candidates.includes('hunyuan'), 'already-known hunyuan skipped in drop candidates');
  ok(candidates.every((id) => NEIGONG_BY_ID[id]?.name), 'neigong drop banner names from def.name');
}
ok(PILL_BY_ID['heal']?.effect?.heal === 40 && PILL_BY_ID['xuming']?.effect?.invuln === 50, 'pill effect on def');
ok(ELITE_MOD_BY_ID['tongpi']?.dmgTakenMul === 0.62 && ELITE_MOD_BY_ID['shanbu']?.dashAway === true, 'elite mod numeric/flags on def');

ok(SKILL_BY_ID['daomang']?.castKind === 'attack' && SKILL_BY_ID['daomang']?.attackKey === 'daomang', 'skill castKind/attackKey');

// B-tier catalogs live
ok(getAttackBox('slash1')?.damage === 8 && getAttackBox('daomang')?.name === 'daomang', 'attack boxes catalog');
// W1: 外功 attackKey/attackChain 只认 ctx.attacks；内容包可 add 新盒；缺 id soft-skip
{
  const plug = game.plugin({
    name: 'w1-attack-catalog', inject: ['attacks', 'skills'],
    apply(ctx) {
      ctx.attacks.add({
        id: 'w1_test_box', name: 'w1_test_box',
        startup: 4, active: 4, recovery: 10,
        box: { x: 0, y: -80, w: 60, h: 60 },
        damage: 12, kbX: 3, kbY: 0,
        hitstun: 20, hitstop: 4, shake: 2, swing: 'slash',
      });
      ctx.skills.add({
        id: 'w1_test_skill', name: '试招', fogName: '武学·试招',
        kind: 'active', track: 'combat',
        lore: 'W1 验收。', tip: '目录盒', profHint: '试炼',
        meditateCost: {}, fee: 0, weaponGate: 'any',
        castKind: 'attack', attackKey: 'w1_test_box',
        attackChain: ['w1_test_box', 'missing_chain_xyz'],
        effects: { skillCd: [30], skillDmgMult: [1] },
      });
    },
  });
  ok(getAttackBox('w1_test_box')?.damage === 12, 'W1: attacks.add new id in catalog');
  ok(SKILL_BY_ID['w1_test_skill']?.attackKey === 'w1_test_box', 'W1: skill attackKey points at catalog id');
  ok(!!getAttackBox(SKILL_BY_ID['w1_test_skill']!.attackKey!), 'W1: attackKey resolves via getAttackBox');
  ok(!getAttackBox('missing_atk_xyz_w1'), 'W1: missing attack id soft-absent (cast soft-skip)');
  ok(!!getAttackBox('huzhua2') && !!getAttackBox('huzhua3'), 'W1: attackChain seed ids (huzhua2/3) in catalog');
  ok(!!getAttackBox('bareKick'), 'W1: BARE.kick seeded as id=name bareKick');
  plug.dispose();
  ok(!getAttackBox('w1_test_box') && !SKILL_BY_ID['w1_test_skill'], 'W1 test unloaded');
}
// A1: 七内置敌盒进官方包 attacks；resolveAttack 只认目录（无 BUILTIN 回退）
{
  const SEVEN = ['axeChop', 'bash', 'charge', 'whip', 'thrust', 'lunge', 'arrow'] as const;
  for (const k of SEVEN) {
    ok(!!getAttackBox(k), `A1: getAttackBox('${k}') seeded`);
  }
  ok(getAttackBox('thrust')?.damage === 13 && getAttackBox('axeChop')?.startup === 40, 'A1: feel matches bodyAttacks seed');
  ok(getAttackBox('lunge')?.box?.w === 96 && getAttackBox('bash')?.name === 'bash', 'A1: box/name intact');
  // 核心杂兵 Behavior 仍挂七名之一
  const axeBeh = getBehavior('axe');
  const spearBeh = getBehavior('spear');
  ok(!!axeBeh?.steps?.some((s) => s.kind === 'meleeAttack' && s.attackKey === 'axeChop'), 'A1: CORE axe behavior uses axeChop');
  ok(!!spearBeh?.steps?.some((s) => s.kind === 'meleeAttack' && s.attackKey === 'thrust'), 'A1: CORE spear behavior uses thrust');
  // 卸掉临时目录项 → soft-absent（不再靠 BUILTIN 救命）
  const plug = game.plugin({
    name: 'a1-body-attack-temp', inject: ['attacks'],
    apply(ctx) {
      ctx.attacks.add({
        id: 'a1_temp_enemy_box', name: 'a1_temp_enemy_box',
        startup: 10, active: 4, recovery: 12,
        box: { x: 0, y: -80, w: 50, h: 50 },
        damage: 9, kbX: 2, kbY: 0,
        hitstun: 12, hitstop: 3, shake: 2, swing: 'slash',
      });
    },
  });
  ok(!!getAttackBox('a1_temp_enemy_box'), 'A1: temp catalog id present');
  plug.dispose();
  ok(!getAttackBox('a1_temp_enemy_box'), 'A1: unloaded catalog id soft-absent (no BUILTIN rescue)');
  ok(!getAttackBox('missing_body_atk_a1_xyz'), 'A1: unknown attackKey soft-absent');
  // 卸掉核心七名之一：目录无货即 soft-absent（种子表同名也不救命）
  ok(SPEAR_THRUST.name === 'thrust' && SPEAR_THRUST.damage === 13, '债11: seed const thrust still mirrors catalog feel');
  const thrustSaved = game.attacks.store.map['thrust'];
  ok(!!thrustSaved, 'A1: thrust was in live catalog');
  delete game.attacks.store.map['thrust'];
  ok(!getAttackBox('thrust'), 'A1: after catalog delete, thrust soft-absent (no BUILTIN rescue)');
  game.attacks.store.map['thrust'] = thrustSaved!;
  ok(!!getAttackBox('thrust'), 'A1: thrust restored');
}
// A4: 旁系硬引用收口 — QUICK_BASH / 射箭走 getAttackBox；运行路径不读 BUILTIN
{
  const bash = getAttackBox('bash');
  ok(!!bash && bash.startup === 20 && bash.damage === 10, 'A4: catalog bash (shield counter source)');
  // counter override is startup:11 at call site — feel base unchanged
  const quickFeel = bash ? { ...bash, startup: 11 } : null;
  ok(!!quickFeel && quickFeel.startup === 11 && quickFeel.damage === 10 && quickFeel.box?.w === 56, 'A4: quick-bash override preserves box/dmg');
  const arrow = getAttackBox('arrow');
  ok(!!arrow && arrow.damage === 10 && arrow.name === 'arrow', 'A4: catalog arrow (projectile dmg source)');
  ok(bash?.name === 'bash' && arrow?.name === 'arrow', 'A4: bash/arrow ids match catalog names');
}
// 债11: BUILTIN_BODY_ATTACKS 整表已删；模块仅导出七常量；运行仍只 getAttackBox
{
  ok(SPEAR_THRUST.name === 'thrust' && SPEAR_THRUST.damage === 13, '债11: SPEAR_THRUST seed const present');
  // no BUILTIN_BODY_ATTACKS export (整表删除) — sync namespace check (rg-equivalent)
  ok(!('BUILTIN_BODY_ATTACKS' in bodyAttacksMod), '债11: bodyAttacks no longer exports BUILTIN_BODY_ATTACKS');
  ok(!!bodyAttacksMod.AXE_CHOP && !!bodyAttacksMod.SHIELD_BASH && !!bodyAttacksMod.SHIELD_CHARGE
    && !!bodyAttacksMod.ARROW && !!bodyAttacksMod.WHIP && !!bodyAttacksMod.SPEAR_THRUST && !!bodyAttacksMod.SPEAR_LUNGE,
    '债11: seven seed consts still exported for coreData');
}
// W2: scaleAttack / affinityVs — no shape=== / no Chinese Boss name branches; tip/axe via feel.boxTune
{
  const spear = WEAPON_BY_ID['spear'];
  ok(!!spear?.feel?.boxTune?.tipXPush, 'W2: core spear has feel.boxTune.tipXPush');
  const axe = WEAPON_BY_ID['axe'];
  ok(!!axe?.feel?.boxTune?.moveBoxWMul?.finisher, 'W2: core axe has feel.boxTune moveBoxWMul');
  const wSpear = loadout('spear', 1);
  const base = PM.slash1;
  const scaled = scaleAttack(base, wSpear);
  const tipPush = spear!.feel!.boxTune!.tipXPush!;
  ok(scaled.box.x === base.box.x + Math.round(tipPush * spear!.reach), 'W2: spear tipXPush applied without shape===');
  const wAxe = loadout('axe', 1);
  const axed = scaleAttack(PM.finisher, wAxe);
  const preMulW = Math.max(28, Math.round(PM.finisher.box.w * axe!.reach));
  ok(axed.box.w === Math.round(preMulW * 1.08), 'W2: axe finisher box widened via feel');
  // affinity: data markers only — display name must NOT grant boss affinity
  const bell = loadout('bell', 1);
  ok(affinityVs(bell, { name: '镇山石兽' }) === null, 'W2: Chinese Boss name alone → no affinity');
  ok(affinityVs(bell, { name: '割喉者' }) === null, 'W2: Chinese 割喉者 alone → no affinity');
  ok(affinityVs(bell, { isBoss: true }) === 'bossGargoyle', 'W2: isBoss marker → bossGargoyle');
  ok(affinityVs(bell, { kind: 'gargoyle' }) === 'bossGargoyle', 'W2: kind gargoyle → bossGargoyle');
  ok(affinityVs(bell, { superArmor: true }) === 'antiArmor', 'W2: superArmor → antiArmor');
  const sp = loadout('spear', 1);
  ok(affinityVs(sp, { kind: 'shield' }) === 'shieldBreak', 'W2: kind shield → shieldBreak');
  // content-only feel path: register sword with tip feel (no spear shape) reproduces tip push
  const plug = game.plugin({
    name: 'w2-feel-box', inject: ['weapons'],
    apply(ctx) {
      ctx.weapons.add({
        id: 'w2_tip_demo', name: '试枪感', lore: 'W2', tip: 'feel tip',
        unlock: { type: 'starter' },
        damage: 1, speed: 1, reach: 1.5, poise: 1, rage: 1, airHover: 1,
        weight: 'medium', category: 'blade', affinities: [], affinityBonus: 0,
        blade: '#fff', trail: '#f00', edge: '#eee', length: 40, shape: 'sword',
        craft: { materials: { iron: 1 }, fee: 1 },
        feel: { boxTune: { tipXPush: 14, tipWFloorMul: 0.92 } },
      });
    },
  });
  const demo = loadout('w2_tip_demo', 1);
  const tipScaled = scaleAttack(base, demo);
  ok(tipScaled.box.x === base.box.x + Math.round(14 * 1.5), 'W2: tip feel works on non-spear shape');
  plug.dispose();
}
// W3: 普攻链数据化 — attackKeys + combatCue；无 def === PM.* 身份比较
{
  ok(BLADE_CHAIN_STYLE.groundKeys.join(',') === 'slash1,slash2,slash3,finisher', 'W3: blade groundKeys');
  ok(BARE_CHAIN_STYLE.groundKeys.join(',') === 'jab1,jab2,palm,claw,bareKick', 'W3: bare groundKeys');
  ok(BLADE_CHAIN_STYLE.branches.groundUp === 'launcher' && BLADE_CHAIN_STYLE.branches.airDown === 'plunge', 'W3: blade direction branches');
  ok(BARE_CHAIN_STYLE.branches.groundUp === 'claw' && BARE_CHAIN_STYLE.branches.airDown === 'bareKick', 'W3: bare direction branches');
  for (const k of BLADE_CHAIN_STYLE.groundKeys) {
    ok(!!getAttackBox(k) || !!SEED_BY_NAME[k], `W3: blade key ${k} resolvable`);
  }
  for (const k of BARE_CHAIN_STYLE.groundKeys) {
    ok(!!getAttackBox(k) || !!SEED_BY_NAME[k], `W3: bare key ${k} resolvable`);
  }
  const plunge = getAttackBox('plunge') ?? SEED_BY_NAME.plunge;
  const rising = getAttackBox('rising') ?? SEED_BY_NAME.rising;
  const launcher = getAttackBox('launcher') ?? SEED_BY_NAME.launcher;
  ok(hasCombatCue(plunge!, 'plunge'), 'W3: plunge combatCue');
  ok(hasCombatCue(rising!, 'rising'), 'W3: rising combatCue');
  ok(hasCombatCue(launcher!, 'launcher') && !!launcher!.swordQi, 'W3: launcher cue+swordQi');
  ok(!!(getAttackBox('finisher') ?? SEED_BY_NAME.finisher)?.swordQi, 'W3: finisher swordQi flag');
  // Identity compare must not be required: scaled copy still carries cue
  const scaled = scaleAttack(plunge!, loadout('dao', 1));
  ok(hasCombatCue(scaled, 'plunge') && scaled.name === 'plunge', 'W3: scaleAttack preserves combatCue');
}
// CombatStyle 目录：官方包种子进目录；内容包可 add；选招经 resolveCombatStyle（不写死仅两套对象身份）
{
  ok(CORE_COMBAT_STYLES.length === 2 && CORE_COMBAT_STYLES[0].id === 'blade' && CORE_COMBAT_STYLES[1].id === 'bare', 'CS: 官方包 combatStyles blade+bare');
  ok(!!getCombatStyle('blade') && !!getCombatStyle('bare'), 'CS: catalog has blade+bare');
  ok(listCombatStyles().length === 2, 'CS: list length 2 after boot');
  const viaCat = resolveCombatStyle({ category: 'blade' });
  const viaBare = resolveCombatStyle({ category: 'bare' });
  ok(viaCat.id === 'blade' && viaCat.groundKeys[0] === 'slash1', 'CS: category blade → blade style');
  ok(viaBare.id === 'bare' && viaBare.groundKeys[0] === 'jab1', 'CS: category bare → bare style');
  // spear/heavy default to blade (not a third hardcoded object)
  ok(resolveCombatStyle({ category: 'spear' }).id === 'blade', 'CS: spear → blade default');
  ok(resolveCombatStyle({ category: 'heavy' }).id === 'blade', 'CS: heavy → blade default');
  // missing combatStyleId soft-skips to category
  ok(resolveCombatStyle({ combatStyleId: 'no_such_style_xyz', category: 'blade' }).id === 'blade', 'CS: missing id soft-skip → category');
  // content pack can register an independent Style; choose path uses get, not BLADE/BARE object identity
  const plug = game.plugin({
    name: 'cs-demo-style', inject: ['combatStyles'],
    apply(ctx) {
      ctx.combatStyles.add({
        id: 'smoke_demo_chain',
        groundKeys: ['slash1', 'slash2', 'palm', 'claw'],
        branches: {
          dash: 'dashKick',
          groundUp: 'launcher',
          groundDown: 'sweep',
          airDown: 'plunge',
          airUp: 'rising',
          airNeutral: ['airA', 'airB'],
          throw: 'throw',
        },
        noChainOpen: ['claw', 'throw'],
        plungeWaveKey: 'plungeWave',
      });
    },
  });
  const demo = getCombatStyle('smoke_demo_chain');
  ok(!!demo && demo.groundKeys.join(',') === 'slash1,slash2,palm,claw', 'CS: content pack styles.add resolvable');
  const resolved = resolveCombatStyle({ combatStyleId: 'smoke_demo_chain', category: 'blade' });
  ok(resolved.id === 'smoke_demo_chain', 'CS: combatStyleId wins over category');
  ok(resolved !== BLADE_CHAIN_STYLE && resolved !== BARE_CHAIN_STYLE, 'CS: resolve is not hardcoded two-constant identity');
  ok(listCombatStyles().some((s) => s.id === 'smoke_demo_chain'), 'CS: list includes demo');
  plug.dispose();
  ok(!getCombatStyle('smoke_demo_chain'), 'CS: unload removes demo style');
  ok(resolveCombatStyle({ combatStyleId: 'smoke_demo_chain', category: 'blade' }).id === 'blade', 'CS: after unload missing id → category blade');
}
ok(getAttackPose('slash1')?.wind && getAttackPose('missing_pose_xyz')?.id === 'slash1', 'pose fallback slash1');
ok(getProjectile('arrow')?.drawKind === 'arrow' && getFxRecipe('flare')?.emitter === 'flare', 'projectile/fx recipes');
ok(getSheet('blade_ink')?.src.includes('art/weapons') && getSfxDef('slash')?.synth === 'slash', 'sheets/sfx catalog');
ok(getVolley('skySword')?.style === 'skySword' && getBossMove('dive')?.kind === 'dive', 'volley/bossMove');
ok(getSilhouette('axe')?.body === 'axe' && getBehavior('archer')?.body === 'archer', 'silhouette/behavior aliases');
ok(getCollider('axe')?.w === 32 && getCollider('axe')?.h === 82, 'core collider axe 32×82');
ok(getCollider('gargoyle')?.w === 70 && getCollider('gargoyle')?.h === 130, 'core collider gargoyle 70×130');
{
  const e = makeEnemy('axe', 0, { eliteChance: 0 });
  ok(e.body.w === 32 && e.body.h === 82, 'makeEnemy axe applies CORE collider via body');
}
// C-tier P2: makeBoss assembles from catalog; makeEnemy no longer returns null for gargoyle
{
  const boss = makeBoss('gargoyle', 100, { hpScale: 1 });
  ok(!!boss && boss.body.w === 70 && boss.body.h === 130, 'makeBoss gargoyle applies CORE collider 70×130');
  ok(boss.maxHp === 900 && boss.name === '镇山石兽', 'makeBoss uses catalog hp/name');
  ok(boss.archetypeId === 'gargoyle', 'makeBoss sets archetypeId');
  const trash = makeEnemy('axe', 0, { eliteChance: 0 });
  ok(!!trash && trash.kind === 'axe', 'makeEnemy axe still OK');
  const mis = makeEnemy('gargoyle', 0, { eliteChance: 0 });
  ok(!!mis && mis.kind === 'axe', 'makeEnemy(gargoyle) soft-aliases to axe (no null)');
}
{
  const plug = game.plugin({
    name: 'collider-inline-test', inject: ['enemies', 'colliders'],
    apply(ctx) {
      ctx.colliders.add({ id: 'wide_box', w: 48, h: 90, label: '宽盒' });
      ctx.enemies.add({
        id: 'wide_bandit', name: '宽盒试', body: 'axe', hp: 40,
        colliderId: 'wide_box',
      });
      ctx.enemies.add({
        id: 'inline_bandit', name: '内联试', body: 'axe', hp: 40,
        colliderId: 'wide_box',
        collider: { w: 20, h: 40, gravityScale: 0.8 },
      });
      // illegal: reject
      ctx.colliders.add({ id: 'bad_col', w: -1, h: 10 } as never);
    },
  });
  ok(!!getCollider('wide_box') && !getCollider('bad_col'), 'collider: valid accepted, illegal rejected');
  const wide = makeEnemy('wide_bandit', 10, { eliteChance: 0 });
  ok(wide.body.w === 48 && wide.body.h === 90, 'makeEnemy applies colliderId');
  const inl = makeEnemy('inline_bandit', 10, { eliteChance: 0 });
  ok(inl.body.w === 20 && inl.body.h === 40 && inl.body.gravityScale === 0.8, 'inline collider wins over colliderId');
  plug.dispose();
  ok(!getCollider('wide_box') && !ENEMY_BY_ID['wide_bandit'], 'collider test unloaded');
}

// C-tier P3: body optional; assembly keys 碰撞+长相+怎么打; old body still green
{
  const plug = game.plugin({
    name: 'p3-nobody-ok', inject: ['enemies', 'colliders'],
    apply(ctx) {
      ctx.colliders.add({ id: 'p3_box', w: 36, h: 88, label: 'P3盒' });
      ctx.enemies.add({
        id: 'p3_nobody', name: '无body试', hp: 44,
        silhouetteId: 'axe', behaviorId: 'axe', colliderId: 'p3_box',
      });
      // missing collider when no body → reject
      ctx.enemies.add({
        id: 'p3_bad_nocol', name: '缺碰撞', hp: 10,
        silhouetteId: 'axe', behaviorId: 'axe',
      } as never);
      // missing silhouette when no body → reject
      ctx.enemies.add({
        id: 'p3_bad_nosil', name: '缺长相', hp: 10,
        behaviorId: 'axe', colliderId: 'p3_box',
      } as never);
      // old body-only still accepted
      ctx.enemies.add({
        id: 'p3_legacy_body', name: '旧body', body: 'spear', hp: 50,
      });
    },
  });
  ok(!!ENEMY_BY_ID['p3_nobody'] && !ENEMY_BY_ID['p3_nobody']!.body, 'P3: no-body EnemyDef accepted');
  ok(!ENEMY_BY_ID['p3_bad_nocol'], 'P3: no-body without collider rejected');
  ok(!ENEMY_BY_ID['p3_bad_nosil'], 'P3: no-body without silhouetteId rejected');
  ok(!!ENEMY_BY_ID['p3_legacy_body']?.body, 'P3: legacy body-only still green');
  const e = makeEnemy('p3_nobody', 10, { eliteChance: 0 });
  ok(e.body.w === 36 && e.body.h === 88, 'P3: no-body makeEnemy applies colliderId');
  ok(e.kind === 'axe' && e.silhouetteId === 'axe', 'P3: no-body resolves kit via silhouette');
  ok(!!e.behaviorSteps?.length, 'P3: no-body attaches behavior steps');
  const leg = makeEnemy('p3_legacy_body', 10, { eliteChance: 0 });
  ok(leg.kind === 'spear', 'P3: legacy body spear still assembles');
  plug.dispose();
  ok(!ENEMY_BY_ID['p3_nobody'] && !getCollider('p3_box'), 'P3 test unloaded');
}

ok(!!getBehavior('spear')?.steps?.length, 'core spear behavior has BehaviorSteps (P1)');
ok(!!getBehavior('axe')?.steps?.some((s) => s.kind === 'meleeAttack'), 'core axe has meleeAttack');
ok(!!getBehavior('shield')?.steps?.some((s) => s.kind === 'charge'), 'core shield has charge');
ok(!!getBehavior('archer')?.steps?.some((s) => s.kind === 'rangedAttack'), 'core archer has rangedAttack');
{
  const ae = makeEnemy('axe', 0, { eliteChance: 0 });
  ok(!!ae.behaviorSteps?.length, 'makeEnemy axe attaches CORE behavior steps');
  ok(ae.kind === 'axe', 'makeEnemy axe kind');
  const sh = makeEnemy('shield', 0, { eliteChance: 0 });
  ok(sh.kind === 'shield' && !!sh.behaviorSteps?.some((s) => s.kind === 'block'), 'shield Enemy + block steps');
}

ok(getSilhouette('spear')?.body === 'spear' && getBehavior('spear')?.body === 'spear', 'spear silhouette/behavior');
ok(getSilhouette('axe')?.baseRig === 'axe' && getSilhouette('spear')?.baseRig === 'spear', 'silhouette baseRig defaults');
ok(!getSilhouette('axe')?.parts?.length, 'core axe silhouette has no parts (legacy look)');
ok(getBackdrop('eclipse')?.theme === 'eclipse', 'backdrop catalog');

// Weapon look building blocks
ok(getWeaponLook('lookSwordPlain')?.parts?.some((p) => p.kind === 'blade'), 'core lookSwordPlain');
ok(getWeaponLook('lookSpearInk')?.baseShape === 'spear', 'core lookSpearInk');
ok(getWeaponLook('lookDaggerNeedle')?.parts?.some((p) => p.kind === 'blade'), 'core lookDaggerNeedle');
ok(getWeaponLook('lookAxeHeavy')?.parts?.some((p) => p.kind === 'head'), 'core lookAxeHeavy');
ok(getWeaponLook('lookTwinCrescent')?.parts?.some((p) => p.kind === 'twinOffset'), 'core lookTwinCrescent');
ok(getWeaponLook('lookGreatInk')?.parts?.some((p) => p.kind === 'runeInlay'), 'core lookGreatInk');
ok(WEAPON_BY_ID['silver']?.lookId === 'lookSwordPlain', 'silver lookId');
ok(WEAPON_BY_ID['spear']?.lookId === 'lookSpearInk', 'spear lookId');
{
  const app = appearanceFromWeapon(WEAPON_BY_ID['silver']!);
  ok(app.lookId === 'lookSwordPlain' && !!app.parts?.length, 'appearanceFromWeapon resolves look');
  ok(app.parts!.every((p) => (WEAPON_LOOK_PART_KINDS as readonly string[]).includes(p.kind)), 'silver parts kinds whitelist');
}
{
  const plug = game.plugin({
    name: 'weapon-look-reject-test', inject: ['weaponLooks'],
    apply(ctx) {
      ctx.weaponLooks.add({ id: 'bad_look', parts: [{ kind: 'notARealKind' as any }] as any });
    },
  });
  ok(!getWeaponLook('bad_look'), 'unknown WeaponVisualPart kind rejected');
  plug.dispose();
}
{
  const plug = game.plugin({
    name: 'weapon-look-ok-test', inject: ['weaponLooks', 'weapons'],
    apply(ctx) {
      ctx.weaponLooks.add({
        id: 'look_test_ok',
        baseShape: 'sword',
        parts: [
          { kind: 'palette', blade: '#abc', trail: '#f00', edge: '#eee' },
          { kind: 'grip', length: 8 },
          { kind: 'guard', style: 'cross' },
          { kind: 'blade', profile: 'leaf', lengthFrac: 1 },
          { kind: 'tip', style: 'fork' },
          { kind: 'chain', style: 'links', links: 4 },
          { kind: 'idleTrail', alpha: 0.2 },
          { kind: 'spriteOverlay', sheetId: 'blade_ink', scale: 1 },
        ],
      });
      ctx.weapons.add({
        id: 'wep_look_inline',
        name: '试刃', lore: '测', tip: '测',
        unlock: { type: 'starter' },
        damage: 1, speed: 1, reach: 1, poise: 1, rage: 1, airHover: 1,
        weight: 'medium', category: 'blade', affinities: [], affinityBonus: 0,
        blade: '#fff', trail: '#f00', edge: '#eee', length: 40, shape: 'sword',
        craft: { materials: { iron: 1 }, fee: 1 },
        parts: [
          { kind: 'haft', length: 10 },
          { kind: 'head', style: 'hammer', size: 12 },
          { kind: 'pommel', size: 3, ring: true },
          { kind: 'ring', at: 'pommel' },
          { kind: 'tsuba', style: 'disk' },
          { kind: 'glow', radius: 8 },
          { kind: 'inkEdge' },
          { kind: 'swingHint', color: '#ff0' },
        ],
      });
    },
  });
  ok(!!getWeaponLook('look_test_ok'), 'composed look parts accepted');
  ok(!!WEAPON_BY_ID['wep_look_inline']?.parts?.length, 'inline weapon parts accepted');
  const app = appearanceFromWeapon(WEAPON_BY_ID['wep_look_inline']!);
  ok(!!app.parts?.some((p) => p.kind === 'head'), 'inline parts resolve');
  plug.dispose();
}


// Affix effect-on-def (Phase A)
ok(AFFIX_BY_ID['duwu']?.dotPeriod === 90 && AFFIX_BY_ID['duwu']?.evolveTo === 'zhanghai' && AFFIX_BY_ID['duwu']?.evolveAfter === 60 * 90, 'duwu dot+evolve on def');
ok(AFFIX_BY_ID['zhanghai']?.dotPeriod === 55 && AFFIX_BY_ID['zhanghai']?.dotDamage === 2, 'zhanghai stronger dot on def');
ok(AFFIX_BY_ID['nifeng']?.playerWideHitMul === 0.78 && AFFIX_BY_ID['nifeng']?.enemyIncomingKbMul === 1.35, 'nifeng combat fields on def');
ok(AFFIX_BY_ID['yinhuo']?.stillDotPeriod === 45 && AFFIX_BY_ID['yinhuo']?.secondaryStillDotPeriod === 70, 'yinhuo still-dot fields');
ok(AFFIX_BY_ID['canyue']?.dashCdMul === 0.72 && AFFIX_BY_ID['huashi']?.dashLenMul === 1.35, 'canyue/huashi movement fields');
ok(AFFIX_BY_ID['anhuenzhong']?.bellCycle === 60 * 18 && AFFIX_BY_ID['anhuenzhong']?.bellWindow === 60 * 4, 'anhuenzhong bell fields');

// Affix pick weights on defs; pickers are catalog-only (no hardcoded seven-id tables)
ok(AFFIX_BY_ID['duwu']?.primaryWeight === 5 && AFFIX_BY_ID['canyue']?.primaryWeight === 12, 'theme/extra primaryWeights');
ok(AFFIX_BY_ID['anhuenzhong']?.primaryWeight === 8 && AFFIX_BY_ID['nifeng']?.secondaryWeight === 1, 'anhuenzhong/nifeng pick weights');
ok(AFFIX_BY_ID['zhanghai']?.evolveOnly === true && !(AFFIX_BY_ID['zhanghai']?.primaryWeight), 'zhanghai evolveOnly not in primary');
ok(primaryAffixPool().every((a) => a.id !== 'zhanghai' && (a.primaryWeight ?? 0) > 0), 'primary pool excludes evolveOnly');
ok(secondaryAffixPool().every((a) => a.id !== 'zhanghai'), 'secondary pool excludes evolveOnly');
{
  const picks = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => pickAffixForAct(i));
  ok(picks.every((id) => !!AFFIX_BY_ID[id] && id !== 'zhanghai'), 'pickAffixForAct returns registered non-evolve ids');
  ok(pickAffixForAct(2) === pickAffixForAct(2), 'pickAffixForAct stable for same act');
  ok(typeof pickSecondaryAffix(picks[3]!, 3) === 'string' || pickSecondaryAffix(picks[3]!, 3) === null, 'pickSecondaryAffix catalog-driven');
}

// Arena.affixBias → pickAffixForAct prefer-subset (债 #5 导演接线)
{
  const unbiased = pickAffixForAct(2);
  ok(pickAffixForAct(2, null) === unbiased && pickAffixForAct(2, []) === unbiased, 'empty/null bias unchanged');
  ok(pickAffixForAct(2, ['nope', 'zhanghai']) === unbiased, 'unknown/evolveOnly bias soft-ignored → full pool');
  const duwuWins = Array.from({ length: 40 }, (_, i) => pickAffixForAct(i, ['duwu'])).filter((id) => id === 'duwu').length;
  ok(duwuWins === 40, `affixBias ['duwu'] wins all acts (${duwuWins}/40)`);
  const canyueWins = Array.from({ length: 40 }, (_, i) => pickAffixForAct(i, ['canyue'])).filter((id) => id === 'canyue').length;
  ok(canyueWins === 40, `affixBias ['canyue'] wins all acts (${canyueWins}/40)`);
  const dual = Array.from({ length: 40 }, (_, i) => pickAffixForAct(i, ['duwu', 'canyue']));
  ok(dual.every((id) => id === 'duwu' || id === 'canyue'), 'multi bias stays inside listed ids');
  ok(dual.some((id) => id === 'duwu') && dual.some((id) => id === 'canyue'), 'multi bias still weighted (both can win)');
  ok(collectStageAffixBias([]) === null, 'collectStageAffixBias empty → null');
  ok(
    JSON.stringify(collectStageAffixBias([{ affixBias: ['duwu'] }, { affixBias: ['nifeng', 'duwu'] }])) ===
      JSON.stringify(['duwu', 'nifeng', 'duwu']),
    'collectStageAffixBias unions arena lists',
  );
  ok(collectStageAffixBias([{}, {}]) === null, 'collectStageAffixBias no bias → null');
  // 接线入口：幕开始读 stage 偏味；进场读本场 affixBias
  const gameSrc = readFileSync(resolve('src/game.ts'), 'utf8');
  const dirSrc = readFileSync(resolve('src/level/director.ts'), 'utf8');
  ok(gameSrc.includes('collectStageAffixBias(this.stage.arenas)'), 'game.applyActAffix reads stage affixBias');
  ok(dirSrc.includes('a.affixBias') && dirSrc.includes('pickAffixForAct(this.stage.actIndex, a.affixBias)'), 'director.enterArena reads arena affixBias');
}

// Enemy catalog (Phase B)
ok(ENEMY_BY_ID['axe']?.body === 'axe' && ENEMY_BY_ID['axe']?.hp === 60, 'axe archetype body/hp');
ok(ENEMY_BY_ID['shield']?.parriedDur === 60 && ENEMY_BY_ID['archer']?.dropChance === 0.3, 'shield/archer archetype fields');
ok(ENEMY_BY_ID['gargoyle']?.body === 'gargoyle' && ENEMY_BY_ID['gargoyle']?.hp === 900, 'gargoyle boss meta on catalog');
ok(ENEMY_BY_ID['spear']?.body === 'spear' && ENEMY_BY_ID['spear']?.hp === 55, 'spear archetype body/hp');

// Boss kits / move weights (no kit switch in framework — catalog data)
ok(BOSS_KIT_BY_ID['stone']?.close.some((w) => w.move === 'claw' && w.weight === 4), 'stone close claw weight');
ok(BOSS_KIT_BY_ID['stone']?.close.some((w) => w.move === 'slam'), 'stone close has slam');
ok(getBossMove('slam')?.kind === 'slam' && getBossMove('inkNova')?.kind === 'inkNova', 'core slam/inkNova moves');
ok(BOSS_KIT_BY_ID['tomb']?.close.find((w) => w.move === 'roar')?.weight === 1.68, 'tomb close roar baked 1.4*1.2');
ok(BOSS_KIT_BY_ID['night']?.close.find((w) => w.move === 'roar')?.weight === 2.1, 'night close roar baked 1.4*1.5');
{
  const ready = bossMoveWeights('stone', true, true);
  const cd = bossMoveWeights('stone', true, false);
  ok(ready.find(([m]) => m === 'roar')![1] === 1.4 && cd.find(([m]) => m === 'roar')![1] === 0, 'bossMoveWeights zeros roar on CD');
  ok(bossMoveWeights('missing-kit', false, true)[0]![0] === 'walk', 'missing boss kit falls back to walk');
}

// Weapon counters on EliteModDef
ok(ELITE_MOD_BY_ID['tongpi']?.weaponCounters?.some((c) => c.category === 'heavy' && c.pierceTongpi), 'tongpi heavy counter on def');
ok(ELITE_MOD_BY_ID['shanbu']?.weaponCounters?.length === 2, 'shanbu blade+spear counters');
ok(weaponCounterElite('heavy', 'tongpi')?.dmgMul === 1.25 && weaponCounterElite('blade', 'shanbu')?.cancelShanbu === true, 'weaponCounterElite reads def');
ok(weaponCounterElite('spear', null)?.label === '克制·控距', 'spear vs non-elite baseline kept in framework');
ok(weaponCounterElite('bare', 'fanshang')?.ignoreReflect === true, 'bare vs fanshang from def');

// Fragments catalog + closed effects
ok(FRAGMENT_BY_ID['lieqi']?.skillDmgMul === 1.18 && FRAGMENT_BY_ID['heican']?.eventOnly === true, 'fragment effects/eventOnly on def');
ok(FRAGMENT_BY_ID['heican']?.atkMul === 1.22 && FRAGMENT_BY_ID['tieyi']?.dmgTakenMul === 0.9, 'heican/tieyi effect fields');
{
  const rolls = Array.from({ length: 40 }, () => rollFragmentId([]));
  ok(rolls.every((id) => id && id !== 'heican' && FRAGMENT_BY_ID[id!]), 'rollFragmentId skips eventOnly heican');
  const rt = emptyFragments();
  ok(tryAddFragment(rt, 'lieqi') === 'added' && fragmentSkillDmgMul(rt) === 1.18, 'tryAddFragment applies skillDmgMul from def');
  ok(tryAddFragment(rt, '__no_such_frag__') === 'dup', 'missing fragment id skipped');
  const curse = emptyFragments();
  ok(tryAddFragment(curse, 'heican') === 'added' && fragmentAtkMul(curse) === 1.22, 'heican event add reads atkMul');
}

// Armor pieces catalog
ok(ARMOR_BY_ID['buyi']?.slot === 'body' && ARMOR_BY_ID['buyi']?.base.hp === 8, 'buyi piece on catalog');
ok(ARMOR_DEFS.length === 21 && ARMOR_DEFS.filter((d) => d.common).length >= 6, '21 armor pieces with commons');
ok(rollArmorDef({ preferCommon: true }).weight > 0, 'rollArmorDef reads live catalog');

// Per-enemy loot table: soft refs — known material drops; missing id skipped (no throw)
{
  const lootPlug = game.plugin({
    name: 'enemy-loot-test', inject: ['enemies'],
    apply(ctx) {
      ctx.enemies.add({
        id: 'loottestdummy', name: '掉落试炼', body: 'axe', hp: 40, dropChance: 0.1,
        loot: [
          { kind: 'material', id: 'iron', chance: 1, amount: 2 },
          { kind: 'material', id: '__missing_mat_xyz__', chance: 1, amount: 9 },
          { kind: 'crystal', chance: 1, amount: 5 },
          { kind: 'pillRecipe', id: 'heal', chance: 1 },
          { kind: 'skill', id: 'qinggong', chance: 1 },
          { kind: 'blueprint', id: '__no_such_weapon__', chance: 1 },
        ],
      });
    },
  });
  const def = ENEMY_BY_ID['loottestdummy'];
  ok(!!def?.loot && def.loot.length === 6, 'plugin enemy loot table registered');
  const prog = new Progression(freshSave());
  // 普通杂兵：材料/血晶/秘籍可掉；图纸/装备/丹方门槛种类恒跳过
  const rolledNormal = prog.rollEnemyDefLoot(def, { elite: false });
  ok(
    rolledNormal.pickups.some((p) => p.kind === 'material')
    && rolledNormal.pickups.some((p) => p.kind === 'crystal')
    && !rolledNormal.banners.some((b) => b.title === '丹方领悟')
    && rolledNormal.banners.some((b) => b.title === '武学秘籍'),
    'loot: normals keep mat/crystal/skill; no pillRecipe',
  );
  ok(prog.hasSkill('qinggong') && !prog.knowsRecipe('heal'), 'loot: normal unlocks skill only, not 丹方');
  // 精英：丹方可出；缺图纸 id 仍跳过
  const rolled = prog.rollEnemyDefLoot(def, { elite: true, boss: true });
  const mats = rolled.pickups.filter((p) => p.kind === 'material');
  const crystals = rolled.pickups.filter((p) => p.kind === 'crystal');
  const bps = rolled.pickups.filter((p) => p.kind === 'blueprint');
  ok(mats.length === 1 && mats[0]!.materialId === 'iron' && mats[0]!.materialN === 2, 'loot: known material drops; missing id skipped');
  ok(crystals.length === 1 && crystals[0]!.amount === 5, 'loot: crystal orb from table');
  ok(bps.length === 0, 'loot: missing blueprint id skipped (no crash)');
  ok(rolled.banners.some((b) => b.title === '丹方领悟'), 'loot: elite pillRecipe unlock banner');
  ok(prog.knowsRecipe('heal') && prog.hasSkill('qinggong'), 'loot: recipe + skill unlocked on meta');
  // 全局 onKill：普通怪不出图纸/装备
  const normalKill = prog.onKill(60, false, false);
  ok(normalKill.blueprint === undefined && normalKill.gear === undefined, 'onKill: normals never drop blueprint/gear');
  // Invalid loot entry shape rejected by Schema
  const badLoot = game.plugin({
    name: 'bad-loot-test', inject: ['enemies'],
    apply(ctx) {
      ctx.enemies.add({
        id: 'badloot', name: '坏表', body: 'axe', hp: 10,
        loot: [{ kind: 'dragonHoard', id: 'x', chance: 1 } as never],
      } as never);
    },
  });
  ok(!ENEMY_BY_ID['badloot'], 'invalid loot kind rejected by EnemySchema');
  badLoot.dispose();
  lootPlug.dispose();
  ok(!ENEMY_BY_ID['loottestdummy'], 'loot test enemy removed on unload');
}

// DLC 商店只读查询（官方长夜 + 可选登记）
{
  const cat = listMenpaiCatalog();
  const core = cat.find((e) => e.id === 'core');
  ok(!!core && core.official && core.enabled && core.name === '长夜', 'catalog: 长夜 official enabled');
  ok(core!.lore.includes('出厂内容'), 'catalog: 长夜 lore marks 出厂内容包');
  ok(CHANGYE_PACK_ID === 'changye' && isOfficialPackLoaded(), 'Oc3: CHANGYE_PACK_ID + pack loaded');
  ok(cat.some((e) => e.id === 'qingcheng' && e.name === '青城' && !e.enabled), 'catalog: 青城 optional available');
  ok(isMenpaiLoaded('core') && listLoadedMenpai().includes('core'), 'isLoaded/listLoaded include core');
  const packs = listPackCatalog();
  ok(packs.some((e) => e.id === 'chixia' && e.name === '赤霞' && !e.enabled), 'pack catalog: 赤霞 available');
  ok(packs.some((e) => e.id === 'hanmang' && e.name === '寒芒' && !e.enabled), 'pack catalog: 寒芒 available');
  ok(packs.some((e) => e.id === 'molin' && e.name === '墨鳞' && !e.enabled), 'pack catalog: 墨鳞 available');
  ok(packs.some((e) => e.id === 'canzhao' && e.name === '残照' && !e.enabled), 'pack catalog: 残照 available');
  ok(packs.some((e) => e.id === 'qiangying' && e.name === '枪影' && !e.enabled), 'pack catalog: 枪影 available');
  ok(packs.some((e) => e.id === 'shixiang' && e.name === '石像夜巡' && !e.enabled), 'pack catalog: 石像夜巡 available');
  ok(packs.some((e) => e.id === 'bingren' && e.name === '残锋' && !e.enabled), 'pack catalog: 残锋 available');
  ok(packs.some((e) => e.id === 'moyu' && e.name === '墨羽' && !e.enabled), 'pack catalog: 墨羽 available');
  ok(packs.some((e) => e.id === 'xinzhong' && e.name === '新钟' && !e.enabled), 'pack catalog: 新钟 available');
  ok(packs.some((e) => e.id === 'canye' && e.name === '残夜' && !e.enabled), 'pack catalog: 残夜 available');
  ok(!isPackLoaded('chixia'), 'chixia not loaded yet');
  const store = listDlcStore();
  ok(store.some((e) => e.kind === 'menpai' && e.id === 'core') && store.some((e) => e.kind === 'pack' && e.id === 'chixia'), 'listDlcStore merges menpai+pack');
  ok(store.filter((e) => e.kind === 'pack').length >= 4, 'listDlcStore includes standalone packs');
  ok(enableDlc('qingcheng', 'menpai') && isMenpaiLoaded('qingcheng'), 'enableDlc qingcheng');
  ok(unloadMenpai('qingcheng') && !isMenpaiLoaded('qingcheng'), 'unload qingcheng after enable');
}

// Optional 门派 load / unload
ok(loadMenpai('chixia'), 'load chixia');
ok(TALISMAN_BY_ID['chixiafu']?.name === '赤霞符' && TALISMANS.length === after.talismans.length + 1, 'chixia talisman registered');
ok(game.talismans.getScript('chixiaBurst')?.steps.length === 2 + 8 * 3 + 1, 'chixia script uses default config');
ok(unloadMenpai('chixia'), 'unload chixia');
ok(!('chixiafu' in TALISMAN_BY_ID) && !game.talismans.getScript('chixiaBurst'), 'chixia entries removed on unload');
ok(JSON.stringify(snapshot()) === JSON.stringify(after), 'catalogs back to 官方包 after unload');

// Standalone content packs (OPTIONAL；非 changye 子插件)
ok(enableDlc('hanmang', 'pack') && isPackLoaded('hanmang'), 'enableDlc hanmang pack');
ok(TALISMAN_BY_ID['hanmangfu']?.name === '寒芒符' && !!game.talismans.getScript('hanmangSlash'), 'hanmang talisman+script');
ok(TALISMAN_BY_ID['hanmangfu']?.icon === 'H-05-tal-1', 'hanmangfu icon H-05-tal-1');
ok(unloadPack('hanmang') && !isPackLoaded('hanmang') && !('hanmangfu' in TALISMAN_BY_ID), 'unload hanmang');

ok(loadPack('molin') && PILL_BY_ID['molindan']?.name === '墨鳞丹' && PILL_BY_ID['molindan']?.sortie === true, 'molin pill pack');
ok(PILL_BY_ID['molindan']?.effect?.defBuffSec === 14, 'molin pill effect fields');
ok(unloadPack('molin') && !('molindan' in PILL_BY_ID), 'unload molin');

ok(loadPack('canzhao') && SKILL_BY_ID['canzhaojue']?.name === '残照诀' && SKILL_BY_ID['canzhaojue']?.kind === 'passive', 'canzhao skill pack');
ok(effectsAtRank('canzhaojue', 5).defBonus === 0.07, 'canzhao effectsAtRank');
ok(unloadPack('canzhao') && !('canzhaojue' in SKILL_BY_ID), 'unload canzhao');

ok(loadPack('qiangying') && ENEMY_BY_ID['qiangying_spear']?.body === 'spear', 'qiangying spear enemy');
ok(ENEMY_BY_ID['qiangying_vanguard']?.hp === 72, 'qiangying vanguard hp');
ok(getChapter(0).arenas[0].waves[0].some((s: { type: string }) => s.type === 'qiangying_spear'), 'qiangying act1 wave mix-in');
// Enemy loadout fields on 枪影先锋
{
  const vg = ENEMY_BY_ID['qiangying_vanguard'];
  ok(!!vg?.skills?.some((s) => s.id === 'tuci'), 'qiangying vanguard skills: tuci');
  ok(!!vg?.gear?.some((g) => g.id === 'pijia'), 'qiangying vanguard gear: pijia');
  ok(!!vg?.gear?.some((g) => g.id === 'qiangying_yingqiang'), 'qiangying vanguard gear: yingqiang');
  ok(vg?.silhouetteId === 'qiangying_vanguard', 'qiangying vanguard silhouetteId');
  ok(!!vg?.pills?.some((p) => p.id === 'heal' && p.when === 'hpBelow'), 'qiangying vanguard pills: heal@hpBelow');
  ok(!!vg?.talismans?.some((t) => t.id === 'qiangying_qiangmang'), 'qiangying vanguard talismans: qiangmang');
  ok(TALISMAN_BY_ID['qiangying_qiangmang']?.name === '枪芒符', 'qiangying qiangmang talisman registered');
  ok(!!game.talismans.getScript('qiangyingQiangmang')?.steps?.length, 'qiangying qiangmang script');
  ok(game.talismans.getScript('qiangyingQiangmang')?.anim === 'sealStampFull', 'qiangying qiangmang script anim');
  const sil = getSilhouette('qiangying_vanguard');
  ok(!!sil?.parts?.some((p) => p.kind === 'mainhand' && (p as { fromWeapon?: boolean }).fromWeapon), 'vanguard sil mainhand fromWeapon');
  const ve = makeEnemy('qiangying_vanguard', 50, { eliteChance: 0 });
  ok(ve.loadout?.heldWeapon?.id === 'qiangying_yingqiang', 'vanguard heldWeapon=yingqiang');
  const look = resolveSilhouetteWeaponLook(sil, ve.loadout?.heldWeapon ?? null);
  ok(look?.shape === 'spear' && look?.lookId === 'lookQiangyingRain', 'vanguard weapon look from gear lookId');
  ok(!!look?.parts?.some((p) => p.kind === 'tassel'), 'vanguard look has tassel part');
  ok(WEAPON_BY_ID['qiangying_yingqiang']?.lookId === 'lookQiangyingRain', 'yingqiang lookId registered');
  ok(!!getWeaponLook('lookQiangyingRain')?.parts?.length, 'lookQiangyingRain in catalog while pack loaded');
  ok(ve.silhouetteId === 'qiangying_vanguard', 'vanguard enemy.silhouetteId set');
  ok(vg?.behaviorId === 'qiangying_mid_spear', 'qiangying vanguard behaviorId');
  const beh = getBehavior('qiangying_mid_spear');
  ok(!!beh?.steps && beh.steps.length >= 4, 'qiangying_mid_spear has steps');
  ok(!!beh?.steps?.some((s) => s.kind === 'keepDistance'), 'steps include keepDistance');
  ok(!!beh?.steps?.some((s) => s.kind === 'meleeAttack'), 'steps include meleeAttack');
  ok(!!beh?.steps?.some((s) => s.kind === 'useLoadout'), 'steps include useLoadout');
  ok(ve.behaviorId === 'qiangying_mid_spear', 'vanguard enemy.behaviorId set');
  ok(!!ve.behaviorSteps && ve.behaviorSteps.length >= 4, 'vanguard enemy.behaviorSteps attached');
}
ok(unloadPack('qiangying') && !ENEMY_BY_ID['qiangying_spear'], 'unload qiangying');
ok(!('qiangying_qiangmang' in TALISMAN_BY_ID), 'unload removes qiangying talisman');

// 石像夜巡 — P3 无 body 组装键内容包
ok(loadPack('shixiang') && !!ENEMY_BY_ID['shixiang_yexun'] && !ENEMY_BY_ID['shixiang_yexun']!.body, 'shixiang boss no body');
ok(ENEMY_BY_ID['shixiang_yexun']?.isBoss === true && ENEMY_BY_ID['shixiang_yexun']?.hp === 900, 'shixiang boss hp/isBoss');
ok(ENEMY_BY_ID['shixiang_yexun']?.silhouetteId === 'shixiang_yexun' && ENEMY_BY_ID['shixiang_yexun']?.behaviorId === 'shixiang_yexun_pace', 'shixiang boss assembly keys');
ok(!!getBehavior('shixiang_yexun_pace')?.steps?.length, 'Gsm5: shixiang_yexun_pace has steps');
ok(getBehavior('shixiang_yexun_pace')!.steps!.some((s) => s.kind === 'keepDistance'), 'Gsm5: pace has keepDistance');
ok(getBehavior('shixiang_yexun_pace')!.steps!.every((s) => BOSS_GAP_LOCO_KINDS.has(s.kind)), 'Gsm5: top-level steps ⊆ BOSS_GAP_LOCO_KINDS');
ok(ENEMY_BY_ID['shixiang_yexun']?.colliderId === 'shixiang_box', 'shixiang boss colliderId');
ok(!!getCollider('shixiang_box') && getCollider('shixiang_box')!.w === 70, 'shixiang_box collider');
ok(ENEMY_BY_ID['shixiang_yong']?.name === '夜巡石俑' && ENEMY_BY_ID['shixiang_yong']?.hp === 72, 'shixiang yong enemy');
ok(!ENEMY_BY_ID['shixiang_yong']!.body && ENEMY_BY_ID['shixiang_yong']?.silhouetteId === 'shixiang_yong', 'shixiang yong no body + sil');
ok(getSilhouette('shixiang_yong')?.body === 'axe', 'shixiang_yong silhouette body=axe');
ok(!!getSilhouette('shixiang_yong')?.parts?.some((p) => p.kind === 'faceMark'), 'shixiang_yong has faceMark');
// BossSil3: Boss hangs custom ash-stone silhouette (palette/scale ± ornaments)
ok(getSilhouette('shixiang_yexun')?.body === 'gargoyle', 'BossSil3: shixiang_yexun sil body=gargoyle');
{
  const silBoss = getSilhouette('shixiang_yexun');
  ok(!!silBoss?.parts && silBoss.parts.length >= 5, 'BossSil3: Boss sil has parts');
  const look = resolveGargoyleSilhouetteLook(silBoss);
  ok(look.skin === '#8a8680', `BossSil3: palette.skin ash (${look.skin})`);
  ok(look.skinB === '#7a7870', `BossSil3: palette.arm → skinB (${look.skinB})`);
  ok(Math.abs(look.scale - 1.12) < 1e-9, `BossSil3: scale 1.12 (${look.scale})`);
  ok(look.faceMark?.style === 'mask', 'BossSil3: faceMark mask');
  ok(!!look.armor && look.armor.length >= 2, 'BossSil3: armorLayer visible');
  ok(!!look.ornaments && look.ornaments.some((o) => o.slot === 'neck'), 'BossSil3: neck ornament');
  ok(look.cloakColor === 'rgba(80,78,70,0.55)', 'BossSil3: cloak.color ash cape');
  // distinguishable from core jade (no parts → identity skin)
  const coreLook = resolveGargoyleSilhouetteLook(getSilhouette('gargoyle'));
  ok(coreLook.skin == null && look.skin !== coreLook.skin, 'BossSil3: ash skin ≠ core jade identity');
}
ok(BOSS_KIT_BY_ID['shixiang_yexun']?.close.some((w) => w.move === 'claw'), 'shixiang bossKit registered');
ok(getBossMove('shixiang_slam_heavy')?.kind === 'slam' && getBossMove('shixiang_slam_heavy')!.radius === 240, 'shixiang_slam_heavy kind/radius');
ok(getBossMove('shixiang_slam_heavy')!.damage === 24 && getBossMove('shixiang_slam_heavy')!.hitstop === 12, 'shixiang_slam_heavy damage/hitstop');
ok(BOSS_KIT_BY_ID['shixiang_yexun']?.close.some((w) => w.move === 'shixiang_slam_heavy' && w.weight === 2.5), 'shixiang kit close hangs slam_heavy');
ok(BOSS_KIT_BY_ID['shixiang_yexun']?.far.some((w) => w.move === 'shixiang_slam_heavy' && w.weight === 2.0), 'shixiang kit far hangs slam_heavy');
// Dfr4: shixiang soft dive/fb/roar rows (content pack 1.3.1); distinguishable from CORE omit
{
  const roar = getBossMove('shixiang_roar_swift');
  ok(!!roar && roar.kind === 'roar' && roar.windFrames === 8 && roar.radius === 160 && roar.frames === 20,
    'Dfr4: shixiang_roar_swift soft fields');
  ok(windFramesFromMove(roar!, 40) === 8 && windFramesFromMove(getBossMove('roar'), 40) === 40,
    'Dfr4: roar soft wind < CORE omit 40');
  const fb = getBossMove('shixiang_fireball_swift');
  ok(!!fb && fb.kind === 'fireball' && fb.frames === 10 && fb.count === 1 && fb.windFrames === 6 && fb.projectileId === 'fireball',
    'Dfr4: shixiang_fireball_swift soft fields');
  ok(fbRiseFromMove(fb!) === 10 && fbRiseFromMove(getBossMove('fireball')) === 34,
    'Dfr4: fireball soft rise < CORE omit 34');
  const dive = getBossMove('shixiang_dive_swift');
  ok(!!dive && dive.kind === 'dive' && dive.windFrames === 12 && dive.radius === 80 && dive.frames === 18,
    'Dfr4: shixiang_dive_swift soft fields');
  ok(diveAimWindFromMove(dive!) === 12 && diveAimWindFromMove(getBossMove('dive')) === 68,
    'Dfr4: dive soft aim < CORE omit 68');
  ok(BOSS_KIT_BY_ID['shixiang_yexun']?.close.some((w) => w.move === 'shixiang_roar_swift'),
    'Dfr4: kit close hangs shixiang_roar_swift');
  ok(BOSS_KIT_BY_ID['shixiang_yexun']?.far.some((w) => w.move === 'shixiang_dive_swift'),
    'Dfr4: kit far hangs shixiang_dive_swift');
  ok(BOSS_KIT_BY_ID['shixiang_yexun']?.far.some((w) => w.move === 'shixiang_fireball_swift'),
    'Dfr4: kit far hangs shixiang_fireball_swift');
  ok(BOSS_KIT_BY_ID['shixiang_yexun']?.far.some((w) => w.move === 'shixiang_roar_swift'),
    'Dfr4: kit far hangs shixiang_roar_swift');
  ok(!BOSS_KIT_BY_ID['shixiang_yexun']?.close.some((w) => w.move === 'roar'),
    'Dfr4: kit close no longer core roar stub');
  ok(!BOSS_KIT_BY_ID['shixiang_yexun']?.far.some((w) => w.move === 'dive' || w.move === 'fireball' || w.move === 'roar'),
    'Dfr4: kit far no longer core dive/fireball/roar stubs');
  // CORE three rows still omit soft (topology shell path)
  ok(getBossMove('roar')?.windFrames == null && getBossMove('fireball')?.frames == null && getBossMove('dive')?.windFrames == null,
    'Dfr4: CORE roar/fireball/dive still omit soft');
}
ok(ENEMY_BY_ID['shixiang_yexun']?.kitId === 'shixiang_yexun', 'shixiang EnemyDef.kitId');
ok(getChapter(0).boss.bossId === 'shixiang_yexun', 'shixiang act1 bossId');
ok(getChapter(0).boss.kit === 'shixiang_yexun', 'shixiang act1 stage.boss.kit');
ok(actPool(0).kit === 'stone', 'G3: CORE actPool kit unchanged (stone)');
ok(getChapter(0).arenas[0].waves[0].some((s: { type: string }) => s.type === 'shixiang_yong'), 'shixiang act1 wave mix-in');
{
  // G3 resolve chain (mirrors director.enterBoss)
  const ch = getChapter(0);
  const def = ENEMY_BY_ID['shixiang_yexun'];
  const kit = resolveBossKit({
    stageKit: ch.boss.kit,
    defKitId: def?.kitId,
    poolKit: actPool(0).kit,
  });
  ok(kit === 'shixiang_yexun', 'G3 enterBoss resolve → shixiang_yexun (not stone)');
  ok(resolveBossKit({ stageKit: 'night', defKitId: 'shixiang_yexun', poolKit: 'stone' }) === 'night', 'G3 priority: stage > def > pool');
  ok(resolveBossKit({ defKitId: 'shixiang_yexun', poolKit: 'stone' }) === 'shixiang_yexun', 'G3 priority: def > pool');
  ok(resolveBossKit({ poolKit: 'rain' }) === 'rain', 'G3 priority: pool when no stage/def');
  ok(resolveBossKit({}) === 'stone', 'G3 priority: default stone');
  const boss = makeBoss('shixiang_yexun', 100, { hpScale: 1 });
  ok(!!boss && boss.body.w === 70 && boss.body.h === 130, 'makeBoss shixiang applies collider 70×130');
  ok(boss.name === '石像夜巡', 'makeBoss shixiang name');
  ok(boss.silhouetteId === 'shixiang_yexun', 'BossSil3: makeBoss silhouetteId=shixiang_yexun');
  ok(boss.behaviorId === 'shixiang_yexun_pace', 'Gsm5: makeBoss behaviorId=shixiang_yexun_pace');
  ok(!!boss.behaviorSteps?.length && boss.behaviorSteps!.some((s) => s.kind === 'facePlayer'), 'Gsm5: makeBoss attaches non-empty loco steps');
  {
    const via = resolveGargoyleSilhouetteLook(getSilhouette(boss.silhouetteId!));
    ok(via.skin === '#8a8680' && Math.abs(via.scale - 1.12) < 1e-9 && via.faceMark?.style === 'mask', 'BossSil3: makeBoss → ash look');
  }
  // BossLoad3: gear 夜巡石甲 hp=40 → maxHp 940；def=8 → dmgTakenMul<1
  ok(!!getArmorPiece('shixiang_yejia') && getArmorPiece('shixiang_yejia')!.base.hp === 40, 'BossLoad3: shixiang_yejia on catalog');
  ok(!!ENEMY_BY_ID['shixiang_yexun']?.gear?.some((g) => g.id === 'shixiang_yejia'), 'BossLoad3: EnemyDef gear yejia');
  ok(!!ENEMY_BY_ID['shixiang_yexun']?.skills?.some((s) => s.id === 'tuci'), 'BossLoad3: EnemyDef skill tuci');
  ok(boss.maxHp === 940, `BossLoad3: makeBoss HP with yejia (maxHp=${boss.maxHp})`);
  ok(!!boss.loadout && boss.loadout.gear.some((g) => g.id === 'shixiang_yejia'), 'BossLoad3: loadout gear attached');
  ok(boss.loadout!.skills.some((s) => s.id === 'tuci'), 'BossLoad3: loadout skill tuci registered');
  ok(boss.loadout!.dmgTakenMul < 1, `BossLoad3: dmgTakenMul<1 from yejia def (${boss.loadout!.dmgTakenMul})`);
  ok(loadoutIncomingMul(boss) < 1, 'BossLoad3: loadoutIncomingMul < 1');
  ok(boss.kit === 'shixiang_yexun', 'G3 makeBoss kit from EnemyDef.kitId');
  // BossLoad3: idle gap cast (kit weights untouched)
  {
    const gCast = {
      player: { dead: false, x: 220 },
      texts: { add() {} },
      talismanScripts: { playSteps() {}, start() {} },
      animScripts: { playCastAnim() {} },
      audio: {},
      fx: { flare() {}, spawn() {}, dust() {}, ring() {} },
      hitstop: 0,
      cam: { shake() {} },
      flashScreen() {},
      enemies: [],
      attackToken() { throw new Error('BossLoad3 must not call attackToken'); },
    } as never;
    boss.setState('idle');
    boss.cooldown = 40;
    boss.loadout!.castGate = 0;
    boss.loadout!.skillCd = {};
    const castOk = tryCastBossLoadout(gCast, boss);
    ok(castOk === true, 'BossLoad3: idle gap tryCast tuci succeeds');
    ok((boss.loadout!.skillCd['tuci'] ?? 0) > 0, 'BossLoad3: skillCd written after cast');
    ok(boss.kit === 'shixiang_yexun', 'BossLoad3: kit unchanged after gap cast');
  }
  const weights = bossMoveWeights(boss.kit, true, true);
  ok(weights.some(([m, w]) => m === 'shixiang_slam_heavy' && w === 2.5), 'G3 in-fight weights use shixiang_slam_heavy');
  ok(getBossMove('shixiang_slam_heavy')!.radius === 240, 'G3 chooseMove-path getBossMove radius ready');
  const yong = makeEnemy('shixiang_yong', 50, { eliteChance: 0 });
  ok(yong.kind === 'axe' && yong.silhouetteId === 'shixiang_yong', 'makeEnemy yong resolves via sil');
  ok(!!yong.behaviorSteps?.length, 'makeEnemy yong attaches axe behavior');
}
ok(unloadPack('shixiang') && !ENEMY_BY_ID['shixiang_yexun'] && !ENEMY_BY_ID['shixiang_yong'] && !getBehavior('shixiang_yexun_pace'), 'unload shixiang');
ok(!getCollider('shixiang_box') && !getSilhouette('shixiang_yong') && !getSilhouette('shixiang_yexun') && !BOSS_KIT_BY_ID['shixiang_yexun'] && !getBossMove('shixiang_slam_heavy'), 'unload removes shixiang sil/col/kit/move');
ok(!getBossMove('shixiang_roar_swift') && !getBossMove('shixiang_fireball_swift') && !getBossMove('shixiang_dive_swift'),
  'Dfr4: unload removes shixiang soft dive/fb/roar moves');
ok(getBossMove('roar')?.windFrames == null && getBossMove('fireball')?.frames == null && getBossMove('dive')?.windFrames == null,
  'Dfr4: after unload CORE omit path still today');
ok(!getArmorPiece('shixiang_yejia'), 'BossLoad3: unload removes shixiang_yejia');
ok(getChapter(0).boss.bossId === 'gargoyle', 'act1 boss restored after shixiang unload');

// G3: 馆种子 content.json 对齐 EnemyDef.kitId（远程无 stages 时靠 def 挂接）+ 自建 bossMoves
{
  const seed = JSON.parse(readFileSync(resolve('dlc-server/packages/shixiang/content.json'), 'utf8')) as {
    enemies?: Array<{ id?: string; kitId?: string; silhouetteId?: string; colliderId?: string; gear?: Array<{ id: string }>; skills?: Array<{ id: string }> }>;
    bossMoves?: Array<{ id?: string; kind?: string; radius?: number }>;
    bossKits?: Array<{ id?: string; close?: Array<{ move: string; weight: number }>; far?: Array<{ move: string; weight: number }> }>;
    armorPieces?: Array<{ id?: string; base?: { hp?: number; def?: number } }>;
    silhouettes?: Array<{ id?: string; body?: string; parts?: Array<{ kind: string; skin?: string; value?: number; style?: string; slot?: string; color?: string }> }>;
    colliders?: Array<{ id?: string; w?: number; h?: number }>;
  };
  const boss = seed.enemies?.find((e) => e.id === 'shixiang_yexun');
  ok(boss?.kitId === 'shixiang_yexun', 'G3 shixiang seed EnemyDef.kitId');
  const mv = seed.bossMoves?.find((m) => m.id === 'shixiang_slam_heavy');
  ok(!!mv && mv.kind === 'slam' && mv.radius === 240, 'shixiang seed bossMoves shixiang_slam_heavy');
  const kit = seed.bossKits?.find((k) => k.id === 'shixiang_yexun');
  ok(!!kit?.close?.some((w) => w.move === 'shixiang_slam_heavy'), 'shixiang seed kit close hangs slam_heavy');
  ok(!!kit?.far?.some((w) => w.move === 'shixiang_slam_heavy'), 'shixiang seed kit far hangs slam_heavy');
  // Dfr4 seed soft rows
  const roarSeed = seed.bossMoves?.find((m) => m.id === 'shixiang_roar_swift') as
    { id?: string; kind?: string; windFrames?: number; radius?: number; frames?: number } | undefined;
  ok(!!roarSeed && roarSeed.kind === 'roar' && roarSeed.windFrames === 8 && roarSeed.radius === 160 && roarSeed.frames === 20,
    'Dfr4 seed shixiang_roar_swift');
  const fbSeed = seed.bossMoves?.find((m) => m.id === 'shixiang_fireball_swift') as
    { id?: string; kind?: string; frames?: number; count?: number; windFrames?: number; projectileId?: string } | undefined;
  ok(!!fbSeed && fbSeed.kind === 'fireball' && fbSeed.frames === 10 && fbSeed.count === 1 && fbSeed.windFrames === 6 && fbSeed.projectileId === 'fireball',
    'Dfr4 seed shixiang_fireball_swift');
  const diveSeed = seed.bossMoves?.find((m) => m.id === 'shixiang_dive_swift') as
    { id?: string; kind?: string; windFrames?: number; radius?: number; frames?: number } | undefined;
  ok(!!diveSeed && diveSeed.kind === 'dive' && diveSeed.windFrames === 12 && diveSeed.radius === 80 && diveSeed.frames === 18,
    'Dfr4 seed shixiang_dive_swift');
  ok(!!kit?.close?.some((w) => w.move === 'shixiang_roar_swift'), 'Dfr4 seed kit close hangs roar_swift');
  ok(!!kit?.far?.some((w) => w.move === 'shixiang_dive_swift'), 'Dfr4 seed kit far hangs dive_swift');
  ok(!!kit?.far?.some((w) => w.move === 'shixiang_fireball_swift'), 'Dfr4 seed kit far hangs fireball_swift');
  ok(!!kit?.far?.some((w) => w.move === 'shixiang_roar_swift'), 'Dfr4 seed kit far hangs roar_swift');
  ok(!kit?.close?.some((w) => w.move === 'roar') && !kit?.far?.some((w) => w.move === 'dive' || w.move === 'fireball' || w.move === 'roar'),
    'Dfr4 seed kit no longer points dive/fb/roar at CORE stubs');
  // BossLoad3 seed alignment
  const yejia = seed.armorPieces?.find((a) => a.id === 'shixiang_yejia');
  ok(!!yejia && yejia.base?.hp === 40 && yejia.base?.def === 8, 'BossLoad3 seed armorPieces shixiang_yejia');
  ok(!!boss?.gear?.some((g) => g.id === 'shixiang_yejia'), 'BossLoad3 seed EnemyDef gear yejia');
  ok(!!boss?.skills?.some((s) => s.id === 'tuci'), 'BossLoad3 seed EnemyDef skill tuci');
  // BossSil3 seed alignment
  ok(boss?.silhouetteId === 'shixiang_yexun', 'BossSil3 seed EnemyDef silhouetteId');
  ok(boss?.colliderId === 'shixiang_box', 'BossSil3 seed EnemyDef colliderId');
  const silSeed = seed.silhouettes?.find((s) => s.id === 'shixiang_yexun');
  ok(!!silSeed && silSeed.body === 'gargoyle', 'BossSil3 seed silhouette body=gargoyle');
  ok(!!silSeed?.parts?.some((p) => p.kind === 'palette' && p.skin === '#8a8680'), 'BossSil3 seed palette.skin');
  ok(!!silSeed?.parts?.some((p) => p.kind === 'scale' && p.value === 1.12), 'BossSil3 seed scale');
  ok(!!silSeed?.parts?.some((p) => p.kind === 'faceMark' && p.style === 'mask'), 'BossSil3 seed faceMark');
  ok(!!silSeed?.parts?.some((p) => p.kind === 'ornament' && p.slot === 'neck'), 'BossSil3 seed ornament');
  ok(!!seed.colliders?.some((c) => c.id === 'shixiang_box' && c.w === 70), 'BossSil3 seed collider shixiang_box');
}

// W4/C 残锋 — look + weapon(lookId/feel/combatStyleId) + skill(attackKey→既有 daomang) + Style
ok(loadPack('bingren') && WEAPON_BY_ID['bingren_canfeng']?.name === '残锋', 'bingren weapon pack');
ok(WEAPON_BY_ID['bingren_canfeng']?.lookId === 'lookBingrenCanfeng', 'bingren weapon lookId');
ok(WEAPON_BY_ID['bingren_canfeng']?.feel?.boxTune?.tipXPush === 6, 'bingren feel.boxTune');
ok(WEAPON_BY_ID['bingren_canfeng']?.combatStyleId === 'bingren_canfeng_chain', 'bingren combatStyleId');
ok(!!getCombatStyle('bingren_canfeng_chain'), 'bingren style in catalog');
ok(getCombatStyle('bingren_canfeng_chain')!.groundKeys.join(',') === 'slash1,slash2,slash3,daomang', 'bingren style groundKeys');
ok(resolveCombatStyle(WEAPON_BY_ID['bingren_canfeng']!).id === 'bingren_canfeng_chain', 'bingren resolveCombatStyle');
ok(!!getWeaponLook('lookBingrenCanfeng')?.parts?.length, 'lookBingrenCanfeng in catalog');
ok(getWeaponLook('lookBingrenCanfeng')?.baseShape === 'sword', 'lookBingrenCanfeng baseShape');
ok(!!getWeaponLook('lookBingrenCanfeng')?.parts?.some((p) => p.kind === 'blade'), 'look has blade part');
ok(SKILL_BY_ID['bingren_canmang']?.name === '残锋诀' && SKILL_BY_ID['bingren_canmang']?.castKind === 'attack', 'bingren skill');
ok(SKILL_BY_ID['bingren_canmang']?.attackKey === 'daomang', 'bingren attackKey→daomang');
ok(SKILL_BY_ID['bingren_canmang']?.weaponGate === 'blade', 'bingren weaponGate blade');
ok(!!getAttackBox('daomang'), 'daomang box exists for bingren skill');
// F3: 本包自制 animRecipe + castAnim 引用
ok(!!getAnimRecipe('bingren_canmang_anim')?.steps?.length, 'bingren animRecipe registered');
ok(!!getAnimRecipe('bingren_canmang_anim')?.steps?.some((s) => s.kind === 'crescentSlash'), 'bingren anim has crescentSlash');
ok(SKILL_BY_ID['bingren_canmang']?.castAnim === 'bingren_canmang_anim', 'bingren castAnim→本包配方');
ok(!!getAnimRecipe(SKILL_BY_ID['bingren_canmang']!.castAnim as string)?.steps?.length, 'bingren castAnim resolves');
ok(Array.isArray(SKILL_BY_ID['bingren_canmang']?.castFx) && (SKILL_BY_ID['bingren_canmang']!.castFx!.length > 0), 'bingren castFx present');
// X4: 自制 fxRecipe + pose；anim/castFx 软引用
ok(getFxRecipe('bingren_cold_flare')?.emitter === 'flare', 'bingren fxRecipe registered');
ok(getFxRecipe('bingren_cold_flare')?.color === '#7090c0', 'bingren fxRecipe color');
ok(!!getPose('bingren_canmang_pose')?.strike, 'bingren pose registered');
{
  const anim = getAnimRecipe('bingren_canmang_anim');
  const poseStep = anim?.steps?.find((s: any) => s.kind === 'playPose') as any;
  const inkStep = anim?.steps?.find((s: any) => s.kind === 'inkBurst') as any;
  ok(!!poseStep && poseStep.poseId === 'bingren_canmang_pose' && !!getPose(poseStep.poseId)?.strike, 'bingren anim playPose→本包 pose');
  ok(poseStep.timeline === 'full' && poseStep.frames === 12, 'Pose3: bingren playPose timeline:full frames:12');
  ok(!!inkStep && inkStep.recipeId === 'bingren_cold_flare' && !!getFxRecipe(inkStep.recipeId), 'bingren anim inkBurst→本包 fxRecipe');
  const fxStep = (SKILL_BY_ID['bingren_canmang']!.castFx as any[])?.find((s) => s.kind === 'fx' && s.recipeId);
  ok(!!fxStep && fxStep.recipeId === 'bingren_cold_flare' && !!getFxRecipe(fxStep.recipeId), 'bingren castFx recipeId→本包 fxRecipe');
}
// Loco4: 残锋覆盖玩家 hp.idle（三帧同填 lean=0.38）
ok(!!getPose('hp.idle')?.strike && getPose('hp.idle')!.strike.lean === 0.38, 'Loco4: bingren covers hp.idle');
ok(locoPose('hp.idle', HP.idle).lean === 0.38 && locoPose('hp.idle', HP.idle).lean !== HP.idle.lean,
  'Loco4: locoPose(hp.idle) eats bingren strike');
ok(appearanceFromWeapon(WEAPON_BY_ID['bingren_canfeng']!)?.lookId === 'lookBingrenCanfeng'
  || !!appearanceFromWeapon(WEAPON_BY_ID['bingren_canfeng']!)?.parts?.length, 'bingren appearance resolves');
ok(unloadPack('bingren') && !('bingren_canfeng' in WEAPON_BY_ID), 'unload bingren weapon');
ok(!('bingren_canmang' in SKILL_BY_ID) && !getWeaponLook('lookBingrenCanfeng'), 'unload removes bingren skill+look');
ok(!getCombatStyle('bingren_canfeng_chain'), 'unload removes bingren style');
ok(!getAnimRecipe('bingren_canmang_anim'), 'unload removes bingren animRecipe');
ok(!getFxRecipe('bingren_cold_flare') && !getPose('bingren_canmang_pose'), 'unload removes bingren fxRecipe+pose');
ok(!getPose('hp.idle') && locoPose('hp.idle', HP.idle) === HP.idle, 'Loco4: unload cleans hp.idle');

// R3: 墨羽示范包 — projectiles + volleys + sfx/backdrop；符/Behavior 软引用
ok(loadPack('moyu'), 'load moyu pack');
ok(getProjectile('moyu_ink_arrow')?.drawKind === 'arrow', 'moyu projectile registered');
ok(getProjectile('moyu_ink_arrow')!.hitW === 32 && getProjectile('moyu_ink_arrow')!.hitH === 10, 'moyu ink_arrow hit box');
ok(getProjectile('moyu_ink_arrow')?.attackKey === 'moyu_ink_shot', 'ArrowProj2: moyu arrow attackKey→moyu_ink_shot');
ok(!!getAttackBox('moyu_ink_shot') && getAttackBox('moyu_ink_shot')!.damage === 16 && getAttackBox('moyu_ink_shot')!.kbX === 6,
  'ArrowProj2: moyu_ink_shot 可辨于核心箭 (16/6 ≠ 10/3)');
ok(getAttackBox('moyu_ink_shot')!.damage !== getAttackBox('arrow')!.damage
  || getAttackBox('moyu_ink_shot')!.kbX !== getAttackBox('arrow')!.kbX,
  'ArrowProj2: moyu 伤数值 ≠ 核心 arrow');
ok(getVolley('moyu_slow_thunder')?.style === 'thunder', 'moyu volley registered');
ok(getVolley('moyu_slow_thunder')!.defaultInterval === 18, 'moyu slow_thunder interval');
ok(getSfxDef('moyu_ink_slash')?.synth === 'slash', 'moyu sfx synth alias');
ok(getSfxDef('moyu_file_tap')?.src === './art/audio/r4a_smoke.wav' && getSfxDef('moyu_file_tap')?.format === 'wav',
  'R4b: moyu file sfx alias (path only)');
ok(getSfxDef('moyu_file_click')?.src === './art/audio/r4c_tap.ogg' && getSfxDef('moyu_file_click')?.format === 'ogg',
  'R4c: moyu file click alias → r4c_tap.ogg');
ok(getBackdrop('moyu_eclipse_tint')?.theme === 'eclipse' && getBackdrop('moyu_eclipse_tint')?.skyTint === '#1a1028', 'moyu backdrop theme+tint');
ok(TALISMAN_BY_ID['moyufu']?.name === '墨羽符' && !!game.talismans.getScript('moyuSlowThunder'), 'moyu talisman+script');
{
  const script = getTalismanScript('moyuSlowThunder');
  const volleyStep = script?.steps?.find((s: any) => s.kind === 'spawnVolley') as any;
  ok(!!volleyStep && volleyStep.volleyId === 'moyu_slow_thunder' && !!getVolley(volleyStep.volleyId), 'moyu script spawnVolley→本包 volley');
  const sfxStep = script?.steps?.find((s: any) => s.kind === 'sfx') as any;
  ok(!!sfxStep && sfxStep.id === 'moyu_ink_slash' && !!getSfxDef(sfxStep.id), 'moyu script sfx→本包 sfx');
}
ok(!!getBehavior('moyu_ink_archer')?.steps?.some((s: any) => s.kind === 'rangedAttack' && s.projectileId === 'moyu_ink_arrow'), 'moyu behavior projectileId');
{
  const bh = getBehavior('moyu_ink_archer');
  const ra = bh?.steps?.find((s: any) => s.kind === 'rangedAttack') as any;
  ok(!!ra && !!getProjectile(ra.projectileId), 'moyu behavior projectileId resolves');
}
ok(ENEMY_BY_ID['moyu_archer']?.behaviorId === 'moyu_ink_archer', 'moyu archer enemy hangs behavior');
ok(unloadPack('moyu') && !isPackLoaded('moyu'), 'unload moyu');
ok(!getProjectile('moyu_ink_arrow') && !getVolley('moyu_slow_thunder'), 'unload removes moyu projectile+volley');
ok(!getAttackBox('moyu_ink_shot'), 'unload removes moyu_ink_shot attack box');
ok(!getSfxDef('moyu_ink_slash') && !getSfxDef('moyu_file_tap') && !getBackdrop('moyu_eclipse_tint'), 'unload removes moyu sfx+backdrop');
ok(!('moyufu' in TALISMAN_BY_ID) && !game.talismans.getScript('moyuSlowThunder'), 'unload removes moyu talisman+script');
ok(!getBehavior('moyu_ink_archer') && !ENEMY_BY_ID['moyu_archer'], 'unload removes moyu behavior+enemy');

// Act3: 新钟幕池示范包 — 只改 acts.pool / beat（零 stages 几何）
{
  const loreBefore = actPool(0).loreLine;
  const shanbuBefore = (actPool(0).eliteWeights as Record<string, number>).shanbu ?? 0;
  const beatBefore = getBetweenActBeat(0)?.title;
  const stage0Id = getChapter(0).id;
  const stage0Len = getChapter(0).length;
  ok(loadPack('xinzhong') && isPackLoaded('xinzhong'), 'Act3 load xinzhong pack');
  ok(actPool(0).loreLine === '新钟初鸣，山门石兽侧耳。闪步客影偏多。', 'Act3 Cordis: actPool(0).loreLine');
  ok(
    (actPool(0).eliteWeights as Record<string, number>).shanbu === 8
      && (actPool(0).eliteWeights as Record<string, number>).shanbu !== shanbuBefore,
    'Act3 Cordis: actPool(0).eliteWeights.shanbu === 8',
  );
  ok(actPool(0).kit === 'stone' && actPool(0).tint === 'jade', 'Act3 Cordis: kit/tint still stone/jade');
  ok(actPool(1).loreLine === CORE_ACT_POOLS[1]!.loreLine, 'Act3 Cordis: actPool(1) still 官方包');
  const beatXz = getBetweenActBeat(0);
  ok(
    !!beatXz && beatXz.id === 'betweenActs.xinzhong.1to2' && beatXz.title === '钟声未歇…',
    'Act3 Cordis: getBetweenActBeat(0) xinzhong betweenActs',
  );
  ok(
    getChapter(0).id === stage0Id && getChapter(0).length === stage0Len,
    'Act3 Cordis: stages geometry unchanged',
  );
  ok(unloadPack('xinzhong') && !isPackLoaded('xinzhong'), 'Act3 unload xinzhong');
  ok(
    actPool(0).loreLine === loreBefore
      && (actPool(0).eliteWeights as Record<string, number>).shanbu === shanbuBefore
      && getBetweenActBeat(0)?.title === beatBefore,
    'Act3 Cordis unload restores 官方包 pool/beat',
  );
}

// D5: 残夜玩法副目录示范包 — eliteMods + fragments + armorSets（可辨于核心）
{
  ok(loadPack('canye') && isPackLoaded('canye'), 'D5 load canye pack');
  const em = getEliteMod('canye_tongpi');
  ok(!!em && em.dmgTakenMul === 0.78 && em.tag === '薄铜' && em.name === '残夜薄铜',
    'D5 Cordis: getEliteMod(canye_tongpi).dmgTakenMul===0.78');
  ok(em!.dmgTakenMul !== ELITE_MOD_BY_ID['tongpi']!.dmgTakenMul,
    'D5 Cordis: canye_tongpi 可辨于核心 tongpi');
  const fr = getFragment('canye_lieqi');
  ok(!!fr && fr.skillDmgMul === 1.12 && fr.tag === 'qi' && fr.name === '残夜裂气',
    'D5 Cordis: getFragment(canye_lieqi).skillDmgMul===1.12');
  ok(fr!.skillDmgMul !== FRAGMENT_BY_ID['lieqi']!.skillDmgMul,
    'D5 Cordis: canye_lieqi 可辨于核心 lieqi');
  const as = getArmorSet('canye_yexing');
  ok(!!as && as.two?.dashCdMul === 0.90 && as.full?.dashCdMul === 0.82
      && as.full?.dashIframes === 4 && as.full?.rage === 0.06 && as.weight === 10,
    'D5 Cordis: getArmorSet(canye_yexing) two.dashCdMul===0.90');
  ok(
    as!.two!.dashCdMul !== ARMOR_SET_BY_ID['yexing']!.two!.dashCdMul
      || as!.full!.dashCdMul !== ARMOR_SET_BY_ID['yexing']!.full!.dashCdMul,
    'D5 Cordis: canye_yexing 可辨于核心 yexing',
  );
  ok(unloadPack('canye') && !isPackLoaded('canye'), 'D5 unload canye');
  ok(!getEliteMod('canye_tongpi') && !getFragment('canye_lieqi') && !getArmorSet('canye_yexing'),
    'D5 Cordis unload clears canye elite/fragment/armorSet');
}

// ArrowProj1: ProjectileDef soft attackKey + 斩落认 drawKind
{
  const coreArrow = getProjectile('arrow');
  ok(!!coreArrow && coreArrow.drawKind === 'arrow' && !coreArrow.attackKey, 'ArrowProj1: core arrow 无 attackKey（缺省）');
  const coreAtkKey = coreArrow?.attackKey ?? 'arrow';
  const coreAtk = getAttackBox(coreAtkKey);
  ok(coreAtkKey === 'arrow' && !!coreAtk && coreAtk.damage === 10 && coreAtk.kbX === 3,
    'ArrowProj1: 缺省 attackKey→arrow 手感 bit-identical');
  ok(!!getAttackBox('arrow') && !!getProjectile('arrow'), 'ArrowProj1: 双目录保留 AttackBox+ProjectileDef arrow');

  const plug = game.plugin({
    name: 'arrowproj1-test', inject: ['attacks', 'projectiles'],
    apply(ctx) {
      ctx.attacks.add({
        id: 'ap1_heavy_shot', name: 'ap1_heavy_shot',
        startup: 0, active: 1, recovery: 0, box: { x: 0, y: 0, w: 0, h: 0 },
        damage: 22, kbX: 8, kbY: 0, hitstun: 24, hitstop: 6, shake: 5, parryable: true,
      });
      ctx.projectiles.add({
        id: 'ap1_custom_arrow', drawKind: 'arrow', hitW: 28, hitH: 10, life: 200,
        attackKey: 'ap1_heavy_shot',
      });
      ctx.projectiles.add({
        id: 'ap1_plain_arrow', drawKind: 'arrow', hitW: 24, hitH: 8, life: 240,
      });
    },
  });
  const custom = getProjectile('ap1_custom_arrow');
  ok(custom?.attackKey === 'ap1_heavy_shot' && custom?.drawKind === 'arrow', 'ArrowProj1: 自建箭挂 attackKey+drawKind');
  const resolved = getAttackBox(custom?.attackKey ?? 'arrow');
  ok(!!resolved && resolved.damage === 22 && resolved.kbX === 8, 'ArrowProj1: attackKey 解析可辨伤害/击退');
  const plain = getProjectile('ap1_plain_arrow');
  ok(!!plain && !plain.attackKey, 'ArrowProj1: 未挂 attackKey 字段缺省');
  ok(getAttackBox(plain?.attackKey ?? 'arrow')?.damage === 10, 'ArrowProj1: 未挂回退核心 arrow dmg');

  // 斩落谓词对齐 resolver：目录 drawKind==='arrow'；无目录仅 kind==='arrow'
  const slashable = (kind: string) => {
    const d = getProjectile(kind);
    return d ? d.drawKind === 'arrow' : kind === 'arrow';
  };
  ok(slashable('ap1_custom_arrow') && slashable('arrow'), 'ArrowProj1: drawKind:arrow 自建/核心可斩');
  ok(!slashable('fireball'), 'ArrowProj1: fireball drawKind 不斩');
  ok(!slashable('unknown_proj_ap1_xyz'), 'ArrowProj1: 无目录非 arrow id 不斩');

  // remote applyContent 灌包路径：带 attackKey 的 projectile 可注入
  const remoteBody: DlcContentBody = {
    attacks: [{
      id: 'ap1_remote_shot', name: 'ap1_remote_shot',
      startup: 0, active: 1, recovery: 0, box: { x: 0, y: 0, w: 0, h: 0 },
      damage: 17, kbX: 5, kbY: 0, hitstun: 18, hitstop: 5, shake: 3, parryable: true,
    }],
    projectiles: [{
      id: 'ap1_remote_arrow', drawKind: 'arrow', hitW: 26, hitH: 9, life: 180,
      attackKey: 'ap1_remote_shot',
    }],
  };
  const remoteFork = game.plugin({
    name: 'arrowproj1-remote',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, remoteBody); },
  });
  ok(getProjectile('ap1_remote_arrow')?.attackKey === 'ap1_remote_shot', 'ArrowProj1: remote 灌包保留 attackKey');
  ok(getAttackBox(getProjectile('ap1_remote_arrow')!.attackKey ?? 'arrow')?.damage === 17, 'ArrowProj1: remote attackKey 可解析');
  remoteFork.dispose();
  ok(!getProjectile('ap1_remote_arrow') && !getAttackBox('ap1_remote_shot'), 'ArrowProj1: remote fork unload clean');

  plug.dispose();
  ok(!getProjectile('ap1_custom_arrow') && !getProjectile('ap1_plain_arrow') && !getAttackBox('ap1_heavy_shot'),
    'ArrowProj1: temp catalog unload clean');
}


// Remote DLC applyContent — bingren seed content.json (Style + look before weapons)
{
  const body = JSON.parse(
    readFileSync(resolve('dlc-server/packages/bingren/content.json'), 'utf8'),
  ) as DlcContentBody & { attacks?: unknown };
  ok(Array.isArray(body.combatStyles) && Array.isArray(body.weaponLooks), 'remote seed has combatStyles+weaponLooks');
  ok(Array.isArray(body.animRecipes) && body.animRecipes.some((r: any) => r.id === 'bingren_canmang_anim'), 'remote seed has bingren animRecipe');
  ok(Array.isArray(body.fxRecipes) && body.fxRecipes.some((r: any) => r.id === 'bingren_cold_flare'), 'remote seed has bingren fxRecipe');
  ok(Array.isArray(body.poses) && body.poses.some((r: any) => r.id === 'bingren_canmang_pose'), 'remote seed has bingren pose');
  ok(Array.isArray(body.poses) && body.poses.some((r: any) => r.id === 'hp.idle' && r.strike?.lean === 0.38),
    'Loco4: remote seed has hp.idle lean=0.38');
  {
    const seedAnim = (body.animRecipes as any[])?.find((r) => r.id === 'bingren_canmang_anim');
    const seedPose = seedAnim?.steps?.find((s: any) => s.kind === 'playPose');
    ok(!!seedPose && seedPose.timeline === 'full' && seedPose.frames === 12, 'Pose3: remote seed playPose timeline:full');
  }
  {
    const keys = Object.keys(body);
    const iFx = keys.indexOf('fxRecipes');
    const iPose = keys.indexOf('poses');
    const iAnim = keys.indexOf('animRecipes');
    const iSkill = keys.indexOf('skills');
    ok(iFx >= 0 && iPose >= 0 && iAnim >= 0 && iFx < iAnim && iPose < iAnim && iAnim < iSkill, 'remote seed key order: poses/fxRecipes before animRecipes before skills');
  }
  ok(body.attacks === undefined, 'remote seed has no attacks (field not required)');
  ok(
    REMOTE_DLC_INJECT.indexOf('combatStyles') >= 0
      && REMOTE_DLC_INJECT.indexOf('weaponLooks') >= 0
      && REMOTE_DLC_INJECT.indexOf('combatStyles') < REMOTE_DLC_INJECT.indexOf('weapons')
      && REMOTE_DLC_INJECT.indexOf('weaponLooks') < REMOTE_DLC_INJECT.indexOf('weapons'),
    'REMOTE_DLC_INJECT: combatStyles/weaponLooks before weapons',
  );
  const remoteFork = game.plugin({
    name: 'dlc-remote-smoke-bingren',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(!!getCombatStyle('bingren_canfeng_chain'), 'remote applyContent: combatStyle');
  ok(!!getWeaponLook('lookBingrenCanfeng')?.parts?.length, 'remote applyContent: weaponLook');
  ok(WEAPON_BY_ID['bingren_canfeng']?.lookId === 'lookBingrenCanfeng', 'remote applyContent: weapon lookId');
  ok(WEAPON_BY_ID['bingren_canfeng']?.combatStyleId === 'bingren_canfeng_chain', 'remote applyContent: weapon combatStyleId');
  ok(resolveCombatStyle(WEAPON_BY_ID['bingren_canfeng']!).id === 'bingren_canfeng_chain', 'remote applyContent: resolveCombatStyle');
  ok(SKILL_BY_ID['bingren_canmang']?.attackKey === 'daomang', 'remote applyContent: skill');
  ok(!!getAnimRecipe('bingren_canmang_anim')?.steps?.length, 'remote applyContent: bingren animRecipe');
  ok(SKILL_BY_ID['bingren_canmang']?.castAnim === 'bingren_canmang_anim', 'remote applyContent: bingren castAnim');
  ok(!!getAnimRecipe(SKILL_BY_ID['bingren_canmang']!.castAnim as string)?.steps?.length, 'remote applyContent: bingren castAnim resolves');
  ok(getFxRecipe('bingren_cold_flare')?.emitter === 'flare', 'remote applyContent: bingren fxRecipe');
  ok(!!getPose('bingren_canmang_pose')?.strike, 'remote applyContent: bingren pose');
  ok(!!getPose('hp.idle')?.strike && getPose('hp.idle')!.strike.lean === 0.38, 'Loco4: remote applyContent hp.idle');
  ok(locoPose('hp.idle', HP.idle).lean === 0.38, 'Loco4: remote locoPose(hp.idle) eats seed');
  {
    const anim = getAnimRecipe('bingren_canmang_anim');
    const poseStep = anim?.steps?.find((s: any) => s.kind === 'playPose') as any;
    const inkStep = anim?.steps?.find((s: any) => s.kind === 'inkBurst') as any;
    ok(!!poseStep && !!getPose(poseStep.poseId)?.strike, 'remote bingren: playPose poseId resolves');
    ok(poseStep.timeline === 'full' && poseStep.frames === 12, 'Pose3: remote apply playPose timeline:full');
    ok(!!inkStep && !!getFxRecipe(inkStep.recipeId), 'remote bingren: inkBurst recipeId resolves');
    const fxStep = (SKILL_BY_ID['bingren_canmang']!.castFx as any[])?.find((s) => s.kind === 'fx' && s.recipeId);
    ok(!!fxStep && !!getFxRecipe(fxStep.recipeId), 'remote bingren: castFx recipeId resolves');
  }
  remoteFork.dispose();
  ok(!getPose('hp.idle') && locoPose('hp.idle', HP.idle) === HP.idle, 'Loco4: remote unload cleans hp.idle');
  ok(!getCombatStyle('bingren_canfeng_chain') && !getWeaponLook('lookBingrenCanfeng') && !WEAPON_BY_ID['bingren_canfeng'], 'remote smoke unload clean');
  ok(!getAnimRecipe('bingren_canmang_anim') && !('bingren_canmang' in SKILL_BY_ID), 'remote bingren anim+skill unload clean');
  ok(!getFxRecipe('bingren_cold_flare') && !getPose('bingren_canmang_pose'), 'remote bingren fxRecipe+pose unload clean');
}

// R3 remote: moyu seed content.json (projectiles before volleys; sfx early; backdrops)
{
  const body = JSON.parse(
    readFileSync(resolve('dlc-server/packages/moyu/content.json'), 'utf8'),
  ) as DlcContentBody;
  ok(Array.isArray(body.attacks) && body.attacks!.some((r: any) => r.id === 'moyu_ink_shot' && r.damage === 16), 'remote seed has moyu_ink_shot');
  ok(Array.isArray(body.projectiles) && body.projectiles!.some((r: any) => r.id === 'moyu_ink_arrow'), 'remote seed has moyu projectile');
  ok(body.projectiles!.some((r: any) => r.id === 'moyu_ink_arrow' && r.attackKey === 'moyu_ink_shot'), 'remote seed moyu arrow attackKey');
  ok(Array.isArray(body.volleys) && body.volleys!.some((r: any) => r.id === 'moyu_slow_thunder'), 'remote seed has moyu volley');
  ok(Array.isArray(body.sfx) && body.sfx!.some((r: any) => r.id === 'moyu_ink_slash'), 'remote seed has moyu sfx');
  ok(body.sfx!.some((r: any) => r.id === 'moyu_file_tap' && r.src === './art/audio/r4a_smoke.wav' && r.format === 'wav'),
    'R4b: remote seed has moyu_file_tap (path only, no binary in tgz)');
  ok(body.sfx!.some((r: any) => r.id === 'moyu_file_click' && r.src === './art/audio/r4c_tap.ogg' && r.format === 'ogg'),
    'R4c: remote seed has moyu_file_click (path only, no binary in tgz)');
  ok(Array.isArray(body.backdrops) && body.backdrops!.some((r: any) => r.id === 'moyu_eclipse_tint'), 'remote seed has moyu backdrop');
  {
    const keys = Object.keys(body);
    const iSfx = keys.indexOf('sfx');
    const iProj = keys.indexOf('projectiles');
    const iVol = keys.indexOf('volleys');
    const iBeh = keys.indexOf('behaviors');
    const iBd = keys.indexOf('backdrops');
    ok(iSfx >= 0 && iProj >= 0 && iVol >= 0 && iProj < iVol && iVol < iBeh && iBd > iBeh, 'remote seed key order: sfx/projectiles/volleys before behaviors; backdrops late');
  }
  const remoteFork = game.plugin({
    name: 'dlc-remote-smoke-moyu',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(getProjectile('moyu_ink_arrow')?.drawKind === 'arrow' && getProjectile('moyu_ink_arrow')!.hitW === 32, 'remote applyContent: moyu projectile');
  ok(getProjectile('moyu_ink_arrow')?.attackKey === 'moyu_ink_shot', 'remote applyContent: moyu attackKey');
  ok(!!getAttackBox('moyu_ink_shot') && getAttackBox('moyu_ink_shot')!.damage === 16, 'remote applyContent: moyu_ink_shot');
  ok(getVolley('moyu_slow_thunder')?.style === 'thunder' && getVolley('moyu_slow_thunder')!.defaultInterval === 18, 'remote applyContent: moyu volley');
  ok(getSfxDef('moyu_ink_slash')?.synth === 'slash', 'remote applyContent: moyu sfx');
  ok(getSfxDef('moyu_file_tap')?.src === './art/audio/r4a_smoke.wav' && getSfxDef('moyu_file_tap')?.format === 'wav',
    'R4b: remote applyContent: moyu_file_tap');
  ok(getSfxDef('moyu_file_click')?.src === './art/audio/r4c_tap.ogg' && getSfxDef('moyu_file_click')?.format === 'ogg',
    'R4c: remote applyContent: moyu_file_click');
  ok(getBackdrop('moyu_eclipse_tint')?.theme === 'eclipse', 'remote applyContent: moyu backdrop');
  {
    const script = getTalismanScript('moyuSlowThunder');
    const volleyStep = script?.steps?.find((s: any) => s.kind === 'spawnVolley') as any;
    ok(!!volleyStep && !!getVolley(volleyStep.volleyId), 'remote moyu: spawnVolley.volleyId resolves');
    const bh = getBehavior('moyu_ink_archer');
    const ra = bh?.steps?.find((s: any) => s.kind === 'rangedAttack') as any;
    ok(!!ra && !!getProjectile(ra.projectileId), 'remote moyu: rangedAttack.projectileId resolves');
  }
  ok(TALISMAN_BY_ID['moyufu']?.scriptId === 'moyuSlowThunder', 'remote applyContent: moyu talisman');
  ok(ENEMY_BY_ID['moyu_archer']?.behaviorId === 'moyu_ink_archer', 'remote applyContent: moyu enemy');
  remoteFork.dispose();
  ok(!getProjectile('moyu_ink_arrow') && !getVolley('moyu_slow_thunder'), 'remote moyu projectile+volley unload clean');
  ok(!getAttackBox('moyu_ink_shot'), 'remote moyu attack unload clean');
  ok(!getSfxDef('moyu_ink_slash') && !getSfxDef('moyu_file_tap') && !getBackdrop('moyu_eclipse_tint'), 'remote moyu sfx+backdrop unload clean');
  ok(!('moyufu' in TALISMAN_BY_ID) && !ENEMY_BY_ID['moyu_archer'] && !getBehavior('moyu_ink_archer'), 'remote moyu talisman/enemy/behavior unload clean');
}


// Remote DLC applyContent — qiangying seed (anim + multihit + behaviors/silhouettes aligned with Cordis)
{
  const body = JSON.parse(
    readFileSync(resolve('dlc-server/packages/qiangying/content.json'), 'utf8'),
  ) as DlcContentBody;
  const script = (body.talismanScripts as any[])?.find((s) => s.id === 'qiangyingQiangmang');
  ok(!!script && script.anim === 'sealStampFull', 'remote qiangying seed anim=sealStampFull');
  ok(!!script?.steps?.some((s: any) => s.kind === 'multihit' && s.step?.kind === 'damageCone'), 'remote qiangying seed has multihit+damageCone');
  ok(!!script?.steps?.some((s: any) => s.kind === 'damageBox'), 'remote qiangying seed has damageBox');
  ok(!!(body.behaviors as any[])?.some((b) => b.id === 'qiangying_mid_spear' && b.steps?.length >= 4), 'remote qiangying seed has qiangying_mid_spear steps');
  ok(!!(body.silhouettes as any[])?.some((s) => s.id === 'qiangying_vanguard'), 'remote qiangying seed has qiangying_vanguard silhouette');
  const vgSeed = (body.enemies as any[])?.find((e) => e.id === 'qiangying_vanguard');
  ok(vgSeed?.behaviorId === 'qiangying_mid_spear', 'remote qiangying seed vanguard behaviorId');
  ok(vgSeed?.silhouetteId === 'qiangying_vanguard', 'remote qiangying seed vanguard silhouetteId');
  const remoteQy = game.plugin({
    name: 'dlc-remote-smoke-qiangying',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  const qyScript = game.talismans.getScript('qiangyingQiangmang');
  ok(qyScript?.anim === 'sealStampFull', 'remote applyContent: qiangyingQiangmang anim');
  ok(!!qyScript?.steps?.some((s: any) => s.kind === 'multihit'), 'remote applyContent: qiangyingQiangmang multihit');
  ok(TALISMAN_BY_ID['qiangying_qiangmang']?.scriptId === 'qiangyingQiangmang', 'remote applyContent: qiangmang Def');
  ok(!!getBehavior('qiangying_mid_spear')?.steps?.length, 'remote applyContent: getBehavior(qiangying_mid_spear) has steps');
  ok((getBehavior('qiangying_mid_spear')!.steps!.length) >= 4, 'remote applyContent: qiangying_mid_spear step count');
  ok(!!getSilhouette('qiangying_vanguard'), 'remote applyContent: getSilhouette(qiangying_vanguard)');
  ok(ENEMY_BY_ID['qiangying_vanguard']?.behaviorId === 'qiangying_mid_spear', 'remote applyContent: vanguard behaviorId');
  ok(ENEMY_BY_ID['qiangying_vanguard']?.silhouetteId === 'qiangying_vanguard', 'remote applyContent: vanguard silhouetteId');
  const rve = makeEnemy('qiangying_vanguard', 50, { eliteChance: 0 });
  ok(!!rve.behaviorSteps?.length, 'remote applyContent: makeEnemy vanguard behaviorSteps');
  ok(rve.behaviorId === 'qiangying_mid_spear', 'remote applyContent: makeEnemy vanguard behaviorId');
  remoteQy.dispose();
  ok(!game.talismans.getScript('qiangyingQiangmang') && !('qiangying_qiangmang' in TALISMAN_BY_ID), 'remote qiangying smoke unload clean');
  ok(!getBehavior('qiangying_mid_spear') && !getSilhouette('qiangying_vanguard') && !ENEMY_BY_ID['qiangying_vanguard'], 'remote qiangying behavior/sil/enemy unload clean');
}

// Remote DLC applyContent — hanmang seed icon (T3)
{
  const body = JSON.parse(
    readFileSync(resolve('dlc-server/packages/hanmang/content.json'), 'utf8'),
  ) as DlcContentBody;
  const tal = (body.talismans as any[])?.find((t) => t.id === 'hanmangfu');
  ok(tal?.icon === 'H-05-tal-1', 'remote hanmang seed icon=H-05-tal-1');
  const remoteHm = game.plugin({
    name: 'dlc-remote-smoke-hanmang-icon',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(TALISMAN_BY_ID['hanmangfu']?.icon === 'H-05-tal-1', 'remote applyContent: hanmangfu icon');
  // legal ./art/ path accepted
  const artOk = game.plugin({
    name: 'tal-icon-art-ok', inject: ['talismans'],
    apply(ctx) {
      ctx.talismans.add({
        id: 'articon', name: '艺图标', fogName: 'x', lore: 'x', tip: 'x', color: '#aaf',
        cost: { cinnabar: 1 }, fee: 1, stockCap: 1, runCharges: 1,
        icon: './art/icons/H-05-tal-2_128.png',
      });
    },
  });
  ok(TALISMAN_BY_ID['articon']?.icon === './art/icons/H-05-tal-2_128.png', 'talisman icon ./art/ accepted');
  artOk.dispose();
  remoteHm.dispose();
  ok(!('hanmangfu' in TALISMAN_BY_ID) && !('articon' in TALISMAN_BY_ID), 'remote hanmang icon smoke unload clean');
}

// Remote DLC applyContent — animRecipes before skills (castAnim string resolve)
{
  ok(
    REMOTE_DLC_INJECT.indexOf('animRecipes') >= 0
      && REMOTE_DLC_INJECT.indexOf('animRecipes') < REMOTE_DLC_INJECT.indexOf('skills'),
    'REMOTE_DLC_INJECT: animRecipes before skills',
  );
  const body: DlcContentBody = {
    animRecipes: [{
      id: 'remote_rain_thrust',
      label: '雨枪突',
      steps: [
        { kind: 'face', dir: 'player' },
        { kind: 'dash', dist: 60, frames: 4 },
        { kind: 'sparkBurst', n: 3 },
      ],
    }],
    skills: [{
      id: 'remote_yuqiang',
      name: '雨枪',
      fogName: '武学·雨枪',
      kind: 'active',
      track: 'combat',
      lore: '远程注入试招。',
      tip: '突刺',
      profHint: '试炼',
      meditateCost: {},
      fee: 0,
      weaponGate: 'any',
      castKind: 'attack',
      attackKey: 'daomang',
      castAnim: 'remote_rain_thrust',
      effects: { skillCd: [40], skillDmgMult: [1] },
    }],
  };
  const remoteAnimFork = game.plugin({
    name: 'dlc-remote-smoke-animRecipes',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(!!getAnimRecipe('remote_rain_thrust')?.steps?.length, 'remote applyContent: animRecipe');
  ok(SKILL_BY_ID['remote_yuqiang']?.castAnim === 'remote_rain_thrust', 'remote applyContent: skill castAnim');
  ok(!!getAnimRecipe(SKILL_BY_ID['remote_yuqiang']!.castAnim as string)?.steps?.length, 'remote applyContent: castAnim resolves');
  remoteAnimFork.dispose();
  ok(!getAnimRecipe('remote_rain_thrust') && !SKILL_BY_ID['remote_yuqiang'], 'remote animRecipes smoke unload clean');
}

// Remote DLC applyContent — poses + fxRecipes before animRecipes / skills (poseId / recipeId)
{
  ok(
    REMOTE_DLC_INJECT.indexOf('poses') >= 0
      && REMOTE_DLC_INJECT.indexOf('fxRecipes') >= 0
      && REMOTE_DLC_INJECT.indexOf('poses') < REMOTE_DLC_INJECT.indexOf('animRecipes')
      && REMOTE_DLC_INJECT.indexOf('fxRecipes') < REMOTE_DLC_INJECT.indexOf('animRecipes')
      && REMOTE_DLC_INJECT.indexOf('poses') < REMOTE_DLC_INJECT.indexOf('skills')
      && REMOTE_DLC_INJECT.indexOf('fxRecipes') < REMOTE_DLC_INJECT.indexOf('skills'),
    'REMOTE_DLC_INJECT: poses/fxRecipes before animRecipes/skills',
  );
  const body: DlcContentBody = {
    poses: [{
      id: 'remote_rain_stance',
      wind: { y: 0, lean: -0.05 },
      strike: { y: 5, lean: 0.2, fa: 1.2, w: 0.1 },
      rec: { y: 3, lean: 0.1 },
    }],
    fxRecipes: [{
      id: 'remote_ink_flare',
      emitter: 'flare',
      color: '#4060a0',
      size: 55,
      life: 14,
      n: 8,
    }],
    animRecipes: [{
      id: 'remote_rain_ink',
      label: '雨枪墨爆',
      steps: [
        { kind: 'playPose', poseId: 'remote_rain_stance', frames: 4 },
        { kind: 'inkBurst', recipeId: 'remote_ink_flare', size: 40 },
      ],
    }],
    talismanScripts: [{
      id: 'remoteInkBurst',
      anim: 'sealStampFull',
      steps: [
        { kind: 'fx', recipeId: 'remote_ink_flare', at: 'caster' },
        { kind: 'wait', frames: 4 },
      ],
    }],
  };
  const remoteFxFork = game.plugin({
    name: 'dlc-remote-smoke-poses-fxRecipes',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(!!getPose('remote_rain_stance')?.strike, 'remote applyContent: getPose(remote_rain_stance)');
  ok(getFxRecipe('remote_ink_flare')?.emitter === 'flare', 'remote applyContent: getFxRecipe(remote_ink_flare)');
  ok(getFxRecipe('remote_ink_flare')?.color === '#4060a0', 'remote applyContent: fxRecipe color');
  const rainInk = getAnimRecipe('remote_rain_ink');
  ok(!!rainInk?.steps?.length, 'remote applyContent: animRecipe with pose/fx refs');
  const poseStep = rainInk?.steps?.find((s: any) => s.kind === 'playPose') as any;
  const inkStep = rainInk?.steps?.find((s: any) => s.kind === 'inkBurst') as any;
  ok(!!poseStep && !!getPose(poseStep.poseId)?.strike, 'remote: playPose poseId resolves (no missing-dir warn)');
  ok(!!inkStep && !!getFxRecipe(inkStep.recipeId), 'remote: inkBurst recipeId resolves (no missing-dir warn)');
  const ts = getTalismanScript('remoteInkBurst');
  const fxStep = ts?.steps?.find((s: any) => s.kind === 'fx') as any;
  ok(!!fxStep && !!getFxRecipe(fxStep.recipeId), 'remote: talisman fx.recipeId resolves');
  remoteFxFork.dispose();
  ok(
    !getPose('remote_rain_stance')
      && !getFxRecipe('remote_ink_flare')
      && !getAnimRecipe('remote_rain_ink')
      && !getTalismanScript('remoteInkBurst'),
    'remote poses/fxRecipes smoke unload clean',
  );
}

// Remote DLC applyContent — silhouettes + behaviors before enemies (behaviorId / silhouetteId)
{
  ok(
    REMOTE_DLC_INJECT.indexOf('behaviors') >= 0
      && REMOTE_DLC_INJECT.indexOf('silhouettes') >= 0
      && REMOTE_DLC_INJECT.indexOf('behaviors') < REMOTE_DLC_INJECT.indexOf('enemies')
      && REMOTE_DLC_INJECT.indexOf('silhouettes') < REMOTE_DLC_INJECT.indexOf('enemies'),
    'REMOTE_DLC_INJECT: silhouettes/behaviors before enemies',
  );
  const body: DlcContentBody = {
    silhouettes: [{
      id: 'remote_rain_spear_sil',
      body: 'spear',
      baseRig: 'spear',
      label: '雨枪影',
    }],
    behaviors: [{
      id: 'remote_rain_spear',
      body: 'spear',
      label: '雨枪中距',
      steps: [
        { kind: 'facePlayer' },
        { kind: 'keepDistance', idealMin: 80, idealMax: 140, chase: 220 },
        { kind: 'meleeAttack', attackKey: 'thrust', rangeMin: 80, rangeMax: 120, weight: 2, cooldown: 45 },
        { kind: 'circleStrafe', radius: 100, speed: 1.2, weight: 1 },
      ],
    }],
    enemies: [{
      id: 'remote_rain_bandit',
      name: '雨枪试贼',
      body: 'spear',
      hp: 48,
      behaviorId: 'remote_rain_spear',
      silhouetteId: 'remote_rain_spear_sil',
    }],
  };
  const remoteBehFork = game.plugin({
    name: 'dlc-remote-smoke-behaviors',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(!!getBehavior('remote_rain_spear')?.steps?.length, 'remote applyContent: behavior steps');
  ok((getBehavior('remote_rain_spear')!.steps!.length) >= 4, 'remote applyContent: behavior step count');
  ok(!!getSilhouette('remote_rain_spear_sil'), 'remote applyContent: silhouette');
  ok(ENEMY_BY_ID['remote_rain_bandit']?.behaviorId === 'remote_rain_spear', 'remote applyContent: enemy behaviorId');
  const re = makeEnemy('remote_rain_bandit', 40, { eliteChance: 0 });
  ok(!!re.behaviorSteps?.length, 'remote applyContent: makeEnemy behaviorSteps');
  ok(re.behaviorSteps!.some((s) => s.kind === 'keepDistance'), 'remote applyContent: behaviorSteps keepDistance');
  ok(re.silhouetteId === 'remote_rain_spear_sil', 'remote applyContent: makeEnemy silhouetteId');
  remoteBehFork.dispose();
  ok(
    !getBehavior('remote_rain_spear')
      && !getSilhouette('remote_rain_spear_sil')
      && !ENEMY_BY_ID['remote_rain_bandit'],
    'remote behaviors smoke unload clean',
  );
}

// Remote DLC applyContent — colliders before enemies (colliderId → assemble box size)
{
  ok(
    REMOTE_DLC_INJECT.indexOf('colliders') >= 0
      && REMOTE_DLC_INJECT.indexOf('colliders') < REMOTE_DLC_INJECT.indexOf('enemies')
      && REMOTE_DLC_INJECT.indexOf('silhouettes') < REMOTE_DLC_INJECT.indexOf('enemies')
      && REMOTE_DLC_INJECT.indexOf('behaviors') < REMOTE_DLC_INJECT.indexOf('enemies'),
    'REMOTE_DLC_INJECT: colliders (and sil/beh) before enemies',
  );
  ok(
    REMOTE_DLC_INJECT.indexOf('silhouettes') < REMOTE_DLC_INJECT.indexOf('behaviors')
      && REMOTE_DLC_INJECT.indexOf('behaviors') < REMOTE_DLC_INJECT.indexOf('colliders')
      && REMOTE_DLC_INJECT.indexOf('colliders') < REMOTE_DLC_INJECT.indexOf('enemies'),
    'REMOTE_DLC_INJECT: silhouettes → behaviors → colliders → enemies',
  );
  const body: DlcContentBody = {
    colliders: [{
      id: 'remote_wide_box',
      w: 48,
      h: 96,
      label: '远程宽盒',
    }],
    silhouettes: [{
      id: 'remote_wide_sil',
      body: 'axe',
      baseRig: 'axe',
      label: '宽盒影',
    }],
    behaviors: [{
      id: 'remote_wide_axe',
      body: 'axe',
      label: '宽盒斧',
      steps: [
        { kind: 'facePlayer' },
        { kind: 'keepDistance', idealMin: 70, idealMax: 90, chase: 300 },
        { kind: 'meleeAttack', attackKey: 'axeChop', rangeMax: 90, weight: 2 },
      ],
    }],
    enemies: [{
      id: 'remote_wide_bandit',
      name: '宽盒试贼',
      hp: 55,
      silhouetteId: 'remote_wide_sil',
      behaviorId: 'remote_wide_axe',
      colliderId: 'remote_wide_box',
    }],
  };
  const remoteColFork = game.plugin({
    name: 'dlc-remote-smoke-colliders',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(!!getCollider('remote_wide_box'), 'remote applyContent: getCollider(remote_wide_box)');
  ok(getCollider('remote_wide_box')!.w === 48 && getCollider('remote_wide_box')!.h === 96, 'remote applyContent: collider 48×96');
  ok(ENEMY_BY_ID['remote_wide_bandit']?.colliderId === 'remote_wide_box', 'remote applyContent: enemy colliderId');
  const rce = makeEnemy('remote_wide_bandit', 40, { eliteChance: 0 });
  ok(rce.body.w === 48 && rce.body.h === 96, 'remote applyContent: makeEnemy applies collider box size');
  ok(!!rce.behaviorSteps?.length, 'remote applyContent: collider pack behaviorSteps');
  remoteColFork.dispose();
  ok(
    !getCollider('remote_wide_box')
      && !getSilhouette('remote_wide_sil')
      && !getBehavior('remote_wide_axe')
      && !ENEMY_BY_ID['remote_wide_bandit'],
    'remote colliders smoke unload clean',
  );
}

// A2: Remote DLC applyContent — attacks early (before skills/behaviors); attackKey resolves
{
  ok(
    REMOTE_DLC_INJECT.indexOf('attacks') >= 0
      && REMOTE_DLC_INJECT.indexOf('attacks') < REMOTE_DLC_INJECT.indexOf('skills')
      && REMOTE_DLC_INJECT.indexOf('attacks') < REMOTE_DLC_INJECT.indexOf('behaviors'),
    'REMOTE_DLC_INJECT: attacks before skills/behaviors',
  );
  const body: DlcContentBody = {
    attacks: [{
      id: 'a2_remote_cleave', name: 'a2_remote_cleave',
      startup: 18, active: 6, recovery: 22,
      box: { x: 10, y: -70, w: 72, h: 54 },
      damage: 17, kbX: 4, kbY: -1,
      hitstun: 16, hitstop: 4, shake: 3, swing: 'slash',
    }],
    silhouettes: [{
      id: 'a2_remote_sil',
      body: 'axe',
      baseRig: 'axe',
      label: 'A2影',
    }],
    behaviors: [{
      id: 'a2_remote_axe',
      body: 'axe',
      label: 'A2自建劈',
      steps: [
        { kind: 'facePlayer' },
        { kind: 'keepDistance', idealMin: 60, idealMax: 100, chase: 280 },
        { kind: 'meleeAttack', attackKey: 'a2_remote_cleave', rangeMax: 100, weight: 2, cooldown: 40 },
      ],
    }],
    enemies: [{
      id: 'a2_remote_bandit',
      name: 'A2试贼',
      body: 'axe',
      hp: 52,
      silhouetteId: 'a2_remote_sil',
      behaviorId: 'a2_remote_axe',
    }],
  };
  const remoteAtkFork = game.plugin({
    name: 'dlc-remote-smoke-attacks',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(!!getAttackBox('a2_remote_cleave'), 'A2 remote applyContent: getAttackBox has a2_remote_cleave');
  ok(getAttackBox('a2_remote_cleave')!.damage === 17, 'A2 remote applyContent: box damage 17');
  ok(!!getBehavior('a2_remote_axe')?.steps?.some((s) => s.kind === 'meleeAttack' && s.attackKey === 'a2_remote_cleave'),
    'A2 remote: behavior meleeAttack.attackKey points at remote box');
  const a2e = makeEnemy('a2_remote_bandit', 40, { eliteChance: 0 });
  ok(!!a2e.behaviorSteps?.length, 'A2 remote: makeEnemy behaviorSteps');
  const melee = a2e.behaviorSteps!.find((s) => s.kind === 'meleeAttack');
  ok(!!melee && melee.kind === 'meleeAttack' && melee.attackKey === 'a2_remote_cleave',
    'A2 remote: attached step attackKey is a2_remote_cleave');
  const resolved = getAttackBox(melee!.kind === 'meleeAttack' ? melee.attackKey! : '');
  ok(!!resolved && resolved.id === 'a2_remote_cleave' && resolved.damage === 17,
    'A2 remote: attackKey resolves via getAttackBox to remote box');
  a2e.startAttack(resolved!);
  ok(!!a2e.atk && a2e.atk.def.name === 'a2_remote_cleave', 'A2 remote: startAttack uses remote box (出招)');
  remoteAtkFork.dispose();
  ok(
    !getAttackBox('a2_remote_cleave')
      && !getBehavior('a2_remote_axe')
      && !getSilhouette('a2_remote_sil')
      && !ENEMY_BY_ID['a2_remote_bandit'],
    'A2 remote attacks smoke unload clean',
  );
}

// G1: Remote DLC applyContent — bossMoves before bossKits / enemies (move id + radius)
{
  ok(
    REMOTE_DLC_INJECT.indexOf('bossMoves') >= 0
      && REMOTE_DLC_INJECT.indexOf('bossMoves') < REMOTE_DLC_INJECT.indexOf('bossKits')
      && REMOTE_DLC_INJECT.indexOf('bossMoves') < REMOTE_DLC_INJECT.indexOf('enemies'),
    'REMOTE_DLC_INJECT: bossMoves before bossKits / enemies',
  );
  const body: DlcContentBody = {
    bossMoves: [{
      id: 'slam_heavy',
      kind: 'slam',
      label: '重震地',
      radius: 220,
      damage: 24,
      hitstop: 12,
    }],
    bossKits: [{
      id: 'remote_heavy_kit',
      close: [
        { move: 'slam_heavy', weight: 5 },
        { move: 'claw', weight: 1 },
      ],
      far: [
        { move: 'slam_heavy', weight: 3 },
        { move: 'walk', weight: 1 },
      ],
    }],
  };
  const remoteBmFork = game.plugin({
    name: 'dlc-remote-smoke-bossMoves',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  const heavy = getBossMove('slam_heavy');
  ok(!!heavy && heavy.kind === 'slam', 'G1 remote applyContent: getBossMove(slam_heavy) has kind slam');
  ok(heavy!.radius === 220, 'G1 remote applyContent: getBossMove(slam_heavy).radius === 220');
  ok(heavy!.damage === 24, 'G1 remote applyContent: getBossMove(slam_heavy).damage === 24');
  const kit = BOSS_KIT_BY_ID['remote_heavy_kit'] ?? getBossKit('remote_heavy_kit');
  ok(!!kit?.close.some((w) => w.move === 'slam_heavy' && w.weight === 5), 'G1 remote: kit close weights include slam_heavy');
  const weights = bossMoveWeights('remote_heavy_kit', true, true);
  ok(weights.some(([m, w]) => m === 'slam_heavy' && w > 0), 'G1 remote: bossMoveWeights includes slam_heavy');
  // chooseMove path (read-only): pick → getBossMove → moveParams.radius (gargoyle ~295)
  const pick = 'slam_heavy';
  const moveParams = getBossMove(pick);
  ok(!!moveParams && moveParams.radius === 220, 'G1 remote: chooseMove-path getBossMove(pick).radius ready for moveParams');
  remoteBmFork.dispose();
  ok(
    !getBossMove('slam_heavy')
      && !BOSS_KIT_BY_ID['remote_heavy_kit']
      && !getBossKit('remote_heavy_kit'),
    'G1 remote bossMoves smoke unload clean',
  );
}

// Act1: Remote DLC applyContent — acts.pools / acts.beats via pool/beat (NOT add)
{
  ok(
    REMOTE_DLC_INJECT.indexOf('acts') >= 0
      && REMOTE_DLC_INJECT.indexOf('stages') >= 0,
    'REMOTE_DLC_INJECT: acts present (near stages; SlotStack service)',
  );
  const core0 = CORE_ACT_POOLS[0]!;
  const loreBefore = actPool(0).loreLine;
  const shanbuBefore = (actPool(0).eliteWeights as Record<string, number>).shanbu ?? 0;
  const stage0Id = getChapter(0).id;
  const stage0Len = getChapter(0).length;
  const stageCount = actCount();
  const beat0Before = getBetweenActBeat(0)?.title;

  // 无 acts 字段的旧包：apply 后幕池不变
  const legacyFork = game.plugin({
    name: 'dlc-remote-smoke-acts-legacy',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, { materials: [] }); },
  });
  ok(actPool(0).loreLine === loreBefore, 'Act1: legacy body without acts leaves actPool(0).loreLine');
  ok(getChapter(0).id === stage0Id && actCount() === stageCount, 'Act1: legacy body leaves stages intact');
  legacyFork.dispose();

  const body: DlcContentBody = {
    acts: {
      pools: [{
        actIndex: 0,
        kit: 'stone',
        tint: 'jade',
        eliteWeights: {
          tongpi: 1, zhongji: 1, shanbu: 9, fanshang: 1, shixue: 1, xiehuo: 1,
        },
        dropLean: [...core0.dropLean],
        blueprintLean: [...core0.blueprintLean],
        setLean: [...core0.setLean],
        loreLine: '远程试灌·山门新钟。',
      }],
      beats: [{
        fromAct: 0,
        id: 'betweenActs.remote.1to2',
        when: 'betweenActs',
        title: '远程幕间试字幕',
        subtitle: '试灌 betweenActs',
        holdFrames: 120,
        slowmo: 0.5,
      }],
    },
  };
  const remoteActsFork = game.plugin({
    name: 'dlc-remote-smoke-acts',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(actPool(0).loreLine === '远程试灌·山门新钟。', 'Act1 remote: actPool(0).loreLine overwritten');
  ok(
    (actPool(0).eliteWeights as Record<string, number>).shanbu === 9
      && (actPool(0).eliteWeights as Record<string, number>).shanbu !== shanbuBefore,
    'Act1 remote: actPool(0).eliteWeights.shanbu === 9',
  );
  ok(actPool(0).kit === 'stone' && actPool(0).tint === 'jade', 'Act1 remote: kit/tint still stone/jade');
  // 仅覆盖第 0 幕；第 1 幕仍核心
  ok(actPool(1).loreLine === CORE_ACT_POOLS[1]!.loreLine, 'Act1 remote: actPool(1) still 官方包 (partial pool)');
  const beat0 = getBetweenActBeat(0);
  ok(!!beat0 && beat0.id === 'betweenActs.remote.1to2' && beat0.title === '远程幕间试字幕',
    'Act1 remote: getBetweenActBeat(0) has remote betweenActs');
  ok(beat0!.when === 'betweenActs', 'Act1 remote: beat when === betweenActs');
  // stages 几何/波次不变（本 body 无 stages）
  ok(
    getChapter(0).id === stage0Id
      && getChapter(0).length === stage0Len
      && actCount() === stageCount,
    'Act1 remote: stages geometry/count unchanged',
  );
  remoteActsFork.dispose();
  ok(
    actPool(0).loreLine === loreBefore
      && (actPool(0).eliteWeights as Record<string, number>).shanbu === shanbuBefore
      && getBetweenActBeat(0)?.title === beat0Before,
    'Act1 remote acts smoke unload restores 官方包 pool/beat',
  );
}

// Act1.5: ActPool.kit open string — custom bossKit id via pool fallback → resolveBossKit
{
  const core0 = CORE_ACT_POOLS[0]!;
  const kitBefore = actPool(0).kit;
  ok(kitBefore === 'stone', 'Act1.5 pre: actPool(0).kit still stone');

  const act15Fork = game.plugin({
    name: 'act15-kit-open-string',
    inject: ['bossKits', 'acts'],
    apply(ctx) {
      ctx.bossKits.add({
        id: 'act15_custom_kit',
        close: [
          { move: 'claw', weight: 5 }, { move: 'charge', weight: 1 },
          { move: 'dive', weight: 1 }, { move: 'roar', weight: 1.4 },
          { move: 'slam', weight: 2 }, { move: 'sweep', weight: 1 },
        ],
        far: [
          { move: 'fireball', weight: 3 }, { move: 'dive', weight: 1 },
          { move: 'charge', weight: 2 }, { move: 'walk', weight: 2 }, { move: 'roar', weight: 1.4 },
        ],
      });
      // Cordis path: pool.kit = 自建 id（Schema 开放 string 须吃上，非 lit 拒收）
      ctx.acts.pool(0, {
        kit: 'act15_custom_kit',
        tint: core0.tint,
        eliteWeights: { ...core0.eliteWeights },
        dropLean: [...core0.dropLean],
        blueprintLean: [...core0.blueprintLean],
        setLean: [...core0.setLean],
        loreLine: core0.loreLine,
      });
    },
  });
  ok(!!getBossKit('act15_custom_kit'), 'Act1.5: custom bossKit registered');
  ok(actPool(0).kit === 'act15_custom_kit', 'Act1.5 Cordis: actPool(0).kit === act15_custom_kit');
  ok(
    resolveBossKit({ poolKit: actPool(0).kit }) === 'act15_custom_kit',
    'Act1.5: resolveBossKit(poolKit) eats custom kit via pool fallback',
  );
  // 无 stage/def 时导演同路径应落到自建 id
  ok(
    resolveBossKit({ stageKit: null, defKitId: null, poolKit: actPool(0).kit }) === 'act15_custom_kit',
    'Act1.5: resolveBossKit null stage/def → pool custom kit',
  );
  // 核心四 lit 仍可用
  ok(resolveBossKit({ poolKit: 'stone' }) === 'stone', 'Act1.5: 官方包 stone still resolves');
  ok(resolveBossKit({ poolKit: 'rain' }) === 'rain', 'Act1.5: 官方包 rain still resolves');
  act15Fork.dispose();
  ok(
    actPool(0).kit === kitBefore && !getBossKit('act15_custom_kit'),
    'Act1.5 unload restores 官方包 pool.kit + drops custom kit',
  );

  // 远程 apply 同构：body.acts.pools[].kit = 自建 id
  const remoteBody: DlcContentBody = {
    bossKits: [{
      id: 'act15_remote_kit',
      close: [
        { move: 'claw', weight: 4 }, { move: 'charge', weight: 2 },
        { move: 'dive', weight: 1 }, { move: 'roar', weight: 1.4 },
        { move: 'slam', weight: 1.5 }, { move: 'sweep', weight: 1.2 },
      ],
      far: [
        { move: 'fireball', weight: 2 }, { move: 'dive', weight: 2 },
        { move: 'charge', weight: 3 }, { move: 'walk', weight: 2 }, { move: 'roar', weight: 1.4 },
      ],
    }],
    acts: {
      pools: [{
        actIndex: 0,
        kit: 'act15_remote_kit',
        tint: 'jade',
        eliteWeights: { ...core0.eliteWeights as Record<string, number> },
        dropLean: [...core0.dropLean],
        blueprintLean: [...core0.blueprintLean],
        setLean: [...core0.setLean],
        loreLine: core0.loreLine,
      }],
    },
  };
  const remote15 = game.plugin({
    name: 'dlc-remote-smoke-act15-kit',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, remoteBody); },
  });
  ok(!!getBossKit('act15_remote_kit'), 'Act1.5 remote: bossKit act15_remote_kit registered');
  ok(actPool(0).kit === 'act15_remote_kit', 'Act1.5 remote: actPool(0).kit === act15_remote_kit');
  ok(
    resolveBossKit({ poolKit: actPool(0).kit }) === 'act15_remote_kit',
    'Act1.5 remote: resolveBossKit eats pool.kit custom id',
  );
  remote15.dispose();
  ok(
    actPool(0).kit === kitBefore && !getBossKit('act15_remote_kit'),
    'Act1.5 remote unload restores 官方包 kit',
  );
}

// Act2: 设计台幕池段 — schema/state/export 同构 { pools, beats } → applyContent → actPool / getBetweenActBeat
{
  const designerJs = readFileSync(resolve('dlc-server/public/assets/designer.js'), 'utf8');
  ok(
    designerJs.includes("acts: { pools: [], beats: [] }")
      && designerJs.includes('buildContentExport')
      && designerJs.includes('c.acts')
      && designerJs.includes('设计台试笔·山门新钟。')
      && designerJs.includes('betweenActs.demo.1to2')
      && designerJs.includes('function renderActs')
      && designerJs.includes("datalist: 'bossKitIds'")
      && designerJs.includes('weaponIdOptions'),
    'Act2 designer.js: state.acts + export nested + first-visit seeds + renderActs + kit/weapon datalist',
  );
  const schema = JSON.parse(
    readFileSync(resolve('dlc-server/public/assets/designer-schema.json'), 'utf8'),
  ) as {
    acts?: {
      poolFields?: unknown[];
      beatFields?: unknown[];
      tints?: string[];
      beatWhen?: string[];
      note?: string;
    };
    coreWeaponIds?: string[];
    coreBossKitIds?: string[];
    note?: string;
  };
  ok(Array.isArray(schema.acts?.poolFields) && (schema.acts!.poolFields!.length >= 8), 'Act2 schema acts.poolFields >= 8');
  ok(Array.isArray(schema.acts?.beatFields) && (schema.acts!.beatFields!.length >= 5), 'Act2 schema acts.beatFields >= 5');
  ok(Array.isArray(schema.acts?.tints) && schema.acts!.tints!.length === 4, 'Act2 schema acts.tints === 4');
  ok(Array.isArray(schema.acts?.beatWhen) && schema.acts!.beatWhen!.includes('betweenActs'), 'Act2 schema beatWhen locks betweenActs');
  ok(Array.isArray(schema.coreWeaponIds) && schema.coreWeaponIds!.length === 14, 'Act2 schema coreWeaponIds === 14');
  ok(typeof schema.note === 'string' && schema.note.includes('Act2') && !schema.note.includes('不开 acts'), 'Act2 schema note mentions Act2');
  const html = readFileSync(resolve('dlc-server/public/designer.html'), 'utf8');
  ok(
    html.includes('id="panel-acts"')
      && html.includes('data-panel="acts"')
      && html.includes('data-wizard="acts"')
      && html.includes('id="editor-act-pools"')
      && html.includes('id="editor-act-beats"')
      && html.includes('与「关卡浪次」分栏'),
    'Act2 designer.html: acts panel/tab/wizard separate from stages',
  );
  // export keys: stages then nested acts (not Catalog array in keys list)
  const keysSlice = designerJs.slice(
    designerJs.indexOf('function buildContentExport'),
    designerJs.indexOf('function buildContentExport') + 3200,
  );
  ok(keysSlice.includes("'stages'") && keysSlice.includes('c.acts'), 'Act2 export: stages + nested c.acts');
  ok(!/add\(['"]acts['"]/.test(designerJs), 'Act2 designer never add(acts)');

  // 与设计台首访样例同构 → applyContent
  const loreBefore = actPool(0).loreLine;
  const kitBefore2 = actPool(0).kit;
  const beatBefore = getBetweenActBeat(0)?.title;
  const body: DlcContentBody = {
    bossKits: [{
      id: 'demo_yexun',
      close: [
        { move: 'claw', weight: 3 }, { move: 'slam', weight: 5 },
        { move: 'sweep', weight: 1.5 }, { move: 'roar', weight: 1.4 },
      ],
      far: [
        { move: 'fireball', weight: 2 }, { move: 'dive', weight: 2 },
        { move: 'slam', weight: 3 }, { move: 'inkNova', weight: 1.2 }, { move: 'walk', weight: 1 },
      ],
    }],
    acts: {
      pools: [{
        actIndex: 0,
        kit: 'demo_yexun',
        tint: 'jade',
        eliteWeights: { tongpi: 2, shanbu: 5, zhongji: 1, fanshang: 1, shixue: 1, xiehuo: 1 },
        dropLean: ['iron', 'bone', 'hide'],
        blueprintLean: ['silver', 'thorn'],
        setLean: ['tiegu', 'yingzhi'],
        loreLine: '设计台试笔·山门新钟。',
      }],
      beats: [{
        fromAct: 0,
        id: 'betweenActs.demo.1to2',
        when: 'betweenActs',
        title: '试笔幕间',
        subtitle: '设计台试灌 betweenActs',
        holdFrames: 120,
        slowmo: 0.5,
      }],
    },
  };
  const act2Fork = game.plugin({
    name: 'dlc-designer-smoke-acts',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(actPool(0).loreLine === '设计台试笔·山门新钟。', 'Act2 designer-shaped: actPool(0).loreLine');
  ok(
    (actPool(0).eliteWeights as Record<string, number>).shanbu === 5,
    'Act2 designer-shaped: actPool(0).eliteWeights.shanbu === 5',
  );
  ok(actPool(0).kit === 'demo_yexun', 'Act2 designer-shaped: actPool(0).kit === demo_yexun (open string)');
  ok(!!getBossKit('demo_yexun'), 'Act2 designer-shaped: bossKit demo_yexun registered');
  const beatDemo = getBetweenActBeat(0);
  ok(
    !!beatDemo && beatDemo.id === 'betweenActs.demo.1to2' && beatDemo.title === '试笔幕间',
    'Act2 designer-shaped: getBetweenActBeat(0) has demo betweenActs',
  );
  ok(beatDemo!.when === 'betweenActs', 'Act2 designer-shaped: beat when === betweenActs');
  act2Fork.dispose();
  ok(
    actPool(0).loreLine === loreBefore
      && actPool(0).kit === kitBefore2
      && getBetweenActBeat(0)?.title === beatBefore
      && !getBossKit('demo_yexun'),
    'Act2 designer acts smoke unload restores 官方包 pool/beat + drops demo kit',
  );
}

// Act3: Remote alone — xinzhong seed content.json（只 acts；enable 后开幕 lore/精英偏可辨）
{
  const body = JSON.parse(
    readFileSync(resolve('dlc-server/packages/xinzhong/content.json'), 'utf8'),
  ) as DlcContentBody;
  ok(!!body.acts?.pools?.length && !!body.acts?.beats?.length, 'Act3 remote seed has acts.pools+beats');
  ok(
    body.acts!.pools![0]!.loreLine === '新钟初鸣，山门石兽侧耳。闪步客影偏多。'
      && (body.acts!.pools![0]!.eliteWeights as Record<string, number>).shanbu === 8,
    'Act3 remote seed lore+shanbu distinguishable',
  );
  ok(
    Object.keys(body).length === 1 && Object.keys(body)[0] === 'acts',
    'Act3 remote seed alone: only acts key (no stages/enemies)',
  );
  const loreBefore = actPool(0).loreLine;
  const shanbuBefore = (actPool(0).eliteWeights as Record<string, number>).shanbu ?? 0;
  const beatBefore = getBetweenActBeat(0)?.title;
  const stage0Id = getChapter(0).id;
  const stage0Len = getChapter(0).length;
  const remoteFork = game.plugin({
    name: 'dlc-remote-smoke-xinzhong',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(actPool(0).loreLine === '新钟初鸣，山门石兽侧耳。闪步客影偏多。', 'Act3 remote alone: actPool(0).loreLine');
  ok(
    (actPool(0).eliteWeights as Record<string, number>).shanbu === 8,
    'Act3 remote alone: eliteWeights.shanbu === 8',
  );
  const beatXz = getBetweenActBeat(0);
  ok(
    !!beatXz && beatXz.id === 'betweenActs.xinzhong.1to2' && beatXz.title === '钟声未歇…',
    'Act3 remote alone: getBetweenActBeat(0)',
  );
  ok(
    getChapter(0).id === stage0Id && getChapter(0).length === stage0Len,
    'Act3 remote alone: stages geometry unchanged',
  );
  remoteFork.dispose();
  ok(
    actPool(0).loreLine === loreBefore
      && (actPool(0).eliteWeights as Record<string, number>).shanbu === shanbuBefore
      && getBetweenActBeat(0)?.title === beatBefore,
    'Act3 remote alone unload restores 官方包 pool/beat',
  );
}

// D5: Remote alone — canye seed content.json（eliteMods+fragments+armorSets）
{
  const body = JSON.parse(
    readFileSync(resolve('dlc-server/packages/canye/content.json'), 'utf8'),
  ) as DlcContentBody;
  ok(Array.isArray(body.armorSets) && Array.isArray(body.eliteMods) && Array.isArray(body.fragments),
    'D5 remote seed has armorSets+eliteMods+fragments');
  ok(
    body.eliteMods!.some((r: any) => r.id === 'canye_tongpi' && r.dmgTakenMul === 0.78)
      && body.fragments!.some((r: any) => r.id === 'canye_lieqi' && r.skillDmgMul === 1.12)
      && body.armorSets!.some((r: any) => r.id === 'canye_yexing' && r.two?.dashCdMul === 0.90),
    'D5 remote seed values distinguishable',
  );
  const keys = Object.keys(body);
  ok(
    keys[0] === 'armorSets' && keys.includes('eliteMods') && keys.includes('fragments')
      && keys.length === 3,
    'D5 remote seed alone: armorSets→eliteMods→fragments',
  );
  const remoteFork = game.plugin({
    name: 'dlc-remote-smoke-canye',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  const em = getEliteMod('canye_tongpi');
  ok(!!em && em.dmgTakenMul === 0.78, 'D5 remote alone: getEliteMod(canye_tongpi)');
  const fr = getFragment('canye_lieqi');
  ok(!!fr && fr.skillDmgMul === 1.12, 'D5 remote alone: getFragment(canye_lieqi)');
  const as = getArmorSet('canye_yexing');
  ok(!!as && as.two?.dashCdMul === 0.90 && as.full?.dashIframes === 4,
    'D5 remote alone: getArmorSet(canye_yexing)');
  ok(
    em!.dmgTakenMul !== ELITE_MOD_BY_ID['tongpi']!.dmgTakenMul
      && fr!.skillDmgMul !== FRAGMENT_BY_ID['lieqi']!.skillDmgMul
      && as!.two!.dashCdMul !== ARMOR_SET_BY_ID['yexing']!.two!.dashCdMul,
    'D5 remote alone: canye 可辨于核心 tongpi/lieqi/yexing',
  );
  remoteFork.dispose();
  ok(!getEliteMod('canye_tongpi') && !getFragment('canye_lieqi') && !getArmorSet('canye_yexing'),
    'D5 remote alone unload clears canye ids');
}

// R1: Remote DLC applyContent — projectiles/volleys/sheets/sfx/backdrops
{
  ok(
    REMOTE_DLC_INJECT.indexOf('sheets') >= 0
      && REMOTE_DLC_INJECT.indexOf('sfx') >= 0
      && REMOTE_DLC_INJECT.indexOf('projectiles') >= 0
      && REMOTE_DLC_INJECT.indexOf('volleys') >= 0
      && REMOTE_DLC_INJECT.indexOf('backdrops') >= 0
      && REMOTE_DLC_INJECT.indexOf('projectiles') < REMOTE_DLC_INJECT.indexOf('volleys')
      && REMOTE_DLC_INJECT.indexOf('projectiles') < REMOTE_DLC_INJECT.indexOf('behaviors')
      && REMOTE_DLC_INJECT.indexOf('volleys') < REMOTE_DLC_INJECT.indexOf('behaviors')
      && REMOTE_DLC_INJECT.indexOf('sheets') < REMOTE_DLC_INJECT.indexOf('weapons')
      && REMOTE_DLC_INJECT.indexOf('sfx') < REMOTE_DLC_INJECT.indexOf('weapons')
      && REMOTE_DLC_INJECT.indexOf('backdrops') < REMOTE_DLC_INJECT.indexOf('stages'),
    'REMOTE_DLC_INJECT: R1 sheets/sfx/projectiles/volleys/backdrops order',
  );
  const body: DlcContentBody = {
    projectiles: [{
      id: 'ink_arrow',
      drawKind: 'arrow',
      hitW: 32,
      hitH: 10,
      life: 280,
      hitSfx: 'arrow',
    }],
    volleys: [{
      id: 'slow_thunder',
      style: 'thunder',
      defaultCount: 3,
      defaultInterval: 18,
      defaultSpread: 180,
      color: '#ffe080',
    }],
    sheets: [{
      id: 'remote_blade_alias',
      src: './art/weapons/blade_ink.png',
      frameW: 64,
      frameH: 32,
      frames: 3,
      maxBytes: 512000,
    }],
    sfx: [{
      id: 'remote_ink_slash',
      synth: 'slash',
    }],
    backdrops: [{
      id: 'remote_eclipse_tint',
      theme: 'eclipse',
      skyTint: '#1a1028',
      label: '蚀月墨晕',
    }],
    behaviors: [{
      id: 'remote_ink_archer',
      body: 'archer',
      label: '墨箭试射',
      steps: [
        { kind: 'facePlayer' },
        {
          kind: 'rangedAttack',
          projectileId: 'ink_arrow',
          rangeMin: 190,
          rangeMax: 600,
          weight: 2.0,
          cooldown: 70,
          aimFrames: 30,
        },
      ],
    }],
    talismanScripts: [{
      id: 'remoteSlowThunder',
      steps: [
        { kind: 'sfx', id: 'remote_ink_slash' },
        {
          kind: 'spawnVolley',
          volleyId: 'slow_thunder',
          count: 3,
          interval: 18,
          damage: 8,
          spread: 180,
        },
      ],
    }],
  };
  const remoteR1Fork = game.plugin({
    name: 'dlc-remote-smoke-R1-assets',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  const ink = getProjectile('ink_arrow');
  ok(!!ink && ink.drawKind === 'arrow', 'R1 remote applyContent: getProjectile(ink_arrow) drawKind arrow');
  ok(ink!.hitW === 32 && ink!.hitH === 10, 'R1 remote applyContent: ink_arrow hit box');
  const slow = getVolley('slow_thunder');
  ok(!!slow && slow.style === 'thunder', 'R1 remote applyContent: getVolley(slow_thunder) style thunder');
  ok(slow!.defaultInterval === 18, 'R1 remote applyContent: slow_thunder defaultInterval 18');
  ok(getSfxDef('remote_ink_slash')?.synth === 'slash', 'R1 remote applyContent: getSfxDef synth alias');
  ok(getSheet('remote_blade_alias')?.src === './art/weapons/blade_ink.png', 'R1 remote applyContent: getSheet alias → blade_ink.png');
  const bd = getBackdrop('remote_eclipse_tint');
  ok(!!bd && bd.theme === 'eclipse' && bd.skyTint === '#1a1028', 'R1 remote applyContent: getBackdrop theme+skyTint');
  const bh = getBehavior('remote_ink_archer');
  ok(!!bh?.steps?.some((s: any) => s.kind === 'rangedAttack' && s.projectileId === 'ink_arrow'), 'R1 remote: behavior projectileId ink_arrow present');
  ok(!!getProjectile((bh!.steps!.find((s: any) => s.kind === 'rangedAttack') as any).projectileId), 'R1 remote: behavior projectileId resolves (no missing)');
  const script = getTalismanScript('remoteSlowThunder');
  ok(!!script?.steps?.some((s: any) => s.kind === 'spawnVolley' && s.volleyId === 'slow_thunder'), 'R1 remote: script spawnVolley.volleyId present');
  const volleyStep = script!.steps!.find((s: any) => s.kind === 'spawnVolley') as any;
  ok(!!getVolley(volleyStep.volleyId), 'R1 remote: spawnVolley.volleyId resolves (no missing)');
  const sfxStep = script!.steps!.find((s: any) => s.kind === 'sfx') as any;
  ok(!!getSfxDef(sfxStep.id), 'R1 remote: script sfx id resolves');
  remoteR1Fork.dispose();
  ok(
    !getProjectile('ink_arrow')
      && !getVolley('slow_thunder')
      && !getSfxDef('remote_ink_slash')
      && !getSheet('remote_blade_alias')
      && !getBackdrop('remote_eclipse_tint')
      && !getBehavior('remote_ink_archer')
      && !getTalismanScript('remoteSlowThunder'),
    'R1 remote assets smoke unload clean',
  );
}

// G2: 设计台导出键 + 首访样例形状可被 applyContent 吃
{
  const designerJs = readFileSync(resolve('dlc-server/public/assets/designer.js'), 'utf8');
  ok(
    /['"]bossMoves['"]/.test(designerJs) && /['"]bossKits['"]/.test(designerJs)
      && designerJs.includes('buildContentExport')
      && designerJs.includes('demo_slam_heavy')
      && designerJs.includes('demo_yexun'),
    'G2 designer.js: export keys + first-visit seeds (demo_slam_heavy / demo_yexun)',
  );
  const schema = JSON.parse(
    readFileSync(resolve('dlc-server/public/assets/designer-schema.json'), 'utf8'),
  ) as { bossMoves?: { defFields?: unknown[] }; bossKits?: { defFields?: unknown[] }; bossMoveKinds?: string[] };
  ok(Array.isArray(schema.bossMoves?.defFields) && (schema.bossMoves!.defFields!.length >= 3), 'G2 schema bossMoves.defFields');
  ok(Array.isArray(schema.bossKits?.defFields), 'G2 schema bossKits.defFields');
  ok(Array.isArray(schema.bossMoveKinds) && schema.bossMoveKinds!.length === 10, 'G2 schema bossMoveKinds === 10');
  // 与设计台首访种子同构 → applyContent
  const body: DlcContentBody = {
    bossMoves: [{
      id: 'demo_slam_heavy',
      kind: 'slam',
      label: '重震',
      radius: 220,
      damage: 24,
      hitstop: 12,
    }],
    bossKits: [{
      id: 'demo_yexun',
      close: [
        { move: 'claw', weight: 3 },
        { move: 'demo_slam_heavy', weight: 5 },
        { move: 'sweep', weight: 1.5 },
        { move: 'roar', weight: 1.4 },
      ],
      far: [
        { move: 'fireball', weight: 2 },
        { move: 'dive', weight: 2 },
        { move: 'demo_slam_heavy', weight: 3 },
        { move: 'inkNova', weight: 1.2 },
        { move: 'walk', weight: 1 },
      ],
    }],
  };
  const g2Fork = game.plugin({
    name: 'dlc-designer-smoke-bossKits',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(getBossMove('demo_slam_heavy')?.kind === 'slam' && getBossMove('demo_slam_heavy')!.radius === 220,
    'G2 designer-shaped export: applyContent getBossMove(demo_slam_heavy)');
  const kit = getBossKit('demo_yexun');
  ok(!!kit?.close.some((w) => w.move === 'demo_slam_heavy' && w.weight === 5),
    'G2 designer-shaped export: applyContent kit close includes demo_slam_heavy');
  g2Fork.dispose();
  ok(!getBossMove('demo_slam_heavy') && !getBossKit('demo_yexun'), 'G2 designer bossKits smoke unload clean');
}

// 债 #10: BossKit add soft-filters move ∉ bossMoves（warn + drop；合法 kit 不受影响）
{
  const stone = getBossKit('stone');
  ok(!!stone && stone.close.some((w) => w.move === 'claw') && stone.far.some((w) => w.move === 'walk'),
    '债#10: 官方包 stone kit untouched (claw/walk present)');
  const mixed = game.plugin({
    name: 'bosskit-move-validate-mixed',
    inject: ['bossKits'],
    apply(ctx) {
      ctx.bossKits.add({
        id: 'kit_bad_move_mix',
        close: [
          { move: 'claw', weight: 4 },
          { move: 'no_such_boss_move_xyz', weight: 99 },
        ],
        far: [
          { move: 'walk', weight: 2 },
          { move: 'also_missing_move_abc', weight: 7 },
        ],
      });
    },
  });
  const kit = getBossKit('kit_bad_move_mix');
  ok(!!kit, '债#10: kit with mixed moves still registers');
  ok(!!kit && kit.close.length === 1 && kit.close[0]!.move === 'claw' && kit.close[0]!.weight === 4,
    '债#10: invalid close move filtered; claw kept');
  ok(!!kit && kit.far.length === 1 && kit.far[0]!.move === 'walk',
    '债#10: invalid far move filtered; walk kept');
  ok(!!kit && !kit.close.some((w) => w.move === 'no_such_boss_move_xyz')
    && !kit.far.some((w) => w.move === 'also_missing_move_abc'),
    '债#10: missing move ids absent from stored weights');
  const wClose = bossMoveWeights('kit_bad_move_mix', true, true);
  ok(wClose.some(([m]) => m === 'claw') && !wClose.some(([m]) => m === 'no_such_boss_move_xyz'),
    '债#10: bossMoveWeights only sees filtered close');
  mixed.dispose();
  ok(!getBossKit('kit_bad_move_mix'), '债#10: mixed kit unload clean');

  const allBad = game.plugin({
    name: 'bosskit-move-validate-allbad',
    inject: ['bossKits'],
    apply(ctx) {
      ctx.bossKits.add({
        id: 'kit_all_bad_moves',
        close: [{ move: 'totally_fake_move_1', weight: 1 }],
        far: [{ move: 'totally_fake_move_2', weight: 1 }],
      });
    },
  });
  const emptyKit = getBossKit('kit_all_bad_moves');
  ok(!!emptyKit && emptyKit.close.length === 0 && emptyKit.far.length === 0,
    '债#10: all-invalid moves → kit kept with empty tables');
  const fallback = bossMoveWeights('kit_all_bad_moves', true, true);
  ok(fallback.length === 1 && fallback[0]![0] === 'walk',
    '债#10: empty kit weights → walk fallback (no crash)');
  allBad.dispose();
  ok(!getBossKit('kit_all_bad_moves'), '债#10: all-bad kit unload clean');

  const legal = game.plugin({
    name: 'bosskit-move-validate-legal',
    inject: ['bossKits'],
    apply(ctx) {
      ctx.bossKits.add({
        id: 'kit_legal_only',
        close: [{ move: 'slam', weight: 3 }, { move: 'claw', weight: 2 }],
        far: [{ move: 'fireball', weight: 2 }, { move: 'dive', weight: 1 }],
      });
    },
  });
  const okKit = getBossKit('kit_legal_only');
  ok(!!okKit && okKit.close.length === 2 && okKit.far.length === 2,
    '债#10: all-valid kit unchanged length');
  ok(!!okKit && okKit.close[0]!.move === 'slam' && okKit.far[0]!.move === 'fireball',
    '债#10: all-valid kit preserves order/ids');
  legal.dispose();
  ok(!getBossKit('kit_legal_only'), '债#10: legal kit unload clean');
}

// D1: 设计台导出键 + 首访样例形状可被 applyContent 吃（eliteMods + fragments + titles）
{
  const designerJs = readFileSync(resolve('dlc-server/public/assets/designer.js'), 'utf8');
  ok(
    /['"]eliteMods['"]/.test(designerJs) && /['"]fragments['"]/.test(designerJs) && /['"]titles['"]/.test(designerJs)
      && designerJs.includes('buildContentExport')
      && designerJs.includes('demo_tongpi_lite')
      && designerJs.includes('demo_lieqi_lite')
      && designerJs.includes('demo_wushang_lite')
      && designerJs.includes('eliteModIds'),
    'D1 designer.js: export keys + first-visit seeds + eliteWeight datalist',
  );
  const schema = JSON.parse(
    readFileSync(resolve('dlc-server/public/assets/designer-schema.json'), 'utf8'),
  ) as {
    eliteMods?: { defFields?: unknown[] };
    fragments?: { defFields?: unknown[] };
    titles?: { defFields?: unknown[] };
    fragmentTags?: string[];
    coreEliteModIds?: string[];
  };
  ok(Array.isArray(schema.eliteMods?.defFields) && (schema.eliteMods!.defFields!.length >= 4), 'D1 schema eliteMods.defFields');
  ok(Array.isArray(schema.fragments?.defFields) && (schema.fragments!.defFields!.length >= 6), 'D1 schema fragments.defFields');
  ok(Array.isArray(schema.titles?.defFields) && (schema.titles!.defFields!.length >= 4), 'D1 schema titles.defFields');
  ok(Array.isArray(schema.fragmentTags) && schema.fragmentTags!.length === 5, 'D1 schema fragmentTags === 5 (闭集未扩)');
  ok(Array.isArray(schema.coreEliteModIds) && schema.coreEliteModIds!.length === 6, 'D1 schema coreEliteModIds === 6');
  // 与设计台首访种子同构 → applyContent
  const body: DlcContentBody = {
    eliteMods: [{
      id: 'demo_tongpi_lite',
      name: '试笔薄铜',
      color: '#c8a878',
      tag: '薄铜',
      dmgTakenMul: 0.78,
    }],
    fragments: [{
      id: 'demo_lieqi_lite',
      name: '试笔裂气',
      fogName: '残页·??',
      desc: '外功伤害略升',
      color: '#ff9080',
      tag: 'qi',
      skillDmgMul: 1.12,
    }],
    titles: [{
      id: 'demo_wushang_lite',
      name: '试笔无伤',
      desc: '设计台试笔：整次出征未受伤',
      qol: '开局丹药 +1',
      startPotions: 1,
    }],
  };
  const d1Fork = game.plugin({
    name: 'dlc-designer-smoke-eliteMods-fragments-titles',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  const em = getEliteMod('demo_tongpi_lite');
  ok(!!em && em.dmgTakenMul === 0.78 && em.tag === '薄铜',
    'D1 designer-shaped export: applyContent getEliteMod(demo_tongpi_lite)');
  const fr = getFragment('demo_lieqi_lite');
  ok(!!fr && fr.tag === 'qi' && fr.skillDmgMul === 1.12,
    'D1 designer-shaped export: applyContent getFragment(demo_lieqi_lite)');
  const ti = getTitle('demo_wushang_lite');
  ok(!!ti && ti.startPotions === 1,
    'D1 designer-shaped export: applyContent getTitle(demo_wushang_lite)');
  d1Fork.dispose();
  ok(!getEliteMod('demo_tongpi_lite') && !getFragment('demo_lieqi_lite') && !getTitle('demo_wushang_lite'),
    'D1 designer eliteMods/fragments/titles smoke unload clean');
}

// D2: 设计台导出键 + 首访样例形状可被 applyContent 吃（materials + armorSets + armorPieces + wepAffixes）
{
  const designerJs = readFileSync(resolve('dlc-server/public/assets/designer.js'), 'utf8');
  ok(
    /['"]materials['"]/.test(designerJs) && /['"]armorSets['"]/.test(designerJs)
      && /['"]armorPieces['"]/.test(designerJs) && /['"]wepAffixes['"]/.test(designerJs)
      && designerJs.includes('buildContentExport')
      && designerJs.includes('demo_yantie')
      && designerJs.includes('demo_yexing_lite')
      && designerJs.includes('demo_buyi_lite')
      && designerJs.includes('demo_poshi_lite')
      && designerJs.includes('materialIds')
      && designerJs.indexOf("'armorSets'") < designerJs.indexOf("'armorPieces'"),
    'D2 designer.js: export keys + first-visit seeds + materialIds + armorSets before armorPieces',
  );
  const schema = JSON.parse(
    readFileSync(resolve('dlc-server/public/assets/designer-schema.json'), 'utf8'),
  ) as {
    materials?: { defFields?: unknown[] };
    armorSets?: { defFields?: unknown[] };
    armorPieces?: { defFields?: unknown[] };
    wepAffixes?: { defFields?: unknown[] };
    armorSlots?: string[];
    coreMaterialIds?: string[];
    coreArmorSetIds?: string[];
  };
  ok(Array.isArray(schema.materials?.defFields) && (schema.materials!.defFields!.length >= 4), 'D2 schema materials.defFields');
  ok(Array.isArray(schema.armorSets?.defFields) && (schema.armorSets!.defFields!.length >= 8), 'D2 schema armorSets.defFields');
  ok(Array.isArray(schema.armorPieces?.defFields) && (schema.armorPieces!.defFields!.length >= 6), 'D2 schema armorPieces.defFields');
  ok(Array.isArray(schema.wepAffixes?.defFields) && (schema.wepAffixes!.defFields!.length >= 4), 'D2 schema wepAffixes.defFields');
  ok(Array.isArray(schema.armorSlots) && schema.armorSlots!.length === 7, 'D2 schema armorSlots === 7 (闭集未扩)');
  ok(Array.isArray(schema.coreMaterialIds) && schema.coreMaterialIds!.length === 10, 'D2 schema coreMaterialIds === 10');
  ok(Array.isArray(schema.coreArmorSetIds) && schema.coreArmorSetIds!.length === 7, 'D2 schema coreArmorSetIds === 7');
  const html = readFileSync(resolve('dlc-server/public/designer.html'), 'utf8');
  ok(
    html.includes('value="materials"') && html.includes('value="armorSets"')
      && html.includes('value="armorPieces"') && html.includes('value="wepAffixes"'),
    'D2 designer.html: gameplay options materials/armorSets/armorPieces/wepAffixes',
  );
  // 与设计台首访种子同构 → applyContent（armorSets 先于 armorPieces）
  const body: DlcContentBody = {
    materials: [{
      id: 'demo_yantie',
      name: '试笔夜铁',
      lore: '夜色中冷淬的碎铁，锻兵可试。',
      weight: 9,
      rare: true,
    }],
    armorSets: [{
      id: 'demo_yexing_lite',
      fogName: '套装·夜??',
      name: '试笔夜行',
      lore: '踏影略轻，气机微灵。',
      slots: ['legs', 'arms', 'waist', 'neck'],
      weight: 12,
      two: { dashCdMul: 0.94, rage: 0.02 },
      full: { dashCdMul: 0.88, dashIframes: 2, rage: 0.04 },
      twoTip: '闪身冷却略缩短 · 气势微增',
      fullTip: '闪身更快 · 无敌略增 · 气势回复',
    }],
    armorPieces: [{
      id: 'demo_buyi_lite',
      name: '试笔布衣',
      slot: 'body',
      lore: '粗布短褐，聊胜于无。',
      base: { hp: 8, def: 1 },
      weight: 12,
      common: true,
      quality: 'fan',
      tier: 1,
    }],
    wepAffixes: [{
      id: 'demo_poshi_lite',
      name: '试笔破势',
      fogName: '词缀·??',
      tip: '破韧 +12%',
      poiseMul: 1.12,
    }],
  };
  const d2Fork = game.plugin({
    name: 'dlc-designer-smoke-materials-armor-wepAffixes',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  const mat = getMaterial('demo_yantie');
  ok(!!mat && mat.weight === 9 && mat.rare === true,
    'D2 designer-shaped export: applyContent getMaterial(demo_yantie)');
  const aset = getArmorSet('demo_yexing_lite');
  ok(!!aset && Array.isArray(aset.slots) && aset.slots.length === 4 && aset.two?.dashCdMul === 0.94,
    'D2 designer-shaped export: applyContent getArmorSet(demo_yexing_lite)');
  const apiece = getArmorPiece('demo_buyi_lite');
  ok(!!apiece && apiece.slot === 'body' && apiece.base?.hp === 8,
    'D2 designer-shaped export: applyContent getArmorPiece(demo_buyi_lite)');
  const wa = getWepAffix('demo_poshi_lite');
  ok(!!wa && wa.poiseMul === 1.12,
    'D2 designer-shaped export: applyContent getWepAffix(demo_poshi_lite)');
  d2Fork.dispose();
  ok(!getMaterial('demo_yantie') && !getArmorSet('demo_yexing_lite')
    && !getArmorPiece('demo_buyi_lite') && !getWepAffix('demo_poshi_lite'),
    'D2 designer materials/armor/wepAffixes smoke unload clean');
}



// D3: 设计台导出键 + 首访样例形状可被 applyContent 吃（affixes 场地词缀）
{
  const designerJs = readFileSync(resolve('dlc-server/public/assets/designer.js'), 'utf8');
  ok(
    /['"]affixes['"]/.test(designerJs)
      && designerJs.includes('buildContentExport')
      && designerJs.includes('demo_mandu_lite')
      && designerJs.includes('affixIdOptions')
      && designerJs.includes("datalist: 'affixIds'"),
    'D3 designer.js: export keys + first-visit seed + affixIds datalist',
  );
  const schema = JSON.parse(
    readFileSync(resolve('dlc-server/public/assets/designer-schema.json'), 'utf8'),
  ) as {
    affixes?: { defFields?: unknown[] };
    coreAffixIds?: string[];
    stages?: { arenaFields?: Array<{ key?: string; datalist?: string }> };
  };
  ok(Array.isArray(schema.affixes?.defFields) && (schema.affixes!.defFields!.length >= 10), 'D3 schema affixes.defFields');
  ok(Array.isArray(schema.coreAffixIds) && schema.coreAffixIds!.length === 7, 'D3 schema coreAffixIds === 7');
  const bias = (schema.stages?.arenaFields || []).find((f) => f.key === 'affixBias');
  ok(!!bias && bias.datalist === 'affixIds', 'D3 schema affixBias → datalist affixIds');
  const html = readFileSync(resolve('dlc-server/public/designer.html'), 'utf8');
  ok(
    html.includes('value="affixes"') || html.includes("value='affixes'"),
    'D3 designer.html: gameplay option affixes',
  );
  // export keys near buildContentExport（与 remote wepAffixes→affixes 同构）
  const keysSlice = designerJs.slice(designerJs.indexOf('function buildContentExport'), designerJs.indexOf('function buildContentExport') + 2200);
  ok(keysSlice.includes("'wepAffixes'") && keysSlice.includes("'affixes'"), 'D3 export keys include wepAffixes+affixes');
  const body: DlcContentBody = {
    affixes: [
      {
        id: 'demo_mandu_lite',
        name: '试笔慢毒',
        fogName: '??·雾',
        desc: '毒雾更缓，蚀骨略轻',
        color: '#70c060',
        primaryWeight: 3,
        secondaryWeight: 1,
        dotPeriod: 120,
        dotDamage: 1,
        dotFloatEvery: 2,
        evolveTo: 'zhanghai',
        evolveAfter: 60 * 90,
        evolveBannerTitle: '词缀演化',
        evolveBannerSub: '慢毒 → 瘴海',
      },
    ],
  };
  const d3Fork = game.plugin({
    name: 'dlc-designer-smoke-affixes',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  const af = getAffix('demo_mandu_lite');
  ok(!!af && af.dotPeriod === 120 && af.dotDamage === 1 && af.evolveTo === 'zhanghai',
    'D3 designer-shaped export: applyContent getAffix(demo_mandu_lite)');
  d3Fork.dispose();
  ok(!getAffix('demo_mandu_lite'),
    'D3 designer affixes smoke unload clean');
}


// D4: 设计台导出键 + 首访样例形状可被 applyContent 吃（pills + neigong）
{
  const designerJs = readFileSync(resolve('dlc-server/public/assets/designer.js'), 'utf8');
  ok(
    /['"]pills['"]/.test(designerJs) && /['"]neigong['"]/.test(designerJs)
      && designerJs.includes('buildContentExport')
      && designerJs.includes('demo_huixue_lite')
      && designerJs.includes('demo_hunyuan_lite')
      && designerJs.includes('numberList'),
    'D4 designer.js: export keys + first-visit seeds + numberList',
  );
  const schema = JSON.parse(
    readFileSync(resolve('dlc-server/public/assets/designer-schema.json'), 'utf8'),
  ) as {
    pills?: { defFields?: unknown[] };
    neigong?: { defFields?: unknown[] };
    corePillIds?: string[];
    coreNeigongIds?: string[];
    pillAuraPresets?: string[];
    pillSfxKinds?: string[];
  };
  ok(Array.isArray(schema.pills?.defFields) && (schema.pills!.defFields!.length >= 20), 'D4 schema pills.defFields');
  ok(Array.isArray(schema.neigong?.defFields) && (schema.neigong!.defFields!.length >= 12), 'D4 schema neigong.defFields');
  ok(Array.isArray(schema.corePillIds) && schema.corePillIds!.length === 14, 'D4 schema corePillIds === 14');
  ok(Array.isArray(schema.coreNeigongIds) && schema.coreNeigongIds!.length === 4, 'D4 schema coreNeigongIds === 4');
  ok(Array.isArray(schema.pillAuraPresets) && schema.pillAuraPresets!.length === 4, 'D4 schema pillAuraPresets === 4 (闭集未扩)');
  ok(Array.isArray(schema.pillSfxKinds) && schema.pillSfxKinds!.length === 2, 'D4 schema pillSfxKinds === 2 (闭集未扩)');
  const html = readFileSync(resolve('dlc-server/public/designer.html'), 'utf8');
  ok(
    (html.includes('value="pills"') || html.includes("value='pills'"))
      && (html.includes('value="neigong"') || html.includes("value='neigong'")),
    'D4 designer.html: gameplay options pills/neigong',
  );
  const keysSlice = designerJs.slice(designerJs.indexOf('function buildContentExport'), designerJs.indexOf('function buildContentExport') + 2400);
  ok(keysSlice.includes("'materials'") && keysSlice.includes("'pills'") && keysSlice.includes("'neigong'"), 'D4 export keys include materials+pills+neigong');
  ok(keysSlice.indexOf("'materials'") < keysSlice.indexOf("'pills'"), 'D4 materials before pills');
  const body: DlcContentBody = {
    pills: [
      {
        id: 'demo_huixue_lite',
        name: '试笔回血丹',
        lore: '温养气血，试笔一服。',
        tip: '出征：回复 40 生命',
        cost: { herb: 2, cinnabar: 1, silk: 1 },
        fee: 8,
        carryCap: 5,
        quality: 'fan',
        grade: 'xia',
        sortie: true,
        effect: {
          heal: 40,
          healWithFrag: true,
          floatText: '试笔回血',
          floatColor: '#ff6a7a',
          sfx: 'potion',
        },
      },
    ],
    neigong: [
      {
        id: 'demo_hunyuan_lite',
        name: '试笔混元功',
        lore: '丹田混元，试笔心法。',
        tip: '武功伤害与气势均衡提升 · 内力回复平稳',
        signature: '回内：内力回复平稳 · 满级处决伤 +10%',
        style: '均衡',
        meditateCost: { cinnabar: 2, herb: 2 },
        fee: 22,
        quality: 'fan',
        effects: {
          damageBonus: [0.06, 0.09, 0.12, 0.16, 0.20],
          rageBonus: [0.08, 0.11, 0.14, 0.18, 0.22],
          defBonus: [0.02, 0.03, 0.04, 0.05, 0.06],
          neiliRegenMul: [1.0, 1.05, 1.1, 1.15, 1.2],
          executeMulBonus: 0.1,
        },
      },
    ],
  };
  const d4Fork = game.plugin({
    name: 'dlc-designer-smoke-pills-neigong',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  const pill = getPill('demo_huixue_lite');
  ok(!!pill && pill.effect?.heal === 40 && pill.cost?.herb === 2 && pill.sortie === true,
    'D4 designer-shaped export: applyContent getPill(demo_huixue_lite)');
  const ng = getNeigong('demo_hunyuan_lite');
  ok(!!ng && ng.effects?.damageBonus?.[4] === 0.20 && ng.effects?.executeMulBonus === 0.1 && ng.meditateCost?.cinnabar === 2,
    'D4 designer-shaped export: applyContent getNeigong(demo_hunyuan_lite)');
  d4Fork.dispose();
  ok(!getPill('demo_huixue_lite') && !getNeigong('demo_hunyuan_lite'),
    'D4 designer pills/neigong smoke unload clean');
}



// R2: 设计台导出键 + 首访样例形状可被 applyContent 吃（projectiles + volleys）
{
  const designerJs = readFileSync(resolve('dlc-server/public/assets/designer.js'), 'utf8');
  ok(
    /['"]projectiles['"]/.test(designerJs) && /['"]volleys['"]/.test(designerJs)
      && designerJs.includes('buildContentExport')
      && designerJs.includes('demo_ink_arrow')
      && designerJs.includes('demo_slow_thunder'),
    'R2 designer.js: export keys + first-visit seeds (demo_ink_arrow / demo_slow_thunder)',
  );
  const schema = JSON.parse(
    readFileSync(resolve('dlc-server/public/assets/designer-schema.json'), 'utf8'),
  ) as {
    projectiles?: { defFields?: unknown[] };
    volleys?: { defFields?: unknown[] };
    projDrawKinds?: string[];
    volleyStyles?: string[];
  };
  ok(Array.isArray(schema.projectiles?.defFields) && (schema.projectiles!.defFields!.length >= 4), 'R2 schema projectiles.defFields');
  ok(Array.isArray(schema.volleys?.defFields) && (schema.volleys!.defFields!.length >= 2), 'R2 schema volleys.defFields');
  ok(Array.isArray(schema.projDrawKinds) && schema.projDrawKinds!.length === 2, 'R2 schema projDrawKinds === 2');
  ok(Array.isArray(schema.volleyStyles) && schema.volleyStyles!.length === 3, 'R2 schema volleyStyles === 3');
  // 与设计台首访种子同构 → applyContent
  const body: DlcContentBody = {
    projectiles: [{
      id: 'demo_ink_arrow',
      drawKind: 'arrow',
      hitW: 32,
      hitH: 8,
      life: 240,
      hitSfx: 'arrow',
    }],
    volleys: [{
      id: 'demo_slow_thunder',
      style: 'thunder',
      defaultCount: 4,
      defaultInterval: 18,
      defaultSpread: 200,
      color: '#ffe080',
    }],
  };
  const r2Fork = game.plugin({
    name: 'dlc-designer-smoke-projectiles-volleys',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  const ink = getProjectile('demo_ink_arrow');
  ok(!!ink && ink.drawKind === 'arrow' && ink.hitW === 32,
    'R2 designer-shaped export: applyContent getProjectile(demo_ink_arrow)');
  const slow = getVolley('demo_slow_thunder');
  ok(!!slow && slow.style === 'thunder' && slow.defaultInterval === 18,
    'R2 designer-shaped export: applyContent getVolley(demo_slow_thunder)');
  r2Fork.dispose();
  ok(!getProjectile('demo_ink_arrow') && !getVolley('demo_slow_thunder'), 'R2 designer projectiles/volleys smoke unload clean');
}

// ArrowProj2: 设计台投射物 attackKey 字段 + 导出形状 applyContent 不丢；moyu 示范已并入（见上）
{
  const designerJs = readFileSync(resolve('dlc-server/public/assets/designer.js'), 'utf8');
  ok(
    designerJs.includes("key: 'attackKey'")
      && /kind === 'projectiles'[\s\S]*?attackKey/.test(designerJs)
      && designerJs.includes('改伤害请挂攻击盒'),
    'ArrowProj2 designer.js: projectiles attackKey field + hint',
  );
  const schema = JSON.parse(
    readFileSync(resolve('dlc-server/public/assets/designer-schema.json'), 'utf8'),
  ) as { projectiles?: { defFields?: Array<{ key?: string; datalist?: string }> } };
  const ak = schema.projectiles?.defFields?.find((f) => f.key === 'attackKey');
  ok(!!ak && ak.datalist === 'coreAttackKeys', 'ArrowProj2 schema: projectiles.attackKey datalist=coreAttackKeys');
  // 设计台导出形状：带 attackKey 的投射物 + 自建盒 → applyContent 保留并可解析
  const body: DlcContentBody = {
    attacks: [{
      id: 'ap2_designer_shot', name: 'ap2_designer_shot',
      startup: 0, active: 1, recovery: 0, box: { x: 0, y: 0, w: 0, h: 0 },
      damage: 19, kbX: 7, kbY: 0, hitstun: 18, hitstop: 5, shake: 3, parryable: true,
    }],
    projectiles: [{
      id: 'ap2_designer_arrow',
      drawKind: 'arrow',
      hitW: 30,
      hitH: 9,
      life: 220,
      hitSfx: 'arrow',
      attackKey: 'ap2_designer_shot',
    }],
  };
  const ap2Fork = game.plugin({
    name: 'dlc-designer-smoke-arrowproj2',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(getProjectile('ap2_designer_arrow')?.attackKey === 'ap2_designer_shot',
    'ArrowProj2 designer-shaped export: attackKey preserved');
  ok(getAttackBox(getProjectile('ap2_designer_arrow')!.attackKey ?? 'arrow')?.damage === 19,
    'ArrowProj2 designer-shaped export: attackKey resolves ≠ 官方包 arrow');
  ap2Fork.dispose();
  ok(!getProjectile('ap2_designer_arrow') && !getAttackBox('ap2_designer_shot'),
    'ArrowProj2 designer smoke unload clean');
}

// ArrowProj3: Boss 火球 Def.attackKey→gFire；缺省路径恒等；可辨于核心箭
{
  const fb = getProjectile('fireball');
  ok(!!fb && fb.drawKind === 'fireball' && fb.attackKey === 'gFire',
    'ArrowProj3: CORE fireball 显式 attackKey=gFire');
  const viaDef = resolveProjectileAttackKey(fb, 'fireball');
  const softNoKey = resolveProjectileAttackKey(
    { id: 'ap3_soft_fb', drawKind: 'fireball', hitW: 28, hitH: 28, life: 240 },
    'fireball',
  );
  const softKindOnly = resolveProjectileAttackKey(undefined, 'fireball');
  ok(viaDef === 'gFire' && softNoKey === 'gFire' && softKindOnly === 'gFire',
    'ArrowProj3: 显式/soft 缺省路径恒等 → gFire');
  const gFire = getAttackBox('gFire');
  const arrow = getAttackBox('arrow');
  ok(!!gFire && gFire.damage === 12 && gFire.kbX === 5 && gFire.kbY === -3,
    'ArrowProj3: gFire 手感 bit-identical (12/5/-3)');
  ok(!!arrow && (gFire!.damage !== arrow.damage || gFire!.kbX !== arrow.kbX),
    'ArrowProj3: 火球伤/kb 可辨于默认箭 (12/5 ≠ 10/3)');
  ok(resolveProjectileAttackKey(getProjectile('arrow')) === 'arrow',
    'ArrowProj3: 未挂键箭仍回退 arrow');
  ok(resolveProjectileAttackKey({ id: 'ap3_plain', drawKind: 'arrow', hitW: 24, hitH: 8 }) === 'arrow',
    'ArrowProj3: drawKind:arrow 无 attackKey → arrow');
  ok(resolveProjectileAttackKey(
    { id: 'ap3_custom_fb', drawKind: 'fireball', hitW: 28, hitH: 28, attackKey: 'ap3_fb_shot' },
    'fireball',
  ) === 'ap3_fb_shot',
    'ArrowProj3: 显式 attackKey 优先于 soft gFire');
  ok(!!getProjectile('fireball') && !!getAttackBox('gFire') && !!getAttackBox('arrow') && !!getProjectile('arrow'),
    'ArrowProj3: 双目录 fireball/gFire + arrow 保留');
}

// hitSfx 命中消费：白名单 synth 替代 hit/hitHeavy；缺省 bit-identical；非法 soft-skip
{
  const coreA = getProjectile('arrow');
  ok(!!coreA && !coreA.hitSfx, 'hitSfx: CORE arrow 无 hitSfx（缺省 → 今日 hit/hitHeavy）');
  ok(resolveProjectileHitSfx(coreA) === undefined, 'hitSfx: CORE arrow resolve → undefined');
  ok(resolveProjectileHitSfx(getProjectile('fireball')) === undefined, 'hitSfx: CORE fireball 无 hitSfx');
  ok(resolveProjectileHitSfx({ id: 't', drawKind: 'arrow', hitW: 1, hitH: 1, hitSfx: 'arrow' }) === 'arrow',
    'hitSfx: 合法 synth id → arrow');
  ok(resolveProjectileHitSfx({ id: 't', drawKind: 'arrow', hitW: 1, hitH: 1, hitSfx: 'hitHeavy' }) === 'hitHeavy',
    'hitSfx: 可指向 hitHeavy synth');
  ok(resolveProjectileHitSfx({ id: 't', drawKind: 'arrow', hitW: 1, hitH: 1, hitSfx: 'no_such_sfx_xyz' }) === undefined,
    'hitSfx: 未知 id soft-skip');
  ok(resolveProjectileHitSfx({ id: 't', drawKind: 'arrow', hitW: 1, hitH: 1, hitSfx: '  ' }) === undefined,
    'hitSfx: 空白 → undefined');
  const plug = game.plugin({
    name: 'hitsfx-consume-test', inject: ['projectiles', 'sfx'],
    apply(ctx) {
      ctx.projectiles.add({
        id: 'hitsfx_demo_arrow', drawKind: 'arrow', hitW: 24, hitH: 8, life: 200,
        hitSfx: 'arrow',
      });
      ctx.sfx.add({ id: 'hitsfx_file_only', src: './art/audio/x.ogg', format: 'ogg' });
    },
  });
  ok(resolveProjectileHitSfx(getProjectile('hitsfx_demo_arrow')) === 'arrow',
    'hitSfx: 自建箭挂 arrow 可解析（替代路径）');
  ok(resolveProjectileHitSfx({ id: 't', drawKind: 'arrow', hitW: 1, hitH: 1, hitSfx: 'hitsfx_file_only' }) === undefined,
    'hitSfx: 仅 src 无 buffer → soft-skip（R4a 回退今日）');
  // Inject fake buffer → file-only becomes playable catalog id
  putSfxBuffer('hitsfx_file_only', { duration: 0.01, length: 1, numberOfChannels: 1, sampleRate: 22050 } as AudioBuffer);
  ok(hasSfxBuffer('hitsfx_file_only'), 'hitSfx/R4a: putSfxBuffer marks ready');
  ok(resolveProjectileHitSfx({ id: 't', drawKind: 'arrow', hitW: 1, hitH: 1, hitSfx: 'hitsfx_file_only' }) === 'hitsfx_file_only',
    'hitSfx/R4a: 仅 src 有 buffer → catalog id');
  clearSfxBuffer('hitsfx_file_only');
  ok(resolveProjectileHitSfx({ id: 't', drawKind: 'arrow', hitW: 1, hitH: 1, hitSfx: 'hitsfx_file_only' }) === undefined,
    'hitSfx/R4a: clear buffer → 再 soft-skip');
  // moyu 示范字段（短载）
  ok(loadPack('moyu'), 'hitSfx: load moyu');
  ok(getProjectile('moyu_ink_arrow')?.hitSfx === 'arrow'
    && resolveProjectileHitSfx(getProjectile('moyu_ink_arrow')) === 'arrow',
    'hitSfx: moyu 示范挂 arrow 且可解析');
  ok(unloadPack('moyu') && !getProjectile('moyu_ink_arrow'), 'hitSfx: unload moyu');
  plug.dispose();
  ok(!getProjectile('hitsfx_demo_arrow') && !getSfxDef('hitsfx_file_only'),
    'hitSfx: temp catalog unload clean');
}


// R4a: sfx 包内文件 decode 接线（白名单 src → buffer 缓存 → 回退 synth / soft-skip）
{
  ok(isValidSfxFileSrc('./art/audio/r4a_smoke.wav', 'wav'), 'R4a: 合法 ./art/audio/*.wav + format');
  ok(isValidSfxFileSrc('./art/audio/x.ogg', 'ogg'), 'R4a: 合法 ogg');
  ok(!isValidSfxFileSrc('https://evil.example/a.ogg', 'ogg'), 'R4a: 拒外链');
  ok(!isValidSfxFileSrc('./not-art/x.ogg', 'ogg'), 'R4a: 拒非 ./art/ 前缀');
  ok(!isValidSfxFileSrc('./art/audio/x.ogg', 'wav'), 'R4a: format 与后缀不一致 → 拒');
  ok(!isValidSfxFileSrc('./art/audio/x.mp3', 'flac' as any), 'R4a: 非闭集 format → 拒');
  ok(existsSync('public/art/audio/r4a_smoke.wav'), 'R4a: smoke 示范 wav 已在 public/art/audio/');
  ok(SFX_FILE_MAX_BYTES === 2_000_000, 'R4a: 体素上限 2MB');

  const plug = game.plugin({
    name: 'r4a-sfx-file-test', inject: ['sfx', 'projectiles', 'talismans'],
    apply(ctx) {
      ctx.sfx.add({ id: 'r4a_file_only', src: './art/audio/r4a_smoke.wav', format: 'wav' });
      ctx.sfx.add({ id: 'r4a_file_and_synth', src: './art/audio/r4a_smoke.wav', format: 'wav', synth: 'slash' });
      ctx.projectiles.add({
        id: 'r4a_file_arrow', drawKind: 'arrow', hitW: 24, hitH: 8, life: 200,
        hitSfx: 'r4a_file_only',
      });
      ctx.projectiles.add({
        id: 'r4a_both_arrow', drawKind: 'arrow', hitW: 24, hitH: 8, life: 200,
        hitSfx: 'r4a_file_and_synth',
      });
      ctx.talismans.script({
        id: 'r4a_tal_sfx',
        steps: [{ kind: 'sfx', id: 'r4a_file_only' }],
      });
    },
  });

  ok(!!getSfxDef('r4a_file_only') && !getSfxDef('r4a_file_only')!.synth
    && getSfxDef('r4a_file_only')!.src === './art/audio/r4a_smoke.wav',
    'R4a: 登记仅 src 无 synth');
  ok(resolveProjectileHitSfx(getProjectile('r4a_file_arrow')) === undefined,
    'R4a: 仅 src 无 buffer → hitSfx resolve undefined（回退今日）');
  ok(resolveProjectileHitSfx(getProjectile('r4a_both_arrow')) === 'r4a_file_and_synth',
    'R4a: src+synth 无 buffer → 仍可走 synth（返回 catalog id）');

  putSfxBuffer('r4a_file_only', { duration: 0.05, length: 8, numberOfChannels: 1, sampleRate: 22050 } as AudioBuffer);
  ok(resolveProjectileHitSfx(getProjectile('r4a_file_arrow')) === 'r4a_file_only',
    'R4a: 注入 buffer 后 hitSfx → catalog id（文件优先路径）');
  putSfxBuffer('r4a_file_and_synth', { duration: 0.05, length: 8, numberOfChannels: 1, sampleRate: 22050 } as AudioBuffer);
  ok(resolveProjectileHitSfx(getProjectile('r4a_both_arrow')) === 'r4a_file_and_synth',
    'R4a: src+synth 有 buffer → 仍返回 catalog id（播时 file 优先）');

  const script = getTalismanScript('r4a_tal_sfx');
  const sfxStep = script?.steps?.find((s: any) => s.kind === 'sfx');
  ok(!!sfxStep && (sfxStep as any).id === 'r4a_file_only' && !!getSfxDef((sfxStep as any).id),
    'R4a: 符步 ScriptStep.sfx → 文件向 catalog id');


  plug.dispose();
  ok(!getSfxDef('r4a_file_only') && !hasSfxBuffer('r4a_file_only')
    && !getSfxDef('r4a_file_and_synth') && !hasSfxBuffer('r4a_file_and_synth')
    && !getProjectile('r4a_file_arrow') && !getTalismanScript('r4a_tal_sfx'),
    'R4a: unload 清 catalog + buffer 缓存');
  clearAllSfxBuffers();
}

// R2b: 设计台导出键 + 首访样例形状可被 applyContent 吃（sheets + sfx + backdrops）
{
  const designerJs = readFileSync(resolve('dlc-server/public/assets/designer.js'), 'utf8');
  ok(
    /['"]sheets['"]/.test(designerJs) && /['"]sfx['"]/.test(designerJs) && /['"]backdrops['"]/.test(designerJs)
      && designerJs.includes('buildContentExport')
      && designerJs.includes('demo_blade_alias')
      && designerJs.includes('demo_ink_slash')
      && designerJs.includes('demo_eclipse_tint')
      && designerJs.includes('isForbiddenArtSrc'),
    'R2b designer.js: export keys + first-visit seeds + artSrc guard',
  );
  const schema = JSON.parse(
    readFileSync(resolve('dlc-server/public/assets/designer-schema.json'), 'utf8'),
  ) as {
    sheets?: { defFields?: unknown[] };
    sfx?: { defFields?: unknown[] };
    backdrops?: { defFields?: unknown[] };
    coreSheetIds?: string[];
    coreSynthIds?: string[];
    backdropThemeIds?: string[];
  };
  ok(Array.isArray(schema.sheets?.defFields) && (schema.sheets!.defFields!.length >= 2), 'R2b schema sheets.defFields');
  ok(Array.isArray(schema.sfx?.defFields) && (schema.sfx!.defFields!.length >= 2), 'R2b schema sfx.defFields');
  ok(Array.isArray(schema.backdrops?.defFields) && (schema.backdrops!.defFields!.length >= 2), 'R2b schema backdrops.defFields');
  ok(Array.isArray(schema.coreSheetIds) && schema.coreSheetIds!.length === 6, 'R2b schema coreSheetIds === 6');
  ok(Array.isArray(schema.coreSynthIds) && schema.coreSynthIds!.length === 30, 'R2b schema coreSynthIds === 30');
  ok(Array.isArray(schema.backdropThemeIds) && schema.backdropThemeIds!.length === 4, 'R2b schema backdropThemeIds === 4');
  const html = readFileSync(resolve('dlc-server/public/designer.html'), 'utf8');
  ok(html.includes('value="sheets"') && html.includes('value="sfx"') && html.includes('value="backdrops"'),
    'R2b designer.html: gameplay options sheets/sfx/backdrops');
  // 与设计台首访种子同构 → applyContent
  const body: DlcContentBody = {
    sheets: [{
      id: 'demo_blade_alias',
      src: './art/weapons/blade_ink.png',
      frameW: 64,
      frameH: 32,
      frames: 3,
      maxBytes: 512000,
    }],
    sfx: [{
      id: 'demo_ink_slash',
      synth: 'slash',
    }],
    backdrops: [{
      id: 'demo_eclipse_tint',
      theme: 'eclipse',
      skyTint: '#1a1028',
      label: '试笔蚀月',
    }],
  };
  const r2bFork = game.plugin({
    name: 'dlc-designer-smoke-sheets-sfx-backdrops',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  const sh = getSheet('demo_blade_alias');
  ok(!!sh && sh.src === './art/weapons/blade_ink.png',
    'R2b designer-shaped export: applyContent getSheet(demo_blade_alias)');
  const sx = getSfxDef('demo_ink_slash');
  ok(!!sx && sx.synth === 'slash',
    'R2b designer-shaped export: applyContent getSfxDef(demo_ink_slash)');
  const bd = getBackdrop('demo_eclipse_tint');
  ok(!!bd && bd.theme === 'eclipse' && bd.skyTint === '#1a1028',
    'R2b designer-shaped export: applyContent getBackdrop(demo_eclipse_tint)');
  r2bFork.dispose();
  ok(!getSheet('demo_blade_alias') && !getSfxDef('demo_ink_slash') && !getBackdrop('demo_eclipse_tint'),
    'R2b designer sheets/sfx/backdrops smoke unload clean');
}

// R4b: 设计台去掉「文件通道未通」；src+format 可编；示范 file 别名可被 applyContent 吃；静态送达说明
{
  const designerJs = readFileSync(resolve('dlc-server/public/assets/designer.js'), 'utf8');
  const schemaRaw = readFileSync(resolve('dlc-server/public/assets/designer-schema.json'), 'utf8');
  const html = readFileSync(resolve('dlc-server/public/designer.html'), 'utf8');
  ok(!designerJs.includes('文件通道未通') && !designerJs.includes('文件通道暂缓'),
    'R4b designer.js: 无「文件通道未通/暂缓」灰态文案');
  ok(!schemaRaw.includes('文件通道未通') && !schemaRaw.includes('文件解码通道暂缓'),
    'R4b designer-schema: 无文件通道未通/暂缓');
  ok(designerJs.includes('public/art/audio/') && schemaRaw.includes('public/art/audio/'),
    'R4b: UI/schema 提示须放 public/art/audio/');
  ok(html.includes('public/art/audio/'), 'R4b designer.html: 静态送达一句');
  ok(designerJs.includes('demo_file_tap') && designerJs.includes('./art/audio/r4a_smoke.wav'),
    'R4b designer.js: 首访示范 file sfx 路径');
  const body: DlcContentBody = {
    sfx: [{
      id: 'demo_file_tap',
      src: './art/audio/r4a_smoke.wav',
      format: 'wav',
    }],
  };
  const r4bFork = game.plugin({
    name: 'dlc-designer-smoke-sfx-file',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  const sx = getSfxDef('demo_file_tap');
  ok(!!sx && sx.src === './art/audio/r4a_smoke.wav' && sx.format === 'wav' && !sx.synth,
    'R4b designer-shaped export: applyContent getSfxDef(demo_file_tap) src+format');
  ok(existsSync('public/art/audio/r4a_smoke.wav'), 'R4b: 示范 wav 在游戏静态（非馆 tgz）');
  r4bFork.dispose();
  ok(!getSfxDef('demo_file_tap'), 'R4b designer file sfx smoke unload clean');
}

// R4c: 示范音频进 public/art/audio/；文档固化静态送达；animScripts 走 catalog
{
  ok(existsSync('public/art/audio/r4a_smoke.wav'), 'R4c: r4a_smoke.wav 在游戏静态');
  ok(existsSync('public/art/audio/r4c_tap.wav'), 'R4c: r4c_tap.wav 在游戏静态');
  ok(existsSync('public/art/audio/r4c_tap.ogg'), 'R4c: r4c_tap.ogg 在游戏静态');
  ok(isValidSfxFileSrc('./art/audio/r4c_tap.ogg', 'ogg'), 'R4c: r4c_tap.ogg 路径+format 合法');
  const animSrc = readFileSync(resolve('src/meta/animScripts.ts'), 'utf8');
  ok(animSrc.includes("from '../audio/sfxCatalog'") && animSrc.includes('playCatalogSfx'),
    'R4c: animScripts 改走 playCatalogSfx');
  ok(!/case 'sfx':\s*\{[\s\S]*?playSfx\(/.test(animSrc),
    'R4c: animScripts case sfx 不再直通 playSfx');
  const menpaiDoc = readFileSync(resolve('docs/门派插件.md'), 'utf8');
  ok(menpaiDoc.includes('新音频一律进游戏静态') && menpaiDoc.includes('public/art/audio/'),
    'R4c: 门派插件文档固化「新音频进游戏静态」');
  const cDoc = readFileSync(resolve('docs/C档原语与设计台-2026-10-28.md'), 'utf8');
  ok(cDoc.includes('### R4c') && cDoc.includes('public/art/audio/'),
    'R4c: C档原语文档有 R4c 节');
  // 馆包不含音频二进制
  ok(!existsSync('dlc-server/packages/moyu/r4c_tap.ogg')
    && !existsSync('dlc-server/packages/moyu/r4c_tap.wav')
    && !existsSync('dlc-server/packages/moyu/r4a_smoke.wav'),
    'R4c: 馆种子目录无音频二进制');
  const body: DlcContentBody = {
    sfx: [{
      id: 'r4c_demo_click',
      src: './art/audio/r4c_tap.ogg',
      format: 'ogg',
    }],
  };
  const r4cFork = game.plugin({
    name: 'dlc-r4c-smoke-file',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  const sx = getSfxDef('r4c_demo_click');
  ok(!!sx && sx.src === './art/audio/r4c_tap.ogg' && sx.format === 'ogg',
    'R4c: applyContent 吃 ogg file sfx');
  r4cFork.dispose();
  ok(!getSfxDef('r4c_demo_click'), 'R4c file sfx smoke unload clean');
}

ok(JSON.stringify(snapshot()) === JSON.stringify(after), 'catalogs back to core after standalone packs');

// Enemy loadout Schema accept + soft gear apply via makeEnemy
{
  const loPlug = game.plugin({
    name: 'enemy-loadout-test', inject: ['enemies'],
    apply(ctx) {
      ctx.enemies.add({
        id: 'loadout_bandit', name: '负载试炼贼', body: 'axe', hp: 50,
        skills: [{ id: 'tuci', weight: 1, minRange: 0, maxRange: 300, cooldown: 60 }],
        gear: [{ id: 'pijia' }],
        pills: [{ id: 'heal', when: 'spawn', once: true }],
        talismans: [{ id: 'missing_fu_xyz', weight: 1 }],
      });
    },
  });
  const def = ENEMY_BY_ID['loadout_bandit'];
  ok(!!def?.skills?.[0] && def.skills[0].id === 'tuci', 'loadout schema: skills retained');
  ok(!!def?.gear?.[0] && def.gear[0].id === 'pijia', 'loadout schema: gear retained');
  const e = makeEnemy('loadout_bandit', 100, { eliteChance: 0 });
  // pijia base hp 14 → maxHp > 50; spawn heal may top off
  ok(e.maxHp >= 50 + 14, `loadout gear HP applied (maxHp=${e.maxHp})`);
  ok(!!e.loadout && e.loadout.atkMul >= 1, 'loadout runtime attached');
  ok(e.loadout!.skills.length === 1 && e.loadout!.gear.length === 1, 'loadout entries copied');
  loPlug.dispose();
  ok(!ENEMY_BY_ID['loadout_bandit'], 'unload loadout test enemy');
}

// BossLoad1: makeBoss attach loadout (gear/spawn) — no cast; chooseMove/kit untouched
{
  const base = makeBoss('gargoyle', 100, { hpScale: 1 });
  ok(base.maxHp === 900, 'BossLoad1: core gargoyle maxHp=900 (no gear)');
  ok(!!base.loadout, 'BossLoad1: core gargoyle still gets empty loadout attach');
  ok(base.loadout!.atkMul === 1 && base.loadout!.dmgTakenMul === 1, 'BossLoad1: core mul=1');
  ok(loadoutIncomingMul(base) === 1, 'BossLoad1: core incoming mul=1');
  ok(base.kit === 'stone', 'BossLoad1: core kit unchanged (stone)');
  // chooseMove / resolveBossKit / bossMoves not modified this slice (static: kit id + empty skills)
  ok(base.loadout!.skills.length === 0, 'BossLoad1: core no skills registered');

  const blPlug = game.plugin({
    name: 'boss-loadout1-test', inject: ['enemies'],
    apply(ctx) {
      ctx.enemies.add({
        id: 'boss_load1_gear',
        name: '负载试炼石兽',
        body: 'gargoyle',
        isBoss: true,
        hp: 900,
        silhouetteId: 'gargoyle',
        behaviorId: 'gargoyle',
        kitId: 'stone',
        skills: [{ id: 'tuci', weight: 1, minRange: 0, maxRange: 400, cooldown: 90 }],
        gear: [{ id: 'pijia' }, { id: 'tiehuwan' }],
        pills: [{ id: 'heal', when: 'spawn', once: true }],
        talismans: [{ id: 'missing_boss_fu', weight: 1 }],
      });
    },
  });
  const def = ENEMY_BY_ID['boss_load1_gear'];
  ok(!!def?.isBoss && !!def.gear?.some((g) => g.id === 'pijia'), 'BossLoad1: temp isBoss+gear registered');
  ok(!!def?.skills?.some((s) => s.id === 'tuci'), 'BossLoad1: skills retained on def (cast=BossLoad2)');
  const geared = makeBoss('boss_load1_gear', 100, { hpScale: 1 });
  // pijia base.hp 14 → maxHp > 900; spawn heal tops hp
  ok(geared.maxHp >= 900 + 14, `BossLoad1: gear HP applied (maxHp=${geared.maxHp})`);
  ok(geared.maxHp > base.maxHp, 'BossLoad1: geared maxHp > core baseline');
  ok(!!geared.loadout && geared.loadout.gear.some((g) => g.id === 'pijia'), 'BossLoad1: gear entries on Gargoyle');
  ok(geared.loadout!.skills.length === 1 && geared.loadout!.skills[0]!.id === 'tuci', 'BossLoad1: skills registered, not cast');
  ok(geared.loadout!.dmgTakenMul < 1, `BossLoad1: def% lowers dmgTakenMul (${geared.loadout!.dmgTakenMul})`);
  ok(loadoutIncomingMul(geared) < 1, 'BossLoad1: loadoutIncomingMul < 1');
  ok(geared.kit === 'stone', 'BossLoad1: kit still stone (resolveBossKit untouched)');
  // tiehuwan atk:3 → atkMul > 1; startAttack wires scaleLoadoutAttack (areaHit/弹道未接)
  ok(geared.loadout!.atkMul > 1, `BossLoad1: atkMul>1 from tiehuwan (${geared.loadout!.atkMul})`);
  const probeAtk = {
    name: 'bl1_probe', damage: 100, startup: 0, active: 1, recovery: 0,
    box: { x: 0, y: 0, w: 10, h: 10 }, kbX: 0, kbY: 0, hitstun: 0, hitstop: 0, shake: 0,
  } as import('../src/combat/types').AttackDef;
  const scaled = scaleLoadoutAttack(geared, probeAtk);
  ok(scaled.damage > probeAtk.damage, `BossLoad1: scaleLoadoutAttack raises dmg (${scaled.damage})`);
  // Incoming path: stub Game (flinch-only; no threshold/stagger at 100 dmg)
  const beforeHp = geared.hp;
  const mul = loadoutIncomingMul(geared);
  geared.setState('idle');
  const gStub = {
    texts: { add() {} }, showBanner() {}, slowmo() {},
    cam: { shake() {} }, onBossDying() {}, audio: {},
  } as never;
  const result = geared.receiveHit(gStub, probeAtk, 1);
  ok(result === 'hit', 'BossLoad1: receiveHit hits on idle');
  const expected = Math.max(1, Math.round(100 * mul));
  ok(geared.lastDamage === expected, `BossLoad1: receiveHit eats incoming mul (last=${geared.lastDamage}, exp=${expected})`);
  ok(geared.hp === beforeHp - expected, 'BossLoad1: HP reduced by mul-scaled damage');
  blPlug.dispose();
  ok(!ENEMY_BY_ID['boss_load1_gear'], 'BossLoad1: unload temp boss');
}

// BossLoad2: idle/walk gap cast; active states reject; kit/chooseMove untouched
{
  const bl2 = game.plugin({
    name: 'boss-loadout2-test', inject: ['enemies'],
    apply(ctx) {
      ctx.enemies.add({
        id: 'boss_load2_skill',
        name: '施放试炼石兽',
        body: 'gargoyle',
        isBoss: true,
        hp: 900,
        silhouetteId: 'gargoyle',
        behaviorId: 'gargoyle',
        kitId: 'stone',
        skills: [{ id: 'tuci', weight: 1, minRange: 0, maxRange: 9999, cooldown: 90 }],
      });
    },
  });
  ok(!!ENEMY_BY_ID['boss_load2_skill']?.skills?.some((s) => s.id === 'tuci'), 'BossLoad2: temp isBoss+skill registered');
  ok(BOSS_LOADOUT_CAST_STATES.includes('idle') && BOSS_LOADOUT_CAST_STATES.includes('walk'), 'BossLoad2: cast gate = idle|walk');

  const caster = makeBoss('boss_load2_skill', 100, { hpScale: 1 });
  ok(caster.kit === 'stone', 'BossLoad2: kit still stone (resolveBossKit untouched)');
  ok(!!caster.loadout && caster.loadout.skills.length === 1, 'BossLoad2: skill on loadout');
  ok(getAttackBox('tuci') != null, 'BossLoad2: core attackKey tuci present');

  const gCast = {
    player: { dead: false, x: 220 },
    texts: { add() {} },
    talismanScripts: { playSteps() {}, start() {} },
    animScripts: { playCastAnim() {} },
    audio: {},
    fx: { flare() {}, spawn() {}, dust() {}, ring() {} },
    hitstop: 0,
    cam: { shake() {} },
    flashScreen() {},
    enemies: [],
    attackToken() { throw new Error('BossLoad2 must not call attackToken'); },
  } as never;

  // --- idle + castGate ready → cast success (skillCd / castGate / attack state)
  caster.setState('idle');
  caster.cooldown = 40; // kit CD still waiting — gap cast window
  caster.loadout!.castGate = 0;
  caster.loadout!.skillCd = {};
  const castOk = tryCastBossLoadout(gCast, caster);
  ok(castOk === true, 'BossLoad2: idle+gap tryCast succeeds');
  ok((caster.loadout!.skillCd['tuci'] ?? 0) > 0, `BossLoad2: skillCd written (${caster.loadout!.skillCd['tuci']})`);
  ok(caster.loadout!.castGate > 0, `BossLoad2: castGate set after cast (${caster.loadout!.castGate})`);
  ok(caster.state === 'attack', `BossLoad2: attackKey cast → state attack (got ${caster.state})`);
  ok(caster.kit === 'stone', 'BossLoad2: kit unchanged after cast (no chooseMove)');

  // --- dive / charge active → reject (hard gate)
  const caster2 = makeBoss('boss_load2_skill', 100, { hpScale: 1 });
  caster2.loadout!.castGate = 0;
  caster2.loadout!.skillCd = {};
  for (const st of ['diveUp', 'diveDown', 'diveAim', 'chargeWind', 'charge', 'roar', 'roarWind', 'attack', 'intro', 'dying', 'down', 'stagger', 'slamWind', 'sweepWind', 'inkNova'] as const) {
    caster2.setState(st);
    caster2.cooldown = 0;
    const denied = tryCastBossLoadout(gCast, caster2);
    ok(denied === false, `BossLoad2: state「${st}」rejects cast`);
    ok((caster2.loadout!.skillCd['tuci'] ?? 0) === 0, `BossLoad2: 「${st}」did not write skillCd`);
  }

  // --- core gargoyle (no skills) never casts
  const core = makeBoss('gargoyle', 100, { hpScale: 1 });
  core.setState('idle');
  core.cooldown = 0;
  if (core.loadout) { core.loadout.castGate = 0; }
  ok(tryCastBossLoadout(gCast, core) === false, 'BossLoad2: core gargoyle no skills → no cast');
  ok(core.kit === 'stone', 'BossLoad2: core kit stone');

  // --- cooldown≤0 idle path: cast success skips chooseMove (simulate think order)
  const caster3 = makeBoss('boss_load2_skill', 150, { hpScale: 1 });
  caster3.setState('idle');
  caster3.cooldown = 0;
  caster3.loadout!.castGate = 0;
  caster3.loadout!.skillCd = {};
  const lastMoveBefore = (caster3 as unknown as { lastMove: string }).lastMove;
  const castBeforeChoose = tryCastBossLoadout(gCast, caster3);
  ok(castBeforeChoose === true, 'BossLoad2: cooldown≤0 tryCast before chooseMove succeeds');
  ok(caster3.state === 'attack', 'BossLoad2: cast-before-chooseMove → attack (kit not consulted)');
  ok((caster3 as unknown as { lastMove: string }).lastMove === lastMoveBefore, 'BossLoad2: lastMove unchanged (chooseMove skipped)');

  // --- walk gap also allowed
  const caster4 = makeBoss('boss_load2_skill', 100, { hpScale: 1 });
  caster4.setState('walk');
  caster4.cooldown = 30;
  caster4.loadout!.castGate = 0;
  caster4.loadout!.skillCd = {};
  ok(tryCastBossLoadout(gCast, caster4) === true, 'BossLoad2: walk gap cast ok');
  ok((caster4.loadout!.skillCd['tuci'] ?? 0) > 0, 'BossLoad2: walk cast wrote skillCd');

  // timers tick does not itself cast
  const caster5 = makeBoss('boss_load2_skill', 100, { hpScale: 1 });
  caster5.setState('idle');
  caster5.loadout!.castGate = 5;
  caster5.loadout!.skillCd['tuci'] = 10;
  tickEnemyLoadoutTimers(gCast, caster5);
  ok(caster5.loadout!.castGate === 4, 'BossLoad2: tick timers decrements castGate');
  ok(caster5.loadout!.skillCd['tuci'] === 9, 'BossLoad2: tick timers decrements skillCd');
  ok(caster5.state === 'idle', 'BossLoad2: tick timers alone does not change state');

  bl2.dispose();
  ok(!ENEMY_BY_ID['boss_load2_skill'], 'BossLoad2: unload temp boss');
}

// Gsm1: Boss idle/walk optional Behavior gap (facePlayer+keepDistance); kit chooseMove untouched
{
  const gsm1 = game.plugin({
    name: 'gsm1-boss-behavior-test', inject: ['enemies', 'behaviors'],
    apply(ctx) {
      ctx.behaviors.add({
        id: 'gsm1_boss_pace',
        body: 'gargoyle',
        label: 'Gsm1空档试步',
        steps: [
          { kind: 'facePlayer' },
          { kind: 'keepDistance', idealMin: 160, idealMax: 220, chase: 400, retreatSpeed: 2.2 },
          // action kind must soft-skip — kit still owns dive/claw
          { kind: 'meleeAttack', attackKey: 'axeChop', rangeMin: 0, rangeMax: 999, weight: 9, cooldown: 10 },
        ],
      });
      ctx.enemies.add({
        id: 'boss_gsm1_beh',
        name: '积木试炼石兽',
        body: 'gargoyle',
        isBoss: true,
        hp: 900,
        silhouetteId: 'gargoyle',
        behaviorId: 'gsm1_boss_pace',
        kitId: 'stone',
      });
    },
  });
  ok(!!getBehavior('gsm1_boss_pace')?.steps?.some((s) => s.kind === 'keepDistance'), 'Gsm1: temp behavior has keepDistance');
  ok(BOSS_GAP_LOCO_KINDS.has('facePlayer') && BOSS_GAP_LOCO_KINDS.has('keepDistance'), 'Gsm1: loco allowlist has face+keep');

  const paced = makeBoss('boss_gsm1_beh', 100, { hpScale: 1 });
  ok(paced.behaviorId === 'gsm1_boss_pace', 'Gsm1: makeBoss behaviorId attached');
  ok(!!paced.behaviorSteps?.length && paced.behaviorSteps!.some((s) => s.kind === 'facePlayer'), 'Gsm1: non-empty steps attached');
  ok(paced.kit === 'stone', 'Gsm1: kit still stone');

  const gGap = {
    player: { dead: false, x: 700, facing: 1, y: 0 },
    texts: { add() {} },
    talismanScripts: { playSteps() {}, start() {} },
    animScripts: { playCastAnim() {} },
    audio: {},
    fx: { flare() {}, spawn() {}, dust() {}, ring() {} },
    hitstop: 0,
    cam: { shake() {} },
    flashScreen() {},
    enemies: [],
    attackToken() { throw new Error('Gsm1 gap must not call attackToken'); },
    projectiles: [],
    bounds: { min: -2000, max: 4000 },
  } as never;

  // Far from player (dist>chase) → keepDistance chase → walk + positive vx toward player
  paced.setState('idle');
  paced.cooldown = 80;
  paced.body.vx = 0;
  const lastMove0 = (paced as unknown as { lastMove: string }).lastMove;
  tickBossBehaviorGap(gGap, paced);
  ok(paced.state === 'walk' || paced.state === 'idle', `Gsm1: gap stays idle|walk (got ${paced.state})`);
  ok(paced.facing === 1, `Gsm1: facePlayer toward far player (facing=${paced.facing})`);
  ok(paced.body.vx > 0, `Gsm1: keepDistance chase vx>0 (vx=${paced.body.vx})`);
  ok((paced as unknown as { lastMove: string }).lastMove === lastMove0, 'Gsm1: lastMove unchanged (no chooseMove)');
  ok(paced.cooldown === 80, 'Gsm1: gap does not decrement kit cooldown');

  // Too close (dist < idealMin*0.72) → reverse walk (never retreat state)
  const close = makeBoss('boss_gsm1_beh', 650, { hpScale: 1 });
  close.setState('idle');
  close.cooldown = 50;
  tickBossBehaviorGap(gGap, close);
  ok(close.state === 'walk' || close.state === 'idle', `Gsm1: close gap stays idle|walk (got ${close.state})`);
  ok(close.state !== 'retreat' && close.state !== 'attack' && close.state !== 'diveUp', 'Gsm1: meleeAttack step did not start attack/dive');
  ok(close.body.vx < 0 || close.state === 'idle', `Gsm1: too-close backs or idles (vx=${close.body.vx}, state=${close.state})`);

  // Active dive: gap no-op (caller also gates; function hard-gates)
  const diving = makeBoss('boss_gsm1_beh', 100, { hpScale: 1 });
  diving.setState('diveUp');
  diving.body.vx = 3;
  const vxBefore = diving.body.vx;
  tickBossBehaviorGap(gGap, diving);
  ok(diving.state === 'diveUp', 'Gsm1: active diveUp not interrupted by gap');
  ok(diving.body.vx === vxBefore, 'Gsm1: dive vx untouched by gap');

  // Full idle update with CD still waiting: gap loco runs; tryCast no-op; chooseMove not yet
  const thinker = makeBoss('boss_gsm1_beh', 100, { hpScale: 1 });
  thinker.setState('idle');
  thinker.cooldown = 50;
  thinker.body.vx = 0;
  thinker.update(gGap);
  ok(thinker.kit === 'stone', 'Gsm1: after update kit still stone');
  ok(thinker.state === 'idle' || thinker.state === 'walk', `Gsm1: update stays idle|walk (got ${thinker.state})`);
  ok(thinker.state !== 'aim' && thinker.state !== 'retreat' && thinker.state !== 'attack', 'Gsm1: meleeAttack step did not hijack update');
  ok(thinker.cooldown === 49, `Gsm1: update decrements kit cooldown once (got ${thinker.cooldown})`);
  ok(thinker.facing === 1 && (thinker.body.vx > 0 || thinker.state === 'walk'), 'Gsm1: update ate face+keepDistance');

  // Core gargoyle: no steps → shell idle path (behaviorSteps null)
  const core = makeBoss('gargoyle', 100, { hpScale: 1 });
  ok(core.behaviorId === 'gargoyle', 'Gsm1: core behaviorId=gargoyle');
  ok(!core.behaviorSteps?.length, 'Gsm1: core gargoyle behavior has no steps → null attach');
  ok(!getBehavior('gargoyle')?.steps?.length, 'Gsm1: CORE gargoyle behavior stub has no steps');
  core.setState('idle');
  core.cooldown = 40;
  const gCore = {
    player: { dead: false, x: 300, facing: -1, y: 0 },
    texts: { add() {} },
    talismanScripts: { playSteps() {}, start() {} },
    animScripts: { playCastAnim() {} },
    audio: {},
    fx: { flare() {}, spawn() {}, dust() {}, ring() {} },
    hitstop: 0,
    cam: { shake() {} },
    flashScreen() {},
    enemies: [],
    attackToken() { throw new Error('core must not call attackToken'); },
    projectiles: [],
    bounds: { min: -2000, max: 4000 },
  } as never;
  core.update(gCore);
  ok(core.state === 'idle' || core.state === 'walk', `Gsm1: core idle update stays shell states (got ${core.state})`);
  ok(core.kit === 'stone', 'Gsm1: core kit stone');
  ok(core.cooldown === 39, `Gsm1: core idle decrements cooldown (got ${core.cooldown})`);
  ok(core.facing === 1, 'Gsm1: core shell faces player');

  // Gsm5 moves shixiang onto non-empty pace; CORE gargoyle remains the no-steps identity (asserted above).
  // shixiang pack is unloaded here — full demo covered in Gsm5 block.

  gsm1.dispose();
  ok(!ENEMY_BY_ID['boss_gsm1_beh'] && !getBehavior('gsm1_boss_pace'), 'Gsm1: unload temp boss+behavior');
}

// Gsm2: document Boss gap allowlist — non-loco kinds soft-skip (no throw / no attack)
{
  const allowed = ['facePlayer', 'keepDistance', 'idlePace', 'circleStrafe', 'flank', 'phaseAtHp', 'phaseGate'] as const;
  for (const k of allowed) {
    ok(BOSS_GAP_LOCO_KINDS.has(k), `Gsm2: allowlist includes ${k}`);
  }
  ok(BOSS_GAP_LOCO_KINDS.size === allowed.length, `Gsm2: allowlist size=${BOSS_GAP_LOCO_KINDS.size} (expect ${allowed.length})`);
  const skipped = BEHAVIOR_STEP_KINDS.filter((k) => !BOSS_GAP_LOCO_KINDS.has(k));
  for (const k of ['meleeAttack', 'rangedAttack', 'block', 'charge', 'useLoadout', 'dodge', 'callAlly', 'comboChain', 'retreatBurst', 'taunt', 'idleEmote'] as const) {
    ok(!BOSS_GAP_LOCO_KINDS.has(k), `Gsm2: non-loco kind ${k} soft-skip (not in allowlist)`);
  }
  ok(skipped.length === BEHAVIOR_STEP_KINDS.length - allowed.length, `Gsm2: partition allow+skip covers all ${BEHAVIOR_STEP_KINDS.length} BehaviorStep kinds`);
  ok(skipped.includes('meleeAttack'), 'Gsm2: meleeAttack is among soft-skipped kinds');
}

// Gsm3: claw soft muls + walk frames on BossMoveDef (thin chooseMove read; no dive/BehaviorStep)
{
  const claw1 = getAttackBox('claw1') ?? BUILTIN_BOSS_ATTACKS.claw1;
  ok(!!claw1 && claw1.startup === 20 && claw1.damage === 11 && claw1.recovery === 8, 'Gsm3: claw1 baseline catalog');

  // Identity: null / bare CORE claw / mul===1 → bit-identical
  const bare = { id: 'claw', kind: 'claw' as const, label: '裂爪' };
  const id1 = applyClawMoveSoft(claw1!, null);
  const id2 = applyClawMoveSoft(claw1!, bare);
  const id3 = applyClawMoveSoft(claw1!, { ...bare, startupMul: 1, recoveryMul: 1, damageMul: 1 });
  ok(id1 === claw1 && id2 === claw1 && id3 === claw1, 'Gsm3: applyClawMoveSoft identity returns same ref');
  ok(id1.startup === 20 && id1.damage === 11 && id1.recovery === 8, 'Gsm3: CORE claw path numbers unchanged');

  // Discernible soft: half startup, double recovery gap, double damage
  const swift = {
    id: 'claw_gsm3_swift', kind: 'claw' as const, label: '急爪',
    startupMul: 0.5, recoveryMul: 2, damageMul: 2,
  };
  const soft = applyClawMoveSoft(claw1!, swift);
  ok(soft.startup === 10, `Gsm3: startupMul 0.5 → startup 10 (got ${soft.startup})`);
  ok(soft.recovery === 16, `Gsm3: recoveryMul 2 → recovery 16 (got ${soft.recovery})`);
  ok(soft.damage === 22, `Gsm3: damageMul 2 → damage 22 (got ${soft.damage})`);
  ok(soft !== claw1 && claw1!.startup === 20, 'Gsm3: soft apply does not mutate catalog claw1');

  // walk frames soft CD
  ok(walkCooldownFromMove(null) === 50, 'Gsm3: walk default CD 50');
  ok(walkCooldownFromMove({ id: 'walk', kind: 'walk' }) === 50, 'Gsm3: CORE walk no frames → 50');
  ok(walkCooldownFromMove({ id: 'walk_pace', kind: 'walk', frames: 20 }) === 20, 'Gsm3: walk frames=20 → CD 20');
  ok(walkCooldownFromMove({ id: 'walk_pace', kind: 'walk', frames: 0 }) === 50, 'Gsm3: frames<=0 soft-falls to 50');

  const gsm3 = game.plugin({
    name: 'gsm3-claw-walk-test',
    inject: ['bossMoves', 'bossKits', 'enemies'],
    apply(ctx) {
      ctx.bossMoves.add({
        id: 'claw_gsm3_swift', kind: 'claw', label: '急爪',
        startupMul: 0.5, recoveryMul: 2, damageMul: 2,
      });
      ctx.bossMoves.add({
        id: 'walk_gsm3_pace', kind: 'walk', label: '急踱', frames: 20,
      });
      ctx.bossKits.add({
        id: 'gsm3_claw_kit',
        close: [{ move: 'claw_gsm3_swift', weight: 100 }],
        far: [{ move: 'claw_gsm3_swift', weight: 100 }],
      });
      ctx.bossKits.add({
        id: 'gsm3_walk_kit',
        close: [{ move: 'walk_gsm3_pace', weight: 100 }],
        far: [{ move: 'walk_gsm3_pace', weight: 100 }],
      });
      ctx.enemies.add({
        id: 'boss_gsm3_claw', name: 'Gsm3急爪石兽', body: 'gargoyle', isBoss: true,
        hp: 900, silhouetteId: 'gargoyle', behaviorId: 'gargoyle', kitId: 'gsm3_claw_kit',
      });
      ctx.enemies.add({
        id: 'boss_gsm3_walk', name: 'Gsm3急踱石兽', body: 'gargoyle', isBoss: true,
        hp: 900, silhouetteId: 'gargoyle', behaviorId: 'gargoyle', kitId: 'gsm3_walk_kit',
      });
    },
  });
  ok(getBossMove('claw_gsm3_swift')?.startupMul === 0.5, 'Gsm3: Cordis claw move registered');
  ok(getBossMove('walk_gsm3_pace')?.frames === 20, 'Gsm3: Cordis walk move frames=20');
  ok(getBossMove('claw')?.startupMul == null && getBossMove('claw')?.damageMul == null, 'Gsm3: CORE claw omits soft muls');
  ok(getBossMove('walk')?.frames == null, 'Gsm3: CORE walk omits frames');

  const gGsm3 = {
    player: { dead: false, x: 140, facing: -1, y: 0 },
    texts: { add() {} },
    talismanScripts: { playSteps() {}, start() {} },
    animScripts: { playCastAnim() {} },
    audio: {},
    fx: { flare() {}, spawn() {}, dust() {}, ring() {} },
    hitstop: 0,
    cam: { shake() {} },
    flashScreen() {},
    enemies: [],
    attackToken() {},
    projectiles: [],
    bounds: { min: -2000, max: 4000 },
  } as never;

  // Force chooseMove → claw via kit weight 100 + Math.random stub
  const clawBoss = makeBoss('boss_gsm3_claw', 100, { hpScale: 1 });
  ok(clawBoss.kit === 'gsm3_claw_kit', 'Gsm3: claw boss kit attached');
  clawBoss.setState('idle');
  clawBoss.cooldown = 0;
  const rnd = Math.random;
  Math.random = () => 0;
  clawBoss.update(gGsm3);
  Math.random = rnd;
  ok(clawBoss.state === 'attack' && !!clawBoss.atk, `Gsm3: chooseMove claw → attack (state=${clawBoss.state})`);
  ok(clawBoss.atk!.def.startup === 10, `Gsm3: live claw1 startup soft 10 (got ${clawBoss.atk!.def.startup})`);
  ok(clawBoss.atk!.def.damage === 22, `Gsm3: live claw1 damage soft 22 (got ${clawBoss.atk!.def.damage})`);
  ok(clawBoss.atk!.def.recovery === 16, `Gsm3: live claw1 recovery soft 16 (got ${clawBoss.atk!.def.recovery})`);

  // Core gargoyle still starts claw with catalog numbers (no soft muls on CORE move)
  const coreClaw = makeBoss('gargoyle', 100, { hpScale: 1 });
  coreClaw.setState('idle');
  coreClaw.cooldown = 0;
  // Bias stone kit toward claw: temporarily replace lastMove + stub random until claw or give up
  // Direct soft path: CORE getBossMove('claw') through applyClawMoveSoft already asserted identity.
  // Live: force by setting kit via params — stone has claw weight>0; stub random to land on claw index.
  const stoneClose = bossMoveWeights('stone', true, true);
  const clawIdx = stoneClose.findIndex(([m]) => m === 'claw' || getBossMove(m)?.kind === 'claw');
  ok(clawIdx >= 0, 'Gsm3: stone kit has a claw-kind move');
  // Reconstruct pick: walk until we know — simpler: call apply on CORE moveParams
  const coreMp = getBossMove('claw');
  const coreLive = applyClawMoveSoft(claw1!, coreMp);
  ok(coreLive.startup === 20 && coreLive.damage === 11, 'Gsm3: CORE claw soft-read = today');

  // Walk kit: chooseMove → walk with frames CD
  const walkBoss = makeBoss('boss_gsm3_walk', 100, { hpScale: 1 });
  ok(walkBoss.kit === 'gsm3_walk_kit', 'Gsm3: walk boss kit attached');
  walkBoss.setState('idle');
  walkBoss.cooldown = 0;
  Math.random = () => 0;
  walkBoss.update(gGsm3);
  Math.random = rnd;
  ok(walkBoss.state === 'walk', `Gsm3: chooseMove walk → walk (state=${walkBoss.state})`);
  ok(walkBoss.cooldown === 20, `Gsm3: walk frames soft CD=20 (got ${walkBoss.cooldown})`);

  // Core walk path: no frames → 50
  ok(walkCooldownFromMove(getBossMove('walk')) === 50, 'Gsm3: CORE walk getBossMove → CD 50');

  gsm3.dispose();
  ok(!getBossMove('claw_gsm3_swift') && !getBossMove('walk_gsm3_pace')
    && !ENEMY_BY_ID['boss_gsm3_claw'] && !ENEMY_BY_ID['boss_gsm3_walk']
    && !BOSS_KIT_BY_ID['gsm3_claw_kit'] && !BOSS_KIT_BY_ID['gsm3_walk_kit'],
    'Gsm3: unload temp moves/kits/enemies');
}

// Gsm4: charge/slam/sweep windFrames + radius/width soft (BossMoveDef soft; no BehaviorStep)
{
  ok(GSM4_WIND_DEFAULTS.charge === 38 && GSM4_WIND_DEFAULTS.slam === 28 && GSM4_WIND_DEFAULTS.sweep === 22,
    'Gsm4: wind defaults match today literals');
  ok(windFramesFromMove(null, 38) === 38, 'Gsm4: null → fallback');
  ok(windFramesFromMove({ id: 'charge', kind: 'charge' }, 38) === 38, 'Gsm4: CORE charge omit wind → 38');
  ok(windFramesFromMove(getBossMove('charge'), GSM4_WIND_DEFAULTS.charge) === 38, 'Gsm4: CORE charge getBossMove → 38');
  ok(windFramesFromMove(getBossMove('slam'), GSM4_WIND_DEFAULTS.slam) === 28, 'Gsm4: CORE slam omit wind → 28');
  ok(windFramesFromMove(getBossMove('sweep'), GSM4_WIND_DEFAULTS.sweep) === 22, 'Gsm4: CORE sweep omit wind → 22');
  ok(windFramesFromMove({ id: 'x', kind: 'slam', windFrames: 8 }, 28) === 8, 'Gsm4: windFrames=8 soft');
  ok(windFramesFromMove({ id: 'x', kind: 'slam', windFrames: 0 }, 28) === 28, 'Gsm4: windFrames<=0 soft-falls');
  ok(windFramesFromMove({ id: 'x', kind: 'slam', windFrames: 999 }, 28) === 180, 'Gsm4: windFrames clamp ≤180');
  ok(getBossMove('slam')?.radius === 140 && getBossMove('slam')?.damage === 18, 'Gsm4: CORE slam radius/damage today');
  ok(getBossMove('sweep')?.width === 180 && getBossMove('sweep')?.damage === 14, 'Gsm4: CORE sweep width/damage today');
  ok(getBossMove('charge')?.windFrames == null, 'Gsm4: CORE charge omits windFrames');

  const gsm4 = game.plugin({
    name: 'gsm4-ground-hard-test',
    inject: ['bossMoves', 'bossKits', 'enemies'],
    apply(ctx) {
      ctx.bossMoves.add({
        id: 'slam_gsm4_wide', kind: 'slam', label: '广震',
        radius: 280, damage: 22, hitstop: 12, windFrames: 6,
      });
      ctx.bossMoves.add({
        id: 'sweep_gsm4_swift', kind: 'sweep', label: '急扫',
        width: 260, damage: 16, windFrames: 5,
      });
      ctx.bossMoves.add({
        id: 'charge_gsm4_quick', kind: 'charge', label: '急冲',
        windFrames: 4,
      });
      ctx.bossKits.add({
        id: 'gsm4_slam_kit',
        close: [{ move: 'slam_gsm4_wide', weight: 100 }],
        far: [{ move: 'slam_gsm4_wide', weight: 100 }],
      });
      ctx.bossKits.add({
        id: 'gsm4_sweep_kit',
        close: [{ move: 'sweep_gsm4_swift', weight: 100 }],
        far: [{ move: 'sweep_gsm4_swift', weight: 100 }],
      });
      ctx.bossKits.add({
        id: 'gsm4_charge_kit',
        close: [{ move: 'charge_gsm4_quick', weight: 100 }],
        far: [{ move: 'charge_gsm4_quick', weight: 100 }],
      });
      ctx.enemies.add({
        id: 'boss_gsm4_slam', name: 'Gsm4广震石兽', body: 'gargoyle', isBoss: true,
        hp: 900, silhouetteId: 'gargoyle', behaviorId: 'gargoyle', kitId: 'gsm4_slam_kit',
      });
      ctx.enemies.add({
        id: 'boss_gsm4_sweep', name: 'Gsm4急扫石兽', body: 'gargoyle', isBoss: true,
        hp: 900, silhouetteId: 'gargoyle', behaviorId: 'gargoyle', kitId: 'gsm4_sweep_kit',
      });
      ctx.enemies.add({
        id: 'boss_gsm4_charge', name: 'Gsm4急冲石兽', body: 'gargoyle', isBoss: true,
        hp: 900, silhouetteId: 'gargoyle', behaviorId: 'gargoyle', kitId: 'gsm4_charge_kit',
      });
    },
  });
  ok(getBossMove('slam_gsm4_wide')?.radius === 280 && getBossMove('slam_gsm4_wide')?.windFrames === 6,
    'Gsm4: Cordis slam radius+wind registered');
  ok(getBossMove('sweep_gsm4_swift')?.width === 260 && getBossMove('sweep_gsm4_swift')?.windFrames === 5,
    'Gsm4: Cordis sweep width+wind registered');
  ok(getBossMove('charge_gsm4_quick')?.windFrames === 4, 'Gsm4: Cordis charge wind registered');

  const gGsm4 = {
    player: { dead: false, x: 140, facing: -1, y: 0 },
    texts: { add() {} },
    talismanScripts: { playSteps() {}, start() {} },
    animScripts: { playCastAnim() {} },
    audio: {},
    fx: { flare() {}, spawn() {}, dust() {}, ring() {}, stoneShatter() {}, slashLine() {} },
    hitstop: 0,
    cam: { shake() {} },
    flashScreen() {},
    enemies: [],
    attackToken() {},
    projectiles: [],
    bounds: { min: -2000, max: 4000 },
    areaHit() {},
  } as never;

  const rnd = Math.random;
  Math.random = () => 0;

  // Slam: chooseMove → slamWind; after windFrames ticks → slam; areaHit captures radius
  const slamBoss = makeBoss('boss_gsm4_slam', 100, { hpScale: 1 });
  ok(slamBoss.kit === 'gsm4_slam_kit', 'Gsm4: slam boss kit attached');
  slamBoss.setState('idle');
  slamBoss.cooldown = 0;
  let capturedRad = -1;
  let capturedDmg = -1;
  const gSlam = {
    ...gGsm4 as object,
    areaHit(_a: unknown, _x: number, _y: number, rx: number, _ry: number, hit: { damage?: number }) {
      capturedRad = rx;
      capturedDmg = hit?.damage ?? -1;
    },
  } as never;
  slamBoss.update(gSlam);
  ok(slamBoss.state === 'slamWind', `Gsm4: chooseMove slam → slamWind (state=${slamBoss.state})`);
  ok(windFramesFromMove(getBossMove('slam_gsm4_wide'), 28) === 6, 'Gsm4: registered slam windFrames=6');
  // After chooseMove setState('slamWind') resets t=0; next updates run slamWind case.
  // windFrames=6 → need 6 updates for t to reach 6.
  for (let i = 0; i < 5; i++) slamBoss.update(gSlam);
  ok(slamBoss.state === 'slamWind', `Gsm4: still slamWind before wind end (t path; state=${slamBoss.state})`);
  slamBoss.update(gSlam); // should reach windFrames and enter slam
  ok(slamBoss.state === 'slam', `Gsm4: windFrames=6 → slam (state=${slamBoss.state})`);
  // slam hits at t>=2; tick a few
  for (let i = 0; i < 4; i++) slamBoss.update(gSlam);
  ok(capturedRad === 280, `Gsm4: live slam radius soft 280 (got ${capturedRad})`);
  ok(capturedDmg === 22, `Gsm4: live slam damage soft 22 (got ${capturedDmg})`);

  // CORE slam wind still 28 when forced via moveParams identity
  ok(windFramesFromMove(getBossMove('slam'), 28) === 28, 'Gsm4: CORE slam wind = today 28');

  // Sweep: short wind
  const sweepBoss = makeBoss('boss_gsm4_sweep', 100, { hpScale: 1 });
  sweepBoss.setState('idle');
  sweepBoss.cooldown = 0;
  sweepBoss.update(gGsm4);
  ok(sweepBoss.state === 'sweepWind', `Gsm4: chooseMove sweep → sweepWind (state=${sweepBoss.state})`);
  for (let i = 0; i < 4; i++) sweepBoss.update(gGsm4);
  ok(sweepBoss.state === 'sweepWind', 'Gsm4: sweep still winding before 5');
  sweepBoss.update(gGsm4);
  ok(sweepBoss.state === 'sweep', `Gsm4: windFrames=5 → sweep (state=${sweepBoss.state})`);

  // Charge: short wind (spd=1 → threshold = windFrames)
  const chargeBoss = makeBoss('boss_gsm4_charge', 100, { hpScale: 1 });
  chargeBoss.setState('idle');
  chargeBoss.cooldown = 0;
  chargeBoss.update(gGsm4);
  ok(chargeBoss.state === 'chargeWind', `Gsm4: chooseMove charge → chargeWind (state=${chargeBoss.state})`);
  for (let i = 0; i < 3; i++) chargeBoss.update(gGsm4);
  ok(chargeBoss.state === 'chargeWind', 'Gsm4: charge still winding before 4');
  chargeBoss.update(gGsm4);
  ok(chargeBoss.state === 'charge', `Gsm4: windFrames=4 → charge (state=${chargeBoss.state})`);

  Math.random = rnd;

  // CORE path: long wind still default — force slamWind with CORE moveParams via stone kit pick is hard;
  // pure helper + omit field already cover bit-identical defaults.
  ok(getBossMove('slam')?.windFrames == null && getBossMove('sweep')?.windFrames == null,
    'Gsm4: CORE slam/sweep omit windFrames');

  gsm4.dispose();
  ok(!getBossMove('slam_gsm4_wide') && !getBossMove('sweep_gsm4_swift') && !getBossMove('charge_gsm4_quick')
    && !ENEMY_BY_ID['boss_gsm4_slam'] && !ENEMY_BY_ID['boss_gsm4_sweep'] && !ENEMY_BY_ID['boss_gsm4_charge']
    && !BOSS_KIT_BY_ID['gsm4_slam_kit'] && !BOSS_KIT_BY_ID['gsm4_sweep_kit'] && !BOSS_KIT_BY_ID['gsm4_charge_kit'],
    'Gsm4: unload temp moves/kits/enemies');
}

// Dfr1: roar windFrames soft (+ optional radius/frames); damage still gRoar; dive/fb untouched
{
  ok(DFR1_ROAR_DEFAULTS.wind === 40 && DFR1_ROAR_DEFAULTS.radius === 300 && DFR1_ROAR_DEFAULTS.frames === 44,
    'Dfr1: roar defaults match today literals');
  ok(windFramesFromMove(null, DFR1_ROAR_DEFAULTS.wind) === 40, 'Dfr1: null wind → 40');
  ok(windFramesFromMove(getBossMove('roar'), DFR1_ROAR_DEFAULTS.wind) === 40, 'Dfr1: CORE roar omit wind → 40');
  ok(getBossMove('roar')?.windFrames == null && getBossMove('roar')?.radius == null && getBossMove('roar')?.frames == null,
    'Dfr1: CORE roar omits windFrames/radius/frames');
  ok(roarRadiusFromMove(getBossMove('roar')) === 300, 'Dfr1: CORE roar radius → 300');
  ok(roarActiveFromMove(getBossMove('roar')) === 44, 'Dfr1: CORE roar frames → 44');
  ok(windFramesFromMove({ id: 'x', kind: 'roar', windFrames: 8 }, 40) === 8, 'Dfr1: windFrames=8 soft');
  ok(windFramesFromMove({ id: 'x', kind: 'roar', windFrames: 0 }, 40) === 40, 'Dfr1: windFrames<=0 soft-falls');
  ok(roarRadiusFromMove({ id: 'x', kind: 'roar', radius: 120 }) === 120, 'Dfr1: radius soft');
  ok(roarRadiusFromMove({ id: 'x', kind: 'roar', radius: 0 }) === 300, 'Dfr1: radius<=0 soft-falls');
  ok(roarRadiusFromMove({ id: 'x', kind: 'roar', radius: 9999 }) === 800, 'Dfr1: radius clamp ≤800');
  ok(roarActiveFromMove({ id: 'x', kind: 'roar', frames: 12 }) === 12, 'Dfr1: frames soft');
  ok(roarActiveFromMove({ id: 'x', kind: 'roar', frames: 0 }) === 44, 'Dfr1: frames<=0 soft-falls');
  // dive/fireball CORE stubs still omit soft — untouched this knife
  ok(getBossMove('dive')?.windFrames == null && getBossMove('fireball')?.windFrames == null,
    'Dfr1: dive/fireball still omit windFrames');

  const dfr1 = game.plugin({
    name: 'dfr1-roar-soft-test',
    inject: ['bossMoves', 'bossKits', 'enemies'],
    apply(ctx) {
      ctx.bossMoves.add({
        id: 'roar_dfr1_swift', kind: 'roar', label: '急啸',
        windFrames: 8, radius: 160, frames: 20,
      });
      ctx.bossKits.add({
        id: 'dfr1_roar_kit',
        close: [{ move: 'roar_dfr1_swift', weight: 100 }],
        far: [{ move: 'roar_dfr1_swift', weight: 100 }],
      });
      ctx.enemies.add({
        id: 'boss_dfr1_roar', name: 'Dfr1急啸石兽', body: 'gargoyle', isBoss: true,
        hp: 900, silhouetteId: 'gargoyle', behaviorId: 'gargoyle', kitId: 'dfr1_roar_kit',
      });
    },
  });
  ok(getBossMove('roar_dfr1_swift')?.windFrames === 8
    && getBossMove('roar_dfr1_swift')?.radius === 160
    && getBossMove('roar_dfr1_swift')?.frames === 20,
    'Dfr1: Cordis roar wind+radius+frames registered');

  const gDfr1 = {
    player: { dead: false, x: 140, facing: -1, y: 0 },
    texts: { add() {} },
    talismanScripts: { playSteps() {}, start() {} },
    animScripts: { playCastAnim() {} },
    audio: {},
    fx: { flare() {}, spawn() {}, dust() {}, ring() {}, stoneShatter() {}, slashLine() {} },
    hitstop: 0,
    cam: { shake() {}, punch() {} },
    flashScreen() {},
    enemies: [],
    attackToken() {},
    projectiles: [],
    bounds: { min: -2000, max: 4000 },
    areaHit() {},
    applyHitTo() {},
  } as never;

  const rnd = Math.random;
  Math.random = () => 0;

  const roarBoss = makeBoss('boss_dfr1_roar', 100, { hpScale: 1 });
  ok(roarBoss.kit === 'dfr1_roar_kit', 'Dfr1: roar boss kit attached');
  roarBoss.setState('idle');
  roarBoss.cooldown = 0;
  (roarBoss as unknown as { roarCd: number }).roarCd = 0;
  roarBoss.update(gDfr1);
  ok(roarBoss.state === 'roarWind', `Dfr1: chooseMove roar → roarWind (state=${roarBoss.state})`);
  ok(roarBoss.invulnerable === true, 'Dfr1: roarWind still invulnerable');
  // windFrames=8 → after chooseMove, 7 more still winding, 8th enters roar
  for (let i = 0; i < 7; i++) roarBoss.update(gDfr1);
  ok(roarBoss.state === 'roarWind', `Dfr1: still roarWind before wind end (state=${roarBoss.state})`);
  roarBoss.update(gDfr1);
  ok(roarBoss.state === 'roar', `Dfr1: windFrames=8 → roar (state=${roarBoss.state})`);
  ok(roarBoss.invulnerable === true, 'Dfr1: roar still invulnerable');
  // active frames=20 → need 20 ticks in roar to idle
  for (let i = 0; i < 19; i++) roarBoss.update(gDfr1);
  ok(roarBoss.state === 'roar', `Dfr1: still roar before active end (state=${roarBoss.state})`);
  roarBoss.update(gDfr1);
  ok(roarBoss.state === 'idle', `Dfr1: frames=20 → idle (state=${roarBoss.state})`);

  // Discernible vs today: CORE wind=40 would still be winding at t=8
  ok(windFramesFromMove(getBossMove('roar'), 40) === 40
    && windFramesFromMove(getBossMove('roar_dfr1_swift'), 40) === 8,
    'Dfr1: soft wind shorter than CORE today');

  Math.random = rnd;

  dfr1.dispose();
  ok(!getBossMove('roar_dfr1_swift')
    && !ENEMY_BY_ID['boss_dfr1_roar']
    && !BOSS_KIT_BY_ID['dfr1_roar_kit'],
    'Dfr1: unload temp moves/kits/enemies');
}

// Dfr2: fireball rise/count/gap/projectileId soft; drawKind closed; dive/roar untouched
{
  ok(DFR2_FB_DEFAULTS.rise === 34 && DFR2_FB_DEFAULTS.count === 3
    && DFR2_FB_DEFAULTS.gap === 20 && DFR2_FB_DEFAULTS.projectileId === 'fireball',
    'Dfr2: fireball defaults match today literals');
  ok(fbRiseFromMove(null) === 34, 'Dfr2: null rise → 34');
  ok(fbRiseFromMove(getBossMove('fireball')) === 34, 'Dfr2: CORE fireball omit frames → 34');
  ok(fbCountFromMove(getBossMove('fireball')) === 3, 'Dfr2: CORE fireball omit count → 3');
  ok(fbGapFromMove(getBossMove('fireball')) === 20, 'Dfr2: CORE fireball omit windFrames → gap 20');
  ok(fbProjectileIdFromMove(getBossMove('fireball')) === 'fireball', 'Dfr2: CORE fireball omit projectileId → fireball');
  ok(getBossMove('fireball')?.frames == null && getBossMove('fireball')?.count == null
    && getBossMove('fireball')?.windFrames == null && getBossMove('fireball')?.projectileId == null,
    'Dfr2: CORE fireball omits frames/count/windFrames/projectileId');
  ok(fbRiseFromMove({ id: 'x', kind: 'fireball', frames: 10 }) === 10, 'Dfr2: frames=10 soft');
  ok(fbRiseFromMove({ id: 'x', kind: 'fireball', frames: 0 }) === 34, 'Dfr2: frames<=0 soft-falls');
  ok(fbRiseFromMove({ id: 'x', kind: 'fireball', frames: 999 }) === 180, 'Dfr2: frames clamp ≤180');
  ok(fbCountFromMove({ id: 'x', kind: 'fireball', count: 1 }) === 1, 'Dfr2: count=1 soft');
  ok(fbCountFromMove({ id: 'x', kind: 'fireball', count: 0 }) === 3, 'Dfr2: count<=0 soft-falls');
  ok(fbCountFromMove({ id: 'x', kind: 'fireball', count: 99 }) === 8, 'Dfr2: count clamp ≤8');
  ok(fbGapFromMove({ id: 'x', kind: 'fireball', windFrames: 6 }) === 6, 'Dfr2: windFrames=6 → gap soft');
  ok(fbGapFromMove({ id: 'x', kind: 'fireball', windFrames: 0 }) === 20, 'Dfr2: windFrames<=0 gap soft-falls');
  ok(fbProjectileIdFromMove({ id: 'x', kind: 'fireball', projectileId: 'fireball' }) === 'fireball',
    'Dfr2: projectileId=fireball');
  ok(fbProjectileIdFromMove({ id: 'x', kind: 'fireball', projectileId: 'no_such_proj_dfr2' }) === 'fireball',
    'Dfr2: missing projectileId soft→fireball');
  ok(fbProjectileIdFromMove({ id: 'x', kind: 'fireball', projectileId: '' }) === 'fireball',
    'Dfr2: empty projectileId soft→fireball');
  // dive / roar CORE stubs still omit fireball soft fields this knife cares about
  ok(getBossMove('dive')?.frames == null && getBossMove('dive')?.projectileId == null,
    'Dfr2: dive still omit frames/projectileId');
  ok(getBossMove('roar')?.projectileId == null, 'Dfr2: roar still omit projectileId');

  const dfr2 = game.plugin({
    name: 'dfr2-fireball-soft-test',
    inject: ['projectiles', 'bossMoves', 'bossKits', 'enemies'],
    apply(ctx) {
      ctx.projectiles.add({
        id: 'dfr2_swift_ball', drawKind: 'fireball', hitW: 28, hitH: 28, life: 240, attackKey: 'gFire',
      });
      ctx.bossMoves.add({
        id: 'fireball_dfr2_swift', kind: 'fireball', label: '急火',
        frames: 10, count: 1, windFrames: 6, projectileId: 'dfr2_swift_ball',
      });
      ctx.bossKits.add({
        id: 'dfr2_fb_kit',
        close: [{ move: 'fireball_dfr2_swift', weight: 100 }],
        far: [{ move: 'fireball_dfr2_swift', weight: 100 }],
      });
      ctx.enemies.add({
        id: 'boss_dfr2_fb', name: 'Dfr2急火石兽', body: 'gargoyle', isBoss: true,
        hp: 900, silhouetteId: 'gargoyle', behaviorId: 'gargoyle', kitId: 'dfr2_fb_kit',
      });
    },
  });
  ok(getProjectile('dfr2_swift_ball')?.drawKind === 'fireball', 'Dfr2: Cordis projectile registered (drawKind fireball)');
  ok(getBossMove('fireball_dfr2_swift')?.frames === 10
    && getBossMove('fireball_dfr2_swift')?.count === 1
    && getBossMove('fireball_dfr2_swift')?.windFrames === 6
    && getBossMove('fireball_dfr2_swift')?.projectileId === 'dfr2_swift_ball',
    'Dfr2: Cordis fireball frames+count+gap+projectileId registered');
  ok(fbRiseFromMove(getBossMove('fireball_dfr2_swift')) === 10, 'Dfr2: registered rise=10');
  ok(fbCountFromMove(getBossMove('fireball_dfr2_swift')) === 1, 'Dfr2: registered count=1');
  ok(fbGapFromMove(getBossMove('fireball_dfr2_swift')) === 6, 'Dfr2: registered gap=6');
  ok(fbProjectileIdFromMove(getBossMove('fireball_dfr2_swift')) === 'dfr2_swift_ball',
    'Dfr2: registered projectileId resolves');

  const gDfr2 = {
    player: { dead: false, x: 140, facing: -1, y: 0 },
    texts: { add() {} },
    talismanScripts: { playSteps() {}, start() {} },
    animScripts: { playCastAnim() {} },
    audio: {},
    fx: { flare() {}, spawn() {}, dust() {}, ring() {}, stoneShatter() {}, slashLine() {}, fire() {} },
    hitstop: 0,
    cam: { shake() {}, punch() {} },
    flashScreen() {},
    enemies: [],
    attackToken() {},
    projectiles: [] as { kind: string }[],
    bounds: { min: -2000, max: 4000 },
    areaHit() {},
    applyHitTo() {},
  } as never;

  const rnd = Math.random;
  Math.random = () => 0;

  const fbBoss = makeBoss('boss_dfr2_fb', 100, { hpScale: 1 });
  ok(fbBoss.kit === 'dfr2_fb_kit', 'Dfr2: fireball boss kit attached');
  fbBoss.setState('idle');
  fbBoss.cooldown = 0;
  (fbBoss as unknown as { roarCd: number }).roarCd = 0;
  fbBoss.update(gDfr2);
  ok(fbBoss.state === 'fbRise', `Dfr2: chooseMove fireball → fbRise (state=${fbBoss.state})`);
  // frames=10 → after chooseMove, 9 more still rising, 10th enters fbCast
  for (let i = 0; i < 9; i++) fbBoss.update(gDfr2);
  ok(fbBoss.state === 'fbRise', `Dfr2: still fbRise before rise end (state=${fbBoss.state})`);
  fbBoss.update(gDfr2);
  ok(fbBoss.state === 'fbCast', `Dfr2: frames=10 → fbCast (state=${fbBoss.state})`);

  // First shot at t>=16 with gap 6, count 1
  const gLive = gDfr2 as unknown as { projectiles: { kind: string }[] };
  for (let i = 0; i < 16; i++) fbBoss.update(gDfr2);
  ok(gLive.projectiles.length >= 1, `Dfr2: fired ≥1 projectile (n=${gLive.projectiles.length})`);
  ok(gLive.projectiles.some((p) => p.kind === 'dfr2_swift_ball'),
    'Dfr2: projectile kind = soft projectileId (discernible)');
  ok(fbBoss.state === 'fbCast' || fbBoss.state === 'fbFall',
    `Dfr2: still casting/falling after shot (state=${fbBoss.state})`);

  // Discernible vs today: CORE rise=34 would still be rising at t=10
  ok(fbRiseFromMove(getBossMove('fireball')) === 34
    && fbRiseFromMove(getBossMove('fireball_dfr2_swift')) === 10,
    'Dfr2: soft rise shorter than CORE today');
  ok(fbCountFromMove(getBossMove('fireball')) === 3
    && fbCountFromMove(getBossMove('fireball_dfr2_swift')) === 1,
    'Dfr2: soft count discernible vs CORE 3');

  Math.random = rnd;

  dfr2.dispose();
  ok(!getBossMove('fireball_dfr2_swift')
    && !getProjectile('dfr2_swift_ball')
    && !ENEMY_BY_ID['boss_dfr2_fb']
    && !BOSS_KIT_BY_ID['dfr2_fb_kit'],
    'Dfr2: unload temp moves/projectiles/kits/enemies');
}

// Dfr3: dive aim windFrames / wave radius / recover frames / optional attackKey; diveAim invuln; fb/roar untouched
{
  ok(DFR3_DIVE_DEFAULTS.aimWind === 68 && DFR3_DIVE_DEFAULTS.radius === 150
    && DFR3_DIVE_DEFAULTS.recover === 60
    && DFR3_DIVE_DEFAULTS.bodyKey === 'gDive' && DFR3_DIVE_DEFAULTS.waveKey === 'gDiveWave',
    'Dfr3: dive defaults match today literals');
  ok(diveAimWindFromMove(null) === 68, 'Dfr3: null aim wind → 68');
  ok(diveAimWindFromMove(getBossMove('dive')) === 68, 'Dfr3: CORE dive omit windFrames → 68');
  ok(diveWaveRadiusFromMove(getBossMove('dive')) === 150, 'Dfr3: CORE dive omit radius → 150');
  ok(diveRecoverFromMove(getBossMove('dive')) === 60, 'Dfr3: CORE dive omit frames → 60');
  ok(diveBodyKeyFromMove(getBossMove('dive')) === 'gDive', 'Dfr3: CORE dive omit attackKey → gDive');
  ok(diveWaveKeyFromMove(getBossMove('dive')) === 'gDiveWave', 'Dfr3: CORE dive omit attackKey → gDiveWave');
  ok(getBossMove('dive')?.windFrames == null && getBossMove('dive')?.radius == null
    && getBossMove('dive')?.frames == null && getBossMove('dive')?.attackKey == null,
    'Dfr3: CORE dive omits windFrames/radius/frames/attackKey');
  ok(diveAimWindFromMove({ id: 'x', kind: 'dive', windFrames: 12 }) === 12, 'Dfr3: windFrames=12 soft');
  ok(diveAimWindFromMove({ id: 'x', kind: 'dive', windFrames: 0 }) === 68, 'Dfr3: windFrames<=0 soft-falls');
  ok(diveAimWindFromMove({ id: 'x', kind: 'dive', windFrames: 999 }) === 180, 'Dfr3: windFrames clamp ≤180');
  ok(diveWaveRadiusFromMove({ id: 'x', kind: 'dive', radius: 80 }) === 80, 'Dfr3: radius soft');
  ok(diveWaveRadiusFromMove({ id: 'x', kind: 'dive', radius: 0 }) === 150, 'Dfr3: radius<=0 soft-falls');
  ok(diveWaveRadiusFromMove({ id: 'x', kind: 'dive', radius: 9999 }) === 600, 'Dfr3: radius clamp ≤600');
  ok(diveRecoverFromMove({ id: 'x', kind: 'dive', frames: 18 }) === 18, 'Dfr3: frames=recover soft');
  ok(diveRecoverFromMove({ id: 'x', kind: 'dive', frames: 0 }) === 60, 'Dfr3: frames<=0 soft-falls');
  ok(diveBodyKeyFromMove({ id: 'x', kind: 'dive', attackKey: 'dfr3_body' }) === 'dfr3_body', 'Dfr3: attackKey body soft');
  ok(diveWaveKeyFromMove({ id: 'x', kind: 'dive', attackKey: 'dfr3_body' }) === 'dfr3_body', 'Dfr3: attackKey wave soft same id');
  ok(diveBodyKeyFromMove({ id: 'x', kind: 'dive', attackKey: '' }) === 'gDive', 'Dfr3: empty attackKey → gDive');
  // fb / roar CORE stubs still omit dive soft fields this knife cares about; Dfr1/Dfr2 not rolled back
  ok(getBossMove('fireball')?.attackKey == null, 'Dfr3: fireball still omit attackKey');
  ok(getBossMove('roar')?.attackKey == null, 'Dfr3: roar still omit attackKey');
  ok(windFramesFromMove(getBossMove('roar'), DFR1_ROAR_DEFAULTS.wind) === 40, 'Dfr3: Dfr1 roar soft identity intact');
  ok(fbRiseFromMove(getBossMove('fireball')) === 34, 'Dfr3: Dfr2 fireball soft identity intact');

  const dfr3 = game.plugin({
    name: 'dfr3-dive-soft-test',
    inject: ['attacks', 'bossMoves', 'bossKits', 'enemies'],
    apply(ctx) {
      ctx.attacks.add({
        id: 'dfr3_dive_hit', name: 'dfr3_dive_hit', startup: 0, active: 1, recovery: 0,
        box: { x: -40, y: -80, w: 80, h: 80 },
        damage: 11, kbX: 5, kbY: -6, hitstun: 20, hitstop: 4, shake: 4,
      });
      ctx.bossMoves.add({
        id: 'dive_dfr3_swift', kind: 'dive', label: '急俯',
        windFrames: 12, radius: 80, frames: 18, attackKey: 'dfr3_dive_hit',
      });
      ctx.bossMoves.add({
        id: 'dive_dfr3_missbox', kind: 'dive', label: '空盒俯',
        windFrames: 12, radius: 80, frames: 18, attackKey: 'no_such_dfr3_box',
      });
      ctx.bossKits.add({
        id: 'dfr3_dive_kit',
        close: [{ move: 'dive_dfr3_swift', weight: 100 }],
        far: [{ move: 'dive_dfr3_swift', weight: 100 }],
      });
      ctx.bossKits.add({
        id: 'dfr3_miss_kit',
        close: [{ move: 'dive_dfr3_missbox', weight: 100 }],
        far: [{ move: 'dive_dfr3_missbox', weight: 100 }],
      });
      ctx.enemies.add({
        id: 'boss_dfr3_dive', name: 'Dfr3急俯石兽', body: 'gargoyle', isBoss: true,
        hp: 900, silhouetteId: 'gargoyle', behaviorId: 'gargoyle', kitId: 'dfr3_dive_kit',
      });
      ctx.enemies.add({
        id: 'boss_dfr3_miss', name: 'Dfr3空盒石兽', body: 'gargoyle', isBoss: true,
        hp: 900, silhouetteId: 'gargoyle', behaviorId: 'gargoyle', kitId: 'dfr3_miss_kit',
      });
    },
  });
  ok(getAttackBox('dfr3_dive_hit')?.damage === 11, 'Dfr3: Cordis attack box registered');
  ok(getBossMove('dive_dfr3_swift')?.windFrames === 12
    && getBossMove('dive_dfr3_swift')?.radius === 80
    && getBossMove('dive_dfr3_swift')?.frames === 18
    && getBossMove('dive_dfr3_swift')?.attackKey === 'dfr3_dive_hit',
    'Dfr3: Cordis dive wind+radius+frames+attackKey registered');
  ok(diveAimWindFromMove(getBossMove('dive_dfr3_swift')) === 12, 'Dfr3: registered aim wind=12');
  ok(diveWaveRadiusFromMove(getBossMove('dive_dfr3_swift')) === 80, 'Dfr3: registered radius=80');
  ok(diveRecoverFromMove(getBossMove('dive_dfr3_swift')) === 18, 'Dfr3: registered recover=18');
  ok(diveBodyKeyFromMove(getBossMove('dive_dfr3_swift')) === 'dfr3_dive_hit', 'Dfr3: registered body key');
  ok(diveWaveKeyFromMove(getBossMove('dive_dfr3_swift')) === 'dfr3_dive_hit', 'Dfr3: registered wave key');

  let lastArea: { rx: number; name: string } | null = null;
  const gDfr3 = {
    player: { dead: false, x: 140, facing: -1, y: 0 },
    texts: { add() {} },
    talismanScripts: { playSteps() {}, start() {} },
    animScripts: { playCastAnim() {} },
    audio: {},
    fx: { flare() {}, spawn() {}, dust() {}, ring() {}, stoneShatter() {}, slashLine() {} },
    hitstop: 0,
    cam: { shake() {}, punch() {} },
    flashScreen() {},
    enemies: [],
    attackToken() {},
    projectiles: [],
    bounds: { min: -2000, max: 4000 },
    areaHit(_s: unknown, _x: number, _y: number, rx: number, _ry: number, def: { name: string }) {
      lastArea = { rx, name: def.name };
    },
    applyHitTo() {},
  } as never;

  const rnd = Math.random;
  Math.random = () => 0;

  const diveBoss = makeBoss('boss_dfr3_dive', 100, { hpScale: 1 });
  ok(diveBoss.kit === 'dfr3_dive_kit', 'Dfr3: dive boss kit attached');
  diveBoss.setState('idle');
  diveBoss.cooldown = 0;
  (diveBoss as unknown as { roarCd: number }).roarCd = 0;
  diveBoss.update(gDfr3);
  ok(diveBoss.state === 'diveUp', `Dfr3: chooseMove dive → diveUp (state=${diveBoss.state})`);

  // Smoke stub has no body.step — nudge y under -180 so diveUp→diveAim fires
  diveBoss.body.y = -200;
  diveBoss.body.onGround = false;
  diveBoss.update(gDfr3);
  ok(diveBoss.state === 'diveAim', `Dfr3: diveUp → diveAim (state=${diveBoss.state})`);
  ok(diveBoss.invulnerable === true, 'Dfr3: diveAim still invulnerable');

  // windFrames=12 → after entering diveAim, need 12 ticks (spd=1) to diveDown
  for (let i = 0; i < 11; i++) diveBoss.update(gDfr3);
  ok(diveBoss.state === 'diveAim', `Dfr3: still diveAim before wind end (state=${diveBoss.state})`);
  ok(diveBoss.invulnerable === true, 'Dfr3: diveAim invuln holds through wind');
  diveBoss.update(gDfr3);
  ok(diveBoss.state === 'diveDown', `Dfr3: windFrames=12 → diveDown (state=${diveBoss.state})`);
  ok((diveBoss as unknown as { atk: { def: { name: string } } | null }).atk?.def?.name === 'dfr3_dive_hit',
    'Dfr3: dive body attackKey soft applied');

  // Land: force ground
  diveBoss.body.y = 468;
  diveBoss.body.onGround = true;
  lastArea = null;
  diveBoss.update(gDfr3);
  ok(diveBoss.state === 'recover', `Dfr3: land → recover (state=${diveBoss.state})`);
  ok(!!lastArea && lastArea.rx === 80 && lastArea.name === 'dfr3_dive_hit',
    `Dfr3: wave radius=80 + attackKey soft (got ${JSON.stringify(lastArea)})`);
  ok((diveBoss as unknown as { recoverDur: number }).recoverDur === 18,
    `Dfr3: frames recover=18 (got ${(diveBoss as unknown as { recoverDur: number }).recoverDur})`);

  // Discernible vs today
  ok(diveAimWindFromMove(getBossMove('dive')) === 68
    && diveAimWindFromMove(getBossMove('dive_dfr3_swift')) === 12,
    'Dfr3: soft aim wind shorter than CORE today');
  ok(diveWaveRadiusFromMove(getBossMove('dive')) === 150
    && diveWaveRadiusFromMove(getBossMove('dive_dfr3_swift')) === 80,
    'Dfr3: soft wave radius discernible vs CORE 150');

  // Missing attackKey box → soft-skip (no areaHit / no body atk)
  const missBoss = makeBoss('boss_dfr3_miss', 100, { hpScale: 1 });
  missBoss.setState('idle');
  missBoss.cooldown = 0;
  (missBoss as unknown as { roarCd: number }).roarCd = 0;
  missBoss.update(gDfr3);
  ok(missBoss.state === 'diveUp', `Dfr3: missbox chooseMove → diveUp (state=${missBoss.state})`);
  missBoss.body.y = -200;
  missBoss.body.onGround = false;
  missBoss.update(gDfr3);
  ok(missBoss.state === 'diveAim', `Dfr3: missbox path reached diveAim (state=${missBoss.state})`);
  for (let i = 0; i < 12; i++) missBoss.update(gDfr3);
  ok(missBoss.state === 'diveDown', `Dfr3: missbox → diveDown (state=${missBoss.state})`);
  ok((missBoss as unknown as { atk: unknown }).atk == null, 'Dfr3: missing attackKey body soft-skip');
  missBoss.body.y = 468;
  missBoss.body.onGround = true;
  lastArea = null;
  missBoss.update(gDfr3);
  ok(lastArea == null, 'Dfr3: missing attackKey wave soft-skip (no areaHit)');
  ok(missBoss.state === 'recover', 'Dfr3: missbox still recovers on land');

  Math.random = rnd;

  dfr3.dispose();
  ok(!getBossMove('dive_dfr3_swift') && !getBossMove('dive_dfr3_missbox')
    && !getAttackBox('dfr3_dive_hit')
    && !ENEMY_BY_ID['boss_dfr3_dive'] && !ENEMY_BY_ID['boss_dfr3_miss']
    && !BOSS_KIT_BY_ID['dfr3_dive_kit'] && !BOSS_KIT_BY_ID['dfr3_miss_kit'],
    'Dfr3: unload temp moves/attacks/kits/enemies');
}

// Dfr4: pack soft three + kit remap already asserted early; here live chooseMove rhythm (roarWind8 / fbRise10 / diveAim12)
{
  ok(loadPack('shixiang'), 'Dfr4 live: load shixiang');
  ok(!!getBossMove('shixiang_roar_swift') && !!getBossMove('shixiang_fireball_swift') && !!getBossMove('shixiang_dive_swift'),
    'Dfr4 live: soft three on catalog');

  const force = game.plugin({
    name: 'dfr4-force-kit-test',
    inject: ['bossKits', 'enemies'],
    apply(ctx) {
      ctx.bossKits.add({
        id: 'dfr4_force_roar',
        close: [{ move: 'shixiang_roar_swift', weight: 100 }],
        far: [{ move: 'shixiang_roar_swift', weight: 100 }],
      });
      ctx.bossKits.add({
        id: 'dfr4_force_fb',
        close: [{ move: 'shixiang_fireball_swift', weight: 100 }],
        far: [{ move: 'shixiang_fireball_swift', weight: 100 }],
      });
      ctx.bossKits.add({
        id: 'dfr4_force_dive',
        close: [{ move: 'shixiang_dive_swift', weight: 100 }],
        far: [{ move: 'shixiang_dive_swift', weight: 100 }],
      });
      ctx.enemies.add({
        id: 'boss_dfr4_roar', name: 'Dfr4短啸验', body: 'gargoyle', isBoss: true,
        hp: 900, silhouetteId: 'gargoyle', behaviorId: 'gargoyle', kitId: 'dfr4_force_roar',
      });
      ctx.enemies.add({
        id: 'boss_dfr4_fb', name: 'Dfr4急火验', body: 'gargoyle', isBoss: true,
        hp: 900, silhouetteId: 'gargoyle', behaviorId: 'gargoyle', kitId: 'dfr4_force_fb',
      });
      ctx.enemies.add({
        id: 'boss_dfr4_dive', name: 'Dfr4迅潜验', body: 'gargoyle', isBoss: true,
        hp: 900, silhouetteId: 'gargoyle', behaviorId: 'gargoyle', kitId: 'dfr4_force_dive',
      });
    },
  });

  const gDfr4 = {
    player: { dead: false, x: 140, facing: -1, y: 0 },
    texts: { add() {} },
    talismanScripts: { playSteps() {}, start() {} },
    animScripts: { playCastAnim() {} },
    audio: {},
    fx: { flare() {}, spawn() {}, dust() {}, ring() {}, stoneShatter() {}, slashLine() {}, fire() {} },
    hitstop: 0,
    cam: { shake() {}, punch() {} },
    flashScreen() {},
    enemies: [],
    attackToken() {},
    projectiles: [] as { kind: string }[],
    bounds: { min: -2000, max: 4000 },
    areaHit() {},
    applyHitTo() {},
  } as never;

  const rnd = Math.random;
  Math.random = () => 0;

  const roarBoss = makeBoss('boss_dfr4_roar', 100, { hpScale: 1 });
  roarBoss.setState('idle');
  roarBoss.cooldown = 0;
  (roarBoss as unknown as { roarCd: number }).roarCd = 0;
  roarBoss.update(gDfr4);
  ok(roarBoss.state === 'roarWind', `Dfr4 live: roar_swift → roarWind (state=${roarBoss.state})`);
  for (let i = 0; i < 7; i++) roarBoss.update(gDfr4);
  ok(roarBoss.state === 'roarWind', 'Dfr4 live: still roarWind before wind=8');
  roarBoss.update(gDfr4);
  ok(roarBoss.state === 'roar', `Dfr4 live: windFrames=8 → roar (state=${roarBoss.state})`);

  const fbBoss = makeBoss('boss_dfr4_fb', 100, { hpScale: 1 });
  fbBoss.setState('idle');
  fbBoss.cooldown = 0;
  (fbBoss as unknown as { roarCd: number }).roarCd = 0;
  fbBoss.update(gDfr4);
  ok(fbBoss.state === 'fbRise', `Dfr4 live: fireball_swift → fbRise (state=${fbBoss.state})`);
  for (let i = 0; i < 9; i++) fbBoss.update(gDfr4);
  ok(fbBoss.state === 'fbRise', 'Dfr4 live: still fbRise before rise=10');
  fbBoss.update(gDfr4);
  ok(fbBoss.state === 'fbCast', `Dfr4 live: frames=10 → fbCast (state=${fbBoss.state})`);

  const diveBoss = makeBoss('boss_dfr4_dive', 100, { hpScale: 1 });
  diveBoss.setState('idle');
  diveBoss.cooldown = 0;
  (diveBoss as unknown as { roarCd: number }).roarCd = 0;
  diveBoss.update(gDfr4);
  ok(diveBoss.state === 'diveUp', `Dfr4 live: dive_swift → diveUp (state=${diveBoss.state})`);
  diveBoss.body.y = -200;
  diveBoss.body.onGround = false;
  diveBoss.update(gDfr4);
  ok(diveBoss.state === 'diveAim', `Dfr4 live: diveUp → diveAim (state=${diveBoss.state})`);
  ok(diveBoss.invulnerable === true, 'Dfr4 live: diveAim still invulnerable');
  for (let i = 0; i < 11; i++) diveBoss.update(gDfr4);
  ok(diveBoss.state === 'diveAim', 'Dfr4 live: still diveAim before wind=12');
  diveBoss.update(gDfr4);
  ok(diveBoss.state === 'diveDown', `Dfr4 live: windFrames=12 → diveDown (state=${diveBoss.state})`);

  Math.random = rnd;
  force.dispose();
  ok(!ENEMY_BY_ID['boss_dfr4_roar'] && !BOSS_KIT_BY_ID['dfr4_force_roar']
    && !BOSS_KIT_BY_ID['dfr4_force_fb'] && !BOSS_KIT_BY_ID['dfr4_force_dive'],
    'Dfr4 live: unload force kits/enemies');

  // Pack boss path still intact (Gsm5 / BossLoad3 / slam)
  const live = makeBoss('shixiang_yexun', 100, { hpScale: 1 });
  ok(live.kit === 'shixiang_yexun', 'Dfr4 live: makeBoss kit');
  ok(live.behaviorId === 'shixiang_yexun_pace' && !!live.behaviorSteps?.length, 'Dfr4 live: Gsm5 behavior intact');
  ok(live.maxHp === 940, 'Dfr4 live: BossLoad3 yejia HP intact');
  const wClose = bossMoveWeights(live.kit, true, true);
  ok(wClose.some(([m, w]) => m === 'shixiang_roar_swift' && w === 1.5), 'Dfr4 live: close weights roar_swift');
  ok(wClose.some(([m]) => m === 'shixiang_slam_heavy'), 'Dfr4 live: slam_heavy retained');

  ok(unloadPack('shixiang')
    && !getBossMove('shixiang_roar_swift')
    && !getBossMove('shixiang_fireball_swift')
    && !getBossMove('shixiang_dive_swift')
    && !ENEMY_BY_ID['shixiang_yexun'],
    'Dfr4 live: unload soft three + boss');
  ok(getBossMove('roar')?.windFrames == null
    && getBossMove('fireball')?.frames == null
    && getBossMove('dive')?.windFrames == null,
    'Dfr4 live: CORE still omit soft after unload');
  ok(windFramesFromMove(getBossMove('roar'), 40) === 40
    && fbRiseFromMove(getBossMove('fireball')) === 34
    && diveAimWindFromMove(getBossMove('dive')) === 68,
    'Dfr4 live: CORE helpers = today defaults');
}

// Gsm5: shixiang demo hangs non-empty Boss gap loco steps; CORE gargoyle still no steps; dive stays shell
{
  ok(loadPack('shixiang'), 'Gsm5: load shixiang');
  const pace = getBehavior('shixiang_yexun_pace');
  ok(!!pace?.steps?.length, 'Gsm5: catalog behavior has steps');
  ok(pace!.steps!.some((s) => s.kind === 'facePlayer'), 'Gsm5: has facePlayer');
  ok(pace!.steps!.some((s) => s.kind === 'keepDistance'), 'Gsm5: has keepDistance');
  ok(pace!.steps!.some((s) => s.kind === 'circleStrafe'), 'Gsm5: has circleStrafe');
  ok(pace!.steps!.some((s) => s.kind === 'idlePace'), 'Gsm5: has idlePace');
  ok(pace!.steps!.some((s) => s.kind === 'phaseAtHp'), 'Gsm5: has phaseAtHp');
  ok(pace!.steps!.every((s) => BOSS_GAP_LOCO_KINDS.has(s.kind)), 'Gsm5: all top-level steps in allowlist');
  const keep = pace!.steps!.find((s) => s.kind === 'keepDistance') as { idealMin: number; idealMax: number; chase: number };
  ok(keep.idealMin === 180 && keep.idealMax === 280 && keep.chase === 520, 'Gsm5: keepDistance 180–280/chase520 (discernible)');
  ok(ENEMY_BY_ID['shixiang_yexun']?.behaviorId === 'shixiang_yexun_pace', 'Gsm5: EnemyDef.behaviorId → pace');
  ok(!getBehavior('gargoyle')?.steps?.length, 'Gsm5: CORE gargoyle behavior still no steps');

  const boss = makeBoss('shixiang_yexun', 100, { hpScale: 1 });
  ok(boss.behaviorId === 'shixiang_yexun_pace', 'Gsm5: makeBoss behaviorId');
  ok(!!boss.behaviorSteps?.length, 'Gsm5: behaviorSteps attached (≠ core null)');
  ok(boss.kit === 'shixiang_yexun', 'Gsm5: kit still shixiang_yexun (chooseMove sovereignty)');

  const gGap = {
    player: { dead: false, x: 700, facing: 1, y: 0 },
    texts: { add() {} },
    talismanScripts: { playSteps() {}, start() {} },
    animScripts: { playCastAnim() {} },
    audio: {},
    fx: { flare() {}, spawn() {}, dust() {}, ring() {} },
    hitstop: 0,
    cam: { shake() {} },
    flashScreen() {},
    enemies: [],
    attackToken() { throw new Error('Gsm5 gap must not call attackToken'); },
    projectiles: [],
    bounds: { min: -2000, max: 4000 },
  } as never;

  // Far: face+keep chase distinguishable
  boss.setState('idle');
  boss.cooldown = 90;
  boss.body.vx = 0;
  const lastMove0 = (boss as unknown as { lastMove: string }).lastMove;
  tickBossBehaviorGap(gGap, boss);
  ok(boss.state === 'walk' || boss.state === 'idle', `Gsm5: gap stays idle|walk (got ${boss.state})`);
  ok(boss.facing === 1, `Gsm5: facePlayer (facing=${boss.facing})`);
  ok(boss.body.vx > 0, `Gsm5: keepDistance chase vx>0 (vx=${boss.body.vx})`);
  ok((boss as unknown as { lastMove: string }).lastMove === lastMove0, 'Gsm5: lastMove unchanged (no chooseMove)');
  ok(boss.cooldown === 90, 'Gsm5: gap does not steal kit cooldown');

  // Full idle update still eats loco; CD ticks once
  const thinker = makeBoss('shixiang_yexun', 100, { hpScale: 1 });
  thinker.setState('idle');
  thinker.cooldown = 60;
  thinker.body.vx = 0;
  thinker.update(gGap);
  ok(thinker.state === 'idle' || thinker.state === 'walk', `Gsm5: update stays idle|walk (got ${thinker.state})`);
  ok(thinker.state !== 'diveUp' && thinker.state !== 'attack' && thinker.state !== 'aim', 'Gsm5: steps did not start high-risk/attack');
  ok(thinker.cooldown === 59, `Gsm5: update decrements kit CD once (got ${thinker.cooldown})`);
  ok(thinker.facing === 1 && (thinker.body.vx > 0 || thinker.state === 'walk'), 'Gsm5: update ate face+keep');

  // Active dive: steps must not interrupt
  const diving = makeBoss('shixiang_yexun', 100, { hpScale: 1 });
  diving.setState('diveUp');
  diving.body.vx = 4;
  const vxDive = diving.body.vx;
  tickBossBehaviorGap(gGap, diving);
  ok(diving.state === 'diveUp', 'Gsm5: diveUp not interrupted by steps');
  ok(diving.body.vx === vxDive, 'Gsm5: dive vx untouched');
  diving.update(gGap);
  ok(diving.state === 'diveUp' || diving.state === 'diveAim' || diving.state === 'diveDown' || diving.state === 'recover',
    `Gsm5: dive shell progresses without gap hijack (state=${diving.state})`);

  // CORE identity still bit-identical path (no steps)
  const core = makeBoss('gargoyle', 100, { hpScale: 1 });
  ok(!core.behaviorSteps?.length, 'Gsm5: core makeBoss still null steps');
  ok(core.behaviorId === 'gargoyle', 'Gsm5: core behaviorId=gargoyle');

  ok(unloadPack('shixiang') && !ENEMY_BY_ID['shixiang_yexun'] && !getBehavior('shixiang_yexun_pace'),
    'Gsm5: unload shixiang removes enemy+behavior');
}



// BossSil1: drawGargoyle soft-reads silhouette palette/scale (no second drawer)
{
  // Core gargoyle sil has no parts → look is identity (tint path unchanged)
  const coreSil = getSilhouette('gargoyle');
  ok(!!coreSil && (!coreSil.parts || coreSil.parts.length === 0), 'BossSil1: core gargoyle sil has no parts');
  const coreLook = resolveGargoyleSilhouetteLook(coreSil);
  ok(coreLook.scale === 1 && coreLook.skin == null && coreLook.skinB == null, 'BossSil1: core sil → identity look');
  ok(resolveGargoyleSilhouetteLook(null).scale === 1, 'BossSil1: null sil → identity');
  ok(resolveGargoyleSilhouetteLook(undefined).scale === 1, 'BossSil1: undefined sil → identity');
  ok(resolveGargoyleSilhouetteLook({ id: 'empty', body: 'gargoyle', parts: [] }).scale === 1, 'BossSil1: empty parts → identity');

  // Tint path still conceptually independent when no palette
  const tintOnly = resolveGargoyleSilhouetteLook({
    id: 'sil_scale_only', body: 'gargoyle',
    parts: [{ kind: 'scale', value: 1.1 }],
  });
  ok(tintOnly.skin == null && tintOnly.skinB == null && Math.abs(tintOnly.scale - 1.1) < 1e-9, 'BossSil1: scale-only leaves skin to tint');

  const silPlug = game.plugin({
    name: 'boss-sil1-test', inject: ['silhouettes', 'enemies'],
    apply(ctx) {
      ctx.silhouettes.add({
        id: 'boss_sil1_jade_alt',
        body: 'gargoyle',
        baseRig: 'gargoyle',
        label: '试石色',
        parts: [
          { kind: 'palette', skin: '#c050a0', arm: '#803060', coat: '#ignored_when_arm' },
          { kind: 'scale', value: 1.18 },
          { kind: 'faceMark', style: 'mask', color: '#111' }, // BossSil2 interprets; Sil1 asserts ignore
        ],
      });
      ctx.enemies.add({
        id: 'boss_sil1_demo',
        name: '试色石兽',
        isBoss: true,
        body: 'gargoyle',
        hp: 900,
        silhouetteId: 'boss_sil1_jade_alt',
        behaviorId: 'gargoyle',
      });
    },
  });
  const sil = getSilhouette('boss_sil1_jade_alt');
  ok(!!sil?.parts && sil.parts.length === 3, 'BossSil1: Cordis silhouette registered');
  const look = resolveGargoyleSilhouetteLook(sil);
  ok(look.skin === '#c050a0', `BossSil1: palette.skin applied (${look.skin})`);
  ok(look.skinB === '#803060', `BossSil1: palette.arm → skinB (${look.skinB})`);
  ok(Math.abs(look.scale - 1.18) < 1e-9, `BossSil1: scale.value applied (${look.scale})`);

  // clamp
  const hi = resolveGargoyleSilhouetteLook({
    id: 'clamp_hi', body: 'gargoyle', parts: [{ kind: 'scale', value: 3 }],
  });
  const lo = resolveGargoyleSilhouetteLook({
    id: 'clamp_lo', body: 'gargoyle', parts: [{ kind: 'scale', value: 0.1 }],
  });
  ok(hi.scale === 1.25, `BossSil1: scale clamp high (${hi.scale})`);
  ok(lo.scale === 0.85, `BossSil1: scale clamp low (${lo.scale})`);

  // coat alone → skinB when no arm
  const coatOnly = resolveGargoyleSilhouetteLook({
    id: 'coat', body: 'gargoyle',
    parts: [{ kind: 'palette', coat: '#aabbcc' }],
  });
  ok(coatOnly.skinB === '#aabbcc' && coatOnly.skin == null, 'BossSil1: coat alone → skinB');

  const boss = makeBoss('boss_sil1_demo', 0, {});
  ok(boss.silhouetteId === 'boss_sil1_jade_alt', 'BossSil1: makeBoss stores silhouetteId');
  const viaBoss = resolveGargoyleSilhouetteLook(getSilhouette(boss.silhouetteId!));
  ok(viaBoss.skin === '#c050a0' && Math.abs(viaBoss.scale - 1.18) < 1e-9, 'BossSil1: Boss silhouetteId → look');

  // core makeBoss still identity (tint path)
  const coreBoss = makeBoss('gargoyle', 0, {});
  ok(coreBoss.silhouetteId === 'gargoyle', 'BossSil1: core boss silhouetteId=gargoyle');
  const coreBossLook = resolveGargoyleSilhouetteLook(getSilhouette(coreBoss.silhouetteId!));
  ok(coreBossLook.scale === 1 && coreBossLook.skin == null && coreBossLook.skinB == null, 'BossSil1: core boss look identity');

  silPlug.dispose();
  ok(!getSilhouette('boss_sil1_jade_alt') && !ENEMY_BY_ID['boss_sil1_demo'], 'BossSil1: unload temp');
}

// BossSil2: faceMark / ornament / armorLayer / cloak.color in drawGargoyle shell
{
  // no parts → identity (Sil1 fields + Sil2 overlays absent)
  const idLook = resolveGargoyleSilhouetteLook(getSilhouette('gargoyle'));
  ok(
    idLook.scale === 1
      && idLook.skin == null
      && idLook.faceMark == null
      && !idLook.ornaments
      && !idLook.armor
      && idLook.cloakColor == null,
    'BossSil2: core sil → identity (no overlays)',
  );
  ok(
    resolveGargoyleSilhouetteLook({ id: 'empty2', body: 'gargoyle', parts: [] }).faceMark == null,
    'BossSil2: empty parts → no faceMark',
  );

  // unknown kind soft-skip (does not throw); known Sil1+Sil2 still apply
  const unk = resolveGargoyleSilhouetteLook({
    id: 'sil2_unk',
    body: 'gargoyle',
    parts: [
      { kind: 'palette', skin: '#112233' },
      { kind: 'notARealKind', style: 'x' } as any,
      { kind: 'faceMark', style: 'scar', color: '#aa0000' },
    ] as any,
  });
  ok(unk.skin === '#112233' && unk.faceMark?.style === 'scar', 'BossSil2: unknown kind soft-skip; known parts apply');

  // deferred kinds (mainhand etc.) still silent
  const defer = resolveGargoyleSilhouetteLook({
    id: 'sil2_defer',
    body: 'gargoyle',
    parts: [
      { kind: 'mainhand', shape: 'sword' },
      { kind: 'stanceBias', lean: 0.2 },
      { kind: 'ornament', slot: 'waist', style: 'bell', color: '#ffcc00' },
    ],
  });
  ok(!!defer.ornaments && defer.ornaments.length === 1 && defer.ornaments[0].style === 'bell', 'BossSil2: ornament applied; mainhand deferred');

  const sil2Plug = game.plugin({
    name: 'boss-sil2-test', inject: ['silhouettes', 'enemies'],
    apply(ctx) {
      ctx.silhouettes.add({
        id: 'boss_sil2_ornate',
        body: 'gargoyle',
        baseRig: 'gargoyle',
        label: '试饰石兽',
        parts: [
          { kind: 'palette', skin: '#708090', arm: '#505868' },
          { kind: 'scale', value: 1.05 },
          { kind: 'faceMark', style: 'mask', color: '#2a2830' },
          { kind: 'ornament', slot: 'neck', style: 'pendant', color: '#d0a040' },
          { kind: 'ornament', slot: 'waist', style: 'bell', color: '#c09030' },
          { kind: 'armorLayer', slot: 'shoulder', style: 'plate', color: '#8a8880' },
          { kind: 'armorLayer', slot: 'chest', style: 'plate', color: '#7a7870' },
          { kind: 'cloak', style: 'long', color: 'rgba(40,60,90,0.65)' },
        ],
      });
      ctx.enemies.add({
        id: 'boss_sil2_demo',
        name: '试饰石兽',
        isBoss: true,
        body: 'gargoyle',
        hp: 900,
        silhouetteId: 'boss_sil2_ornate',
        behaviorId: 'gargoyle',
      });
    },
  });
  const sil2 = getSilhouette('boss_sil2_ornate');
  ok(!!sil2?.parts && sil2.parts.length === 8, 'BossSil2: Cordis silhouette registered');
  const look2 = resolveGargoyleSilhouetteLook(sil2);
  ok(look2.faceMark?.style === 'mask' && look2.faceMark.color === '#2a2830', 'BossSil2: faceMark applied');
  ok(!!look2.ornaments && look2.ornaments.length === 2, `BossSil2: ornaments count (${look2.ornaments?.length})`);
  ok(look2.ornaments!.some((o) => o.slot === 'neck' && o.color === '#d0a040'), 'BossSil2: neck ornament');
  ok(look2.ornaments!.some((o) => o.slot === 'waist' && o.style === 'bell'), 'BossSil2: waist bell');
  ok(!!look2.armor && look2.armor.length === 2, `BossSil2: armor layers (${look2.armor?.length})`);
  ok(look2.armor!.some((a) => a.slot === 'shoulder' && a.style === 'plate'), 'BossSil2: shoulder plate');
  ok(look2.armor!.some((a) => a.slot === 'chest'), 'BossSil2: chest armor');
  ok(look2.cloakColor === 'rgba(40,60,90,0.65)', `BossSil2: cloak.color → cape (${look2.cloakColor})`);
  ok(look2.skin === '#708090' && Math.abs(look2.scale - 1.05) < 1e-9, 'BossSil2: Sil1 palette/scale still apply');

  // cloak without color → no cloakColor
  const cloakNoCol = resolveGargoyleSilhouetteLook({
    id: 'cloak_style_only', body: 'gargoyle',
    parts: [{ kind: 'cloak', style: 'ragged', sway: 1.2 }],
  });
  ok(cloakNoCol.cloakColor == null, 'BossSil2: cloak without color → no cape recolor');

  // faceMark none → present but draw skips
  const fmNone = resolveGargoyleSilhouetteLook({
    id: 'fm_none', body: 'gargoyle',
    parts: [{ kind: 'faceMark', style: 'none' }],
  });
  ok(fmNone.faceMark?.style === 'none', 'BossSil2: faceMark none recorded');

  const boss2 = makeBoss('boss_sil2_demo', 0, {});
  ok(boss2.silhouetteId === 'boss_sil2_ornate', 'BossSil2: makeBoss stores silhouetteId');
  const via2 = resolveGargoyleSilhouetteLook(getSilhouette(boss2.silhouetteId!));
  ok(
    via2.faceMark?.style === 'mask'
      && (via2.ornaments?.length ?? 0) === 2
      && (via2.armor?.length ?? 0) === 2
      && via2.cloakColor != null,
    'BossSil2: Boss silhouetteId → ornament look',
  );

  // core boss still identity
  const core2 = makeBoss('gargoyle', 0, {});
  const core2Look = resolveGargoyleSilhouetteLook(getSilhouette(core2.silhouetteId!));
  ok(
    core2Look.faceMark == null && !core2Look.ornaments && !core2Look.armor && core2Look.cloakColor == null,
    'BossSil2: core boss look identity (no overlays)',
  );

  sil2Plug.dispose();
  ok(!getSilhouette('boss_sil2_ornate') && !ENEMY_BY_ID['boss_sil2_demo'], 'BossSil2: unload temp');
}


// Silhouette parts Schema + weapon override / unknown kind reject
{
  const silPlug = game.plugin({
    name: 'sil-parts-test', inject: ['silhouettes', 'enemies'],
    apply(ctx) {
      ctx.silhouettes.add({
        id: 'sil_sword_bandit',
        body: 'axe',
        baseRig: 'axe',
        label: '试刀匪',
        parts: [
          { kind: 'mainhand', shape: 'sword', length: 48, blade: '#e9eef7', edge: '#ff4a66' },
          { kind: 'headgear', style: 'bandit' },
          { kind: 'palette', sash: '#4060a0' },
        ],
      });
      ctx.enemies.add({
        id: 'sil_sword_bandit_e', name: '试刀匪', body: 'axe', hp: 40,
        silhouetteId: 'sil_sword_bandit',
        gear: [{ id: 'silver' }],
      });
    },
  });
  const sil = getSilhouette('sil_sword_bandit');
  ok(!!sil?.parts && sil.parts.length === 3, 'silhouette parts registered');
  ok(sil?.baseRig === 'axe', 'silhouette baseRig retained');
  const inline = resolveSilhouetteWeaponLook(sil, null);
  ok(inline?.shape === 'sword' && inline?.length === 48, 'inline mainhand shape/length');
  const e = makeEnemy('sil_sword_bandit_e', 10, { eliteChance: 0 });
  ok(e.loadout?.heldWeapon?.id === 'silver', 'gear silver as heldWeapon');
  const gearLook = resolveSilhouetteWeaponLook(sil, e.loadout?.heldWeapon ?? null);
  ok(gearLook?.shape === 'sword' && gearLook?.blade === WEAPON_BY_ID['silver']?.blade, 'gear weapon overrides silhouette mainhand');
  ok(gearLook?.sprite?.sheetId === 'blade_ink', 'gear override keeps weapon sprite');
  // unknown part kind must be rejected
  let rejected = false;
  const bad = game.plugin({
    name: 'sil-bad-part', inject: ['silhouettes'],
    apply(ctx) {
      const before = ctx.silhouettes.has('sil_bad');
      ctx.silhouettes.add({
        id: 'sil_bad', body: 'axe',
        parts: [{ kind: 'laserCannon' as 'mainhand' }],
      } as never);
      rejected = before === false && !ctx.silhouettes.has('sil_bad');
    },
  });
  ok(rejected, 'unknown silhouette part kind rejected');
  bad.dispose();
  silPlug.dispose();
  ok(!getSilhouette('sil_sword_bandit') && !ENEMY_BY_ID['sil_sword_bandit_e'], 'unload sil parts test');
}

// BehaviorStep Schema accept + unknown kind reject
{
  const behPlug = game.plugin({
    name: 'beh-steps-test', inject: ['behaviors', 'enemies'],
    apply(ctx) {
      ctx.behaviors.add({
        id: 'beh_mid_axe',
        body: 'axe',
        label: '试斧中距',
        steps: [
          { kind: 'keepDistance', idealMin: 60, idealMax: 110, chase: 200 },
          { kind: 'meleeAttack', attackKey: 'axeChop', rangeMax: 90, weight: 2, cooldown: 40 },
          { kind: 'facePlayer' },
        ],
      });
      ctx.enemies.add({
        id: 'beh_mid_axe_e', name: '试斧', body: 'axe', hp: 40,
        behaviorId: 'beh_mid_axe',
      });
    },
  });
  const beh = getBehavior('beh_mid_axe');
  ok(!!beh?.steps && beh.steps.length === 3, 'behavior steps registered');
  const be = makeEnemy('beh_mid_axe_e', 20, { eliteChance: 0 });
  ok(!!be.behaviorSteps && be.behaviorSteps[0]!.kind === 'keepDistance', 'enemy attaches behavior steps');
  let behRejected = false;
  const badBeh = game.plugin({
    name: 'beh-bad-step', inject: ['behaviors'],
    apply(ctx) {
      const before = ctx.behaviors.has('beh_bad');
      ctx.behaviors.add({
        id: 'beh_bad', body: 'axe',
        steps: [{ kind: 'laserBeam' as 'facePlayer' }],
      } as never);
      behRejected = before === false && !ctx.behaviors.has('beh_bad');
    },
  });
  ok(behRejected, 'unknown BehaviorStep kind rejected');
  badBeh.dispose();
  behPlug.dispose();
  ok(!getBehavior('beh_mid_axe') && !ENEMY_BY_ID['beh_mid_axe_e'], 'unload beh steps test');
}

// Plugin-added skill with effect data is readable by effectsAtRank
const fxSkill = game.plugin({
  name: 'fx-skill-test', inject: ['skills', 'pills', 'affixes', 'enemies', 'fragments', 'bossKits', 'armorPieces', 'eliteMods'],
  apply(ctx) {
    ctx.skills.add({
      id: 'testgang', name: '试炼罡', fogName: '武学·试??', kind: 'passive', track: 'combat',
      lore: '试炼用。', tip: '减伤', profHint: '试炼', meditateCost: {}, fee: 0,
      effects: { defBonus: [0.05, 0.07, 0.09, 0.11, 0.15] },
    });
    ctx.pills.add({
      id: 'testpill', name: '试炼丹', lore: '试炼。', tip: '回血', cost: { herb: 1 }, fee: 1, carryCap: 1,
      effect: { heal: 12, floatText: '试炼丹', sfx: 'potion' },
    });
    ctx.affixes.add({
      id: 'testmist', name: '试炼雾', fogName: '??·试', desc: '试炼用雾', color: '#80ff80',
      dotPeriod: 40, dotDamage: 3, evolveTo: 'zhanghai', evolveAfter: 120,
    });
    ctx.enemies.add({
      id: 'testbandit', name: '试炼山贼', body: 'axe', hp: 55, dropChance: 0.25, eliteEligible: true,
    });
    ctx.fragments.add({
      id: 'testfrag', name: '试炼残页', fogName: '残页·试', desc: '试', color: '#80ff80', tag: 'qi', skillDmgMul: 1.5,
    });
    ctx.bossKits.add({
      id: 'testkit', close: [{ move: 'claw', weight: 9 }], far: [{ move: 'walk', weight: 1 }],
    });
    ctx.armorPieces.add({
      id: 'testcloth', name: '试炼衣', slot: 'body', lore: '试', base: { hp: 3 }, weight: 1, common: true,
    });
    ctx.eliteMods.add({
      id: 'testelite', name: '试炼精英', tag: '试', color: '#80ff80',
      weaponCounters: [{ category: 'blade', label: '克制·试', dmgMul: 1.3, poiseMul: 1.1 }],
    });
  },
});
ok(effectsAtRank('testgang', 5).defBonus === 0.15, 'plugin skill effectsAtRank reads def');
ok(PILL_BY_ID['testpill']?.effect?.heal === 12, 'plugin pill effect on def');
ok(AFFIX_BY_ID['testmist']?.dotPeriod === 40 && AFFIX_BY_ID['testmist']?.evolveTo === 'zhanghai', 'plugin affix effect fields');
ok(ENEMY_BY_ID['testbandit']?.body === 'axe' && ENEMY_BY_ID['testbandit']?.hp === 55, 'plugin enemy archetype');
ok(FRAGMENT_BY_ID['testfrag']?.skillDmgMul === 1.5, 'plugin fragment registered');
ok(BOSS_KIT_BY_ID['testkit']?.close[0]?.weight === 9, 'plugin boss kit registered');
ok(ARMOR_BY_ID['testcloth']?.base.hp === 3, 'plugin armor piece registered');
ok(weaponCounterElite('blade', 'testelite')?.dmgMul === 1.3, 'plugin elite weaponCounter readable');
fxSkill.dispose();
ok(!SKILL_BY_ID['testgang'] && !PILL_BY_ID['testpill'], 'plugin effect entries removed on unload');
ok(!AFFIX_BY_ID['testmist'] && !ENEMY_BY_ID['testbandit'], 'plugin affix/enemy removed on unload');
ok(!FRAGMENT_BY_ID['testfrag'] && !BOSS_KIT_BY_ID['testkit'] && !ARMOR_BY_ID['testcloth'], 'plugin fragment/bossKit/armorPiece removed');
ok(!ELITE_MOD_BY_ID['testelite'], 'plugin elite mod removed on unload');

// Optional plugin affix with weight can be selected by catalog pickers
const heavyPick = game.plugin({
  name: 'affix-weight-test', inject: ['affixes'],
  apply(ctx) {
    ctx.affixes.add({
      id: 'heavymist', name: '重雾', fogName: '??·重', desc: '试炼权重', color: '#40ff40',
      primaryWeight: 100000, secondaryWeight: 100000,
      dotPeriod: 90, dotDamage: 1,
    });
  },
});
ok(AFFIX_BY_ID['heavymist']?.primaryWeight === 100000, 'plugin affix weight registered');
ok(primaryAffixPool().some((a) => a.id === 'heavymist'), 'plugin affix enters primary pool');
{
  // Heavy weight dominates for seeds that land past core mass (~40); sample many acts.
  const wins = Array.from({ length: 80 }, (_, i) => pickAffixForAct(i)).filter((id) => id === 'heavymist').length;
  ok(wins >= 70, `plugin primaryWeight wins most picks (${wins}/80)`);
  ok(pickAffixForAct(3) === 'heavymist', 'plugin primaryWeight wins act3');
}
ok(pickSecondaryAffix('duwu', 3) === 'heavymist', 'plugin secondaryWeight can win secondary pick');
heavyPick.dispose();
ok(!AFFIX_BY_ID['heavymist'] && !primaryAffixPool().some((a) => a.id === 'heavymist'), 'weighted plugin affix removed; pickers back to core');

// Override + restore in place (weapons + new catalog)
const silverIdx = WEAPONS.findIndex((w) => w.id === 'silver');
const orig = WEAPON_BY_ID['silver'];
const origSkill = SKILL_BY_ID['qinggong'];
const origFrag = FRAGMENT_BY_ID['lieqi'];
const origBuyi = ARMOR_BY_ID['buyi'];
const origStone = BOSS_KIT_BY_ID['stone'];
const fork = game.plugin({
  name: 'override-test', inject: ['weapons', 'stages', 'acts', 'skills', 'affixes', 'enemies', 'fragments', 'armorPieces', 'bossKits'],
  apply(ctx) {
    ctx.weapons.add({ ...orig!, name: '覆盖测试' });
    ctx.skills.add({ ...origSkill!, name: '轻功·改' });
    ctx.affixes.add({ ...AFFIX_BY_ID['duwu']!, name: '毒雾·改', dotPeriod: 80 });
    ctx.enemies.add({ ...ENEMY_BY_ID['axe']!, name: '山贼·改', hp: 66 });
    ctx.fragments.add({ ...origFrag!, name: '裂气·改', skillDmgMul: 1.5 });
    ctx.armorPieces.add({ ...origBuyi!, name: '布衣·改', base: { hp: 9, def: 1 } });
    ctx.bossKits.add({ ...origStone!, close: [{ move: 'claw', weight: 99 }, { move: 'roar', weight: 1.4 }] });
    ctx.stages.add({ ...CHAPTERS[3]!, actIndex: 4, id: 'act5' });
    ctx.acts.pool(4, ACT_POOLS[3]!);
  },
});
ok(WEAPONS[silverIdx]!.name === '覆盖测试' && WEAPONS.length === after.weapons.length, 'override replaces in place');
ok(SKILL_BY_ID['qinggong']!.name === '轻功·改' && SKILLS.length === after.skills.length, 'skill override in place');
ok(AFFIX_BY_ID['duwu']!.name === '毒雾·改' && AFFIX_BY_ID['duwu']!.dotPeriod === 80, 'affix override in place');
ok(ENEMY_BY_ID['axe']!.name === '山贼·改' && ENEMY_BY_ID['axe']!.hp === 66, 'enemy override in place');
ok(FRAGMENT_BY_ID['lieqi']!.name === '裂气·改' && ARMOR_BY_ID['buyi']!.name === '布衣·改', 'fragment/armor override in place');
ok(BOSS_KIT_BY_ID['stone']!.close[0]!.weight === 99, 'boss kit override in place');
ok(actCount() === 5 && getChapter(4).id === 'act5', 'extra act appended');
fork.dispose();
ok(WEAPONS[silverIdx] === orig, 'override removed, original restored in same slot');
ok(SKILL_BY_ID['qinggong'] === origSkill && AFFIX_BY_ID['duwu']!.name === '毒雾' && AFFIX_BY_ID['duwu']!.dotPeriod === 90, 'skill/affix restored');
ok(ENEMY_BY_ID['axe']!.name === '山贼亡魂' && ENEMY_BY_ID['axe']!.hp === 60, 'enemy restored');
ok(FRAGMENT_BY_ID['lieqi'] === origFrag && ARMOR_BY_ID['buyi'] === origBuyi && BOSS_KIT_BY_ID['stone'] === origStone, 'fragment/armor/bossKit restored');
ok(actCount() === 4 && CHAPTERS.length === 4 && ACT_POOLS.length === 4, 'extra act removed');

// X5: enemy attack pose reads catalog `skel.*` (getPose), SKEL_ATTACKS fallback — not getAttackPose (slash1)
{
  const core = getPose('skel.thrust');
  ok(!!core?.wind && !!core?.strike && !!core?.rec, 'X5: core skel.thrust present before override');
  const coreLean = { w: core!.wind.lean, s: core!.strike.lean, r: core!.rec.lean };
  const hardLean = {
    w: SKEL_ATTACKS.thrust.wind.lean,
    s: SKEL_ATTACKS.thrust.strike.lean,
    r: SKEL_ATTACKS.thrust.rec.lean,
  };
  ok(coreLean.w === hardLean.w && coreLean.s === hardLean.s && coreLean.r === hardLean.r,
    'X5: core skel.thrust lean matches SKEL_ATTACKS.thrust before override');
  // Document why enemy path must not bare-call getAttackPose as primary:
  ok(getAttackPose('missing_skel_pose_xyz')?.id === 'slash1', 'X5: getAttackPose missing → slash1 (hunter; unsuitable for trash)');

  const OV_W = 0.91, OV_S = -0.77, OV_R = 0.63;
  const OV_ROT_W = 0.44, OV_ROT_S = -0.33, OV_ROT_R = 0.22;
  const plug = game.plugin({
    name: 'x5-skel-thrust-override',
    inject: ['poses'],
    apply(ctx) {
      // Distinguishable lean/rot on all three frames vs CORE/SKEL defaults
      ctx.poses.add({
        id: 'skel.thrust',
        wind: P({ ...SKEL_ATTACKS.thrust.wind, lean: OV_W, rot: OV_ROT_W }),
        strike: P({ ...SKEL_ATTACKS.thrust.strike, lean: OV_S, rot: OV_ROT_S }),
        rec: P({ ...SKEL_ATTACKS.thrust.rec, lean: OV_R, rot: OV_ROT_R }),
      });
    },
  });
  const ov = getPose('skel.thrust');
  ok(!!ov && ov.wind.lean === OV_W && ov.strike.lean === OV_S && ov.rec.lean === OV_R,
    'X5: Cordis poses.add overrides skel.thrust lean (wind/strike/rec)');
  ok(!!ov && ov.wind.rot === OV_ROT_W && ov.strike.rot === OV_ROT_S && ov.rec.rot === OV_ROT_R,
    'X5: Cordis override skel.thrust rot (wind/strike/rec)');
  ok(
    ov!.wind.lean !== hardLean.w && ov!.strike.lean !== hardLean.s && ov!.rec.lean !== hardLean.r,
    'X5: override leans differ from SKEL_ATTACKS/CORE defaults',
  );

  // Same resolve path as enemy.computePose attack branch (getPose → SKEL fallback)
  const name = 'thrust';
  const set = getPose(`skel.${name}`) ?? SKEL_ATTACKS[name] ?? SKEL_ATTACKS.axe;
  ok(set === ov && set.wind.lean === OV_W && set.strike.lean === OV_S && set.rec.lean === OV_R,
    'X5: enemy resolve path getPose(skel.thrust) hits override (not hard SKEL)');

  // Minimal AttackPoses consumer (attackPose) — active-ish frame leans toward strike
  const def = SPEAR_THRUST;
  ok(!!def && def.name === 'thrust', 'X5: SPEAR_THRUST def for attackPose smoke');
  const inst = { def, f: def.startup, hit: new Set() };
  const struck = attackPose(inst, set, P({ lean: 0 }));
  ok(typeof struck.lean === 'number' && struck.lean !== hardLean.s,
    'X5: attackPose consumes override AttackPoses (lean not CORE strike alone)');

  // Live enemy draw path: spear + attack + thrust → computePose eats catalog
  const e = makeEnemy('spear', 0, { eliteChance: 0 });
  ok(!!e && e.kind === 'spear', 'X5: makeEnemy spear for computePose');
  e.setState('attack');
  e.atk = { def, f: def.startup, hit: new Set() };
  const live = e.computePose();
  // At f=startup, attackPose lerps wind→strike; must not match pre-override hard strike lean alone,
  // and must differ from resolving with SKEL_ATTACKS only.
  const hardStruck = attackPose(inst, SKEL_ATTACKS.thrust, P({ lean: 0 }));
  ok(live.lean !== hardStruck.lean || live.rot !== hardStruck.rot,
    'X5: spear Enemy.computePose attack uses catalog override (differs from SKEL-only)');

  plug.dispose();
  const restored = getPose('skel.thrust');
  ok(!!restored && restored.wind.lean === hardLean.w && restored.strike.lean === hardLean.s && restored.rec.lean === hardLean.r,
    'X5: unload restores core skel.thrust');
}

// G4: Boss attack pose reads catalog `garg.*` (getPose), GARG_ATTACKS fallback — not getAttackPose (slash1)
{
  const core = getPose('garg.claw1');
  ok(!!core?.wind && !!core?.strike && !!core?.rec, 'G4: core garg.claw1 present before override');
  const coreLean = { w: core!.wind.lean, s: core!.strike.lean, r: core!.rec.lean };
  const hardLean = {
    w: GARG_ATTACKS.claw1.wind.lean,
    s: GARG_ATTACKS.claw1.strike.lean,
    r: GARG_ATTACKS.claw1.rec.lean,
  };
  ok(coreLean.w === hardLean.w && coreLean.s === hardLean.s && coreLean.r === hardLean.r,
    'G4: core garg.claw1 lean matches GARG_ATTACKS.claw1 before override');
  ok(getAttackPose('missing_garg_pose_xyz')?.id === 'slash1', 'G4: getAttackPose missing → slash1 (hunter; unsuitable for Boss)');

  const OV_W = 0.88, OV_S = -0.71, OV_R = 0.59;
  const OV_ROT_W = 0.41, OV_ROT_S = -0.29, OV_ROT_R = 0.18;
  const plug = game.plugin({
    name: 'g4-garg-claw1-override',
    inject: ['poses'],
    apply(ctx) {
      ctx.poses.add({
        id: 'garg.claw1',
        wind: P({ ...GARG_ATTACKS.claw1.wind, lean: OV_W, rot: OV_ROT_W }),
        strike: P({ ...GARG_ATTACKS.claw1.strike, lean: OV_S, rot: OV_ROT_S }),
        rec: P({ ...GARG_ATTACKS.claw1.rec, lean: OV_R, rot: OV_ROT_R }),
      });
    },
  });
  const ov = getPose('garg.claw1');
  ok(!!ov && ov.wind.lean === OV_W && ov.strike.lean === OV_S && ov.rec.lean === OV_R,
    'G4: Cordis poses.add overrides garg.claw1 lean (wind/strike/rec)');
  ok(!!ov && ov.wind.rot === OV_ROT_W && ov.strike.rot === OV_ROT_S && ov.rec.rot === OV_ROT_R,
    'G4: Cordis override garg.claw1 rot (wind/strike/rec)');
  ok(
    ov!.wind.lean !== hardLean.w && ov!.strike.lean !== hardLean.s && ov!.rec.lean !== hardLean.r,
    'G4: override leans differ from GARG_ATTACKS/CORE defaults',
  );

  // Same resolve path as Gargoyle.computePose attack branch (getPose → GARG fallback)
  const name = 'claw1';
  const set = getPose(`garg.${name}`) ?? GARG_ATTACKS[name] ?? GARG_ATTACKS.claw1;
  ok(set === ov && set.wind.lean === OV_W && set.strike.lean === OV_S && set.rec.lean === OV_R,
    'G4: boss resolve path getPose(garg.claw1) hits override (not hard GARG)');

  const def = getAttackBox('claw1');
  ok(!!def && def.name === 'claw1', 'G4: getAttackBox(claw1) def for attackPose smoke');
  const inst = { def, f: def.startup, hit: new Set() };
  const struck = attackPose(inst, set, P({ lean: 0 }));
  ok(typeof struck.lean === 'number' && struck.lean !== hardLean.s,
    'G4: attackPose consumes override AttackPoses (lean not CORE strike alone)');

  // Live Boss draw path: makeBoss + attack + claw1 → computePose eats catalog
  const boss = makeBoss('gargoyle', 100, { hpScale: 1 });
  ok(!!boss, 'G4: makeBoss gargoyle for computePose');
  boss.setState('attack');
  boss.atk = { def, f: def.startup, hit: new Set() };
  const live = boss.computePose({ tick: 0 } as never);
  const hardStruck = attackPose(inst, GARG_ATTACKS.claw1, P({ lean: 0 }));
  ok(live.lean !== hardStruck.lean || live.rot !== hardStruck.rot,
    'G4: Gargoyle.computePose attack uses catalog override (differs from GARG-only)');

  // Idle soft map: catalog garg.idle.strike if registered
  const IDLE_LEAN = 0.73;
  const idlePlug = game.plugin({
    name: 'g4-garg-idle-override',
    inject: ['poses'],
    apply(ctx) {
      ctx.poses.add({
        id: 'garg.idle',
        wind: P({ lean: IDLE_LEAN }),
        strike: P({ lean: IDLE_LEAN }),
        rec: P({ lean: IDLE_LEAN }),
      });
    },
  });
  // sweep/summonAdds return softGp('idle') directly (default idle cycles idle↔idle2)
  boss.setState('sweep');
  boss.atk = null;
  const idleLive = boss.computePose({ tick: 0 } as never);
  ok(idleLive.lean === IDLE_LEAN, 'G4: softGp idle maps getPose(garg.idle).strike');
  idlePlug.dispose();

  plug.dispose();
  const restoredG = getPose('garg.claw1');
  ok(!!restoredG && restoredG.wind.lean === hardLean.w && restoredG.strike.lean === hardLean.s && restoredG.rec.lean === hardLean.r,
    'G4: unload restores core garg.claw1');
}

// G5: Boss AttackDef 浅迁 — claw/charge/dive/roar/fireball 只经 getAttackBox；运行路径不硬挂 bossMoves 常量
{
  const BOSS_BOX_IDS = ['claw1', 'claw2', 'claw3', 'gCharge', 'gDive', 'gDiveWave', 'gRoar', 'gFire'] as const;
  for (const k of BOSS_BOX_IDS) {
    ok(!!getAttackBox(k), `G5: getAttackBox('${k}') seeded`);
  }
  ok(getAttackBox('claw1')?.damage === 11 && getAttackBox('claw1')?.startup === 20, 'G5: claw1 feel matches seed');
  ok(getAttackBox('claw3')?.damage === 17 && getAttackBox('claw3')?.box?.w === 120, 'G5: claw3 box/dmg intact');
  ok(getAttackBox('gCharge')?.damage === 18 && getAttackBox('gDive')?.unblockable === true, 'G5: charge/dive feel intact');
  ok(getAttackBox('gFire')?.name === 'gFire' && getAttackBox('gRoar')?.knockdown === true, 'G5: fire/roar name/flags');
  // Seed mirror (deprecated) matches catalog — same pattern as A1 bodyAttacks
  ok(BUILTIN_BOSS_ATTACKS.claw1.damage === getAttackBox('claw1')!.damage, 'G5: seed table mirrors catalog claw1');
  ok(BUILTIN_BOSS_ATTACKS.gCharge.box.w === getAttackBox('gCharge')!.box.w, 'G5: seed table mirrors catalog gCharge box');

  // Live Boss path: startAttack via catalog id (same resolve as chooseMove claw branch)
  const boss = makeBoss('gargoyle', 200, { hpScale: 1 });
  ok(!!boss, 'G5: makeBoss for claw catalog path');
  const claw1 = getAttackBox('claw1')!;
  boss.startAttack(claw1);
  ok(!!boss.atk && boss.atk.def.name === 'claw1' && boss.atk.def === claw1,
    'G5: Boss claw hitbox is catalog AttackBoxDef (same ref as getAttackBox)');
  ok(boss.atk!.def.damage === 11 && boss.atk!.def.box.w === 100, 'G5: live atk.def feel = catalog');
  ok(!getAttackBox('missing_boss_claw_g5_xyz'), 'G5: unknown boss box id soft-absent');

  // Cordis override: content can replace claw1 damage without TS const
  const plug = game.plugin({
    name: 'g5-boss-claw-override',
    inject: ['attacks'],
    apply(ctx) {
      ctx.attacks.add({
        id: 'claw1',
        name: 'claw1',
        startup: 20, active: 5, recovery: 8,
        box: { x: 10, y: -140, w: 100, h: 125 },
        damage: 99, kbX: 4, kbY: 0, hitstun: 22, hitstop: 7, shake: 5, parryable: true, swing: 'claw',
        moveX: 4, moveFrames: 24,
      });
    },
  });
  ok(getAttackBox('claw1')?.damage === 99, 'G5: Cordis attacks.add overrides claw1 damage');
  boss.startAttack(getAttackBox('claw1')!);
  ok(boss.atk!.def.damage === 99, 'G5: Boss startAttack eats overridden catalog claw1');
  plug.dispose();
  ok(getAttackBox('claw1')?.damage === 11, 'G5: unload restores core claw1 damage');
}


// Pose1: playPose timeline? strike|full — default strike; full winds→strike→rec by frames ratio
{
  const POSE_ID = 'pose1_tri_state_smoke';
  const W_LEAN = 0.91, S_LEAN = -0.77, R_LEAN = 0.63;
  const plug = game.plugin({
    name: 'pose1-playpose-timeline',
    inject: ['poses', 'animRecipes'],
    apply(ctx) {
      ctx.poses.add({
        id: POSE_ID,
        wind: P({ lean: W_LEAN, rot: 0.4, fa: 0.1 }),
        strike: P({ lean: S_LEAN, rot: -0.3, fa: 1.2 }),
        rec: P({ lean: R_LEAN, rot: 0.2, fa: 0.5 }),
      });
      ctx.animRecipes.add({
        id: 'pose1_strike_only',
        label: 'Pose1 strike',
        steps: [{ kind: 'playPose', poseId: POSE_ID, frames: 12 }],
      });
      ctx.animRecipes.add({
        id: 'pose1_full_timeline',
        label: 'Pose1 full',
        steps: [{ kind: 'playPose', poseId: POSE_ID, frames: 12, timeline: 'full' }],
      });
    },
  });

  const def = getPose(POSE_ID);
  ok(!!def && def.wind.lean === W_LEAN && def.strike.lean === S_LEAN && def.rec.lean === R_LEAN,
    'Pose1: synthetic pose three frames distinct');

  // Schema accepts timeline lit
  let schemaOk = true;
  try {
    validateAnimSteps([{ kind: 'playPose', poseId: POSE_ID, frames: 12, timeline: 'full' }], 'pose1');
    validateAnimSteps([{ kind: 'playPose', poseId: POSE_ID, frames: 12, timeline: 'strike' }], 'pose1s');
    validateAnimSteps([{ kind: 'playPose', poseId: POSE_ID, frames: 12 }], 'pose1d');
  } catch {
    schemaOk = false;
  }
  ok(schemaOk, 'Pose1: Schema accepts playPose.timeline strike|full|absent');

  let schemaReject = false;
  try {
    validateAnimSteps([{ kind: 'playPose', poseId: POSE_ID, timeline: 'lerp' } as never], 'pose1bad');
  } catch {
    schemaReject = true;
  }
  ok(schemaReject, 'Pose1: Schema rejects unknown timeline lit');

  const mkCaster = () => ({
    dead: false,
    animPoseOverride: null as Pose | null,
    animPoseT: 0,
    animTintT: 0,
    animTrailT: 0,
    animHoverT: 0,
    animScaleT: 0,
    animScale: 1,
    body: { noGravity: false },
    facing: 1 as const,
    x: 0, y: 0,
    team: 'player' as const,
  });

  // Default / no timeline → strike freeze
  {
    const caster = mkCaster();
    const gMock = { player: caster, enemies: [], boss: null } as never;
    const ap = new AnimScriptPlayer();
    ap.play(gMock, [{ kind: 'playPose', poseId: POSE_ID, frames: 12 }], '#e8d0a0', caster as never);
    ap.update(gMock);
    ok(!!caster.animPoseOverride && caster.animPoseOverride.lean === S_LEAN,
      'Pose1: no timeline → override === strike');
    // stay strike after a few ticks
    for (let i = 0; i < 5; i++) ap.update(gMock);
    ok(!!caster.animPoseOverride && caster.animPoseOverride.lean === S_LEAN,
      'Pose1: no timeline stays strike across ticks');
  }

  // timeline:'strike' explicit
  {
    const caster = mkCaster();
    const gMock = { player: caster, enemies: [], boss: null } as never;
    const ap = new AnimScriptPlayer();
    ap.play(gMock, [{ kind: 'playPose', poseId: POSE_ID, frames: 12, timeline: 'strike' }], '#e8d0a0', caster as never);
    ap.update(gMock);
    ok(!!caster.animPoseOverride && caster.animPoseOverride.lean === S_LEAN,
      "Pose1: timeline:'strike' → override === strike");
  }

  // timeline:'full' frames:12 → wind→strike→rec (4+4+4)
  // After U1: wind; after U5: strike; after U9: rec
  {
    const caster = mkCaster();
    const gMock = { player: caster, enemies: [], boss: null } as never;
    const ap = new AnimScriptPlayer();
    ap.play(gMock, [{ kind: 'playPose', poseId: POSE_ID, frames: 12, timeline: 'full' }], '#e8d0a0', caster as never);
    ap.update(gMock);
    ok(!!caster.animPoseOverride && caster.animPoseOverride.lean === W_LEAN,
      "Pose1: timeline:'full' U1 → wind");
    for (let i = 0; i < 4; i++) ap.update(gMock); // U2..U5
    ok(!!caster.animPoseOverride && caster.animPoseOverride.lean === S_LEAN,
      "Pose1: timeline:'full' U5 → strike");
    for (let i = 0; i < 4; i++) ap.update(gMock); // U6..U9
    ok(!!caster.animPoseOverride && caster.animPoseOverride.lean === R_LEAN,
      "Pose1: timeline:'full' U9 → rec");
  }

  // Recipe registration path
  ok(getAnimRecipe('pose1_full_timeline')?.steps?.[0]?.kind === 'playPose', 'Pose1: anim recipe registered');
  const fullStep = getAnimRecipe('pose1_full_timeline')!.steps[0] as { timeline?: string };
  ok(fullStep.timeline === 'full', 'Pose1: recipe carries timeline:full');

  // holdPose still strike-only (no timeline field / no phase)
  {
    const caster = mkCaster();
    const gMock = { player: caster, enemies: [], boss: null } as never;
    const ap = new AnimScriptPlayer();
    ap.play(gMock, [{ kind: 'holdPose', poseId: POSE_ID, frames: 12 }], '#e8d0a0', caster as never);
    ap.update(gMock);
    ok(!!caster.animPoseOverride && caster.animPoseOverride.lean === S_LEAN,
      'Pose1: holdPose still strike-only');
    for (let i = 0; i < 5; i++) ap.update(gMock);
    ok(!!caster.animPoseOverride && caster.animPoseOverride.lean === S_LEAN,
      'Pose1: holdPose stays strike');
  }

  plug.dispose();
  ok(!getPose(POSE_ID) && !getAnimRecipe('pose1_full_timeline'), 'Pose1: unload cleans pose+recipes');
}



// Pose2: 设计台 playPose.timeline 字段 + 预览/export 对齐（不改解释器）
{
  const designerJs = readFileSync(resolve('dlc-server/public/assets/designer.js'), 'utf8');
  const previewJs = readFileSync(resolve('dlc-server/public/assets/designer-preview.js'), 'utf8');
  const schema = JSON.parse(
    readFileSync(resolve('dlc-server/public/assets/designer-schema.json'), 'utf8'),
  ) as {
    note?: string;
    animRecipes?: { steps?: Array<{ kind?: string; fields?: Array<{ key?: string; type?: string; enum?: string[]; hint?: string }> }> };
  };
  ok(typeof schema.note === 'string' && schema.note.includes('Pose2'), 'Pose2 schema note mentions Pose2');
  const play = (schema.animRecipes?.steps || []).find((s) => s.kind === 'playPose');
  const tl = play?.fields?.find((f) => f.key === 'timeline');
  ok(!!tl && tl.type === 'enum' && Array.isArray(tl.enum) && tl.enum.includes('strike') && tl.enum.includes('full'),
    'Pose2 schema playPose.timeline enum strike|full');
  ok(typeof tl?.hint === 'string' && /wind|蓄势|击发|full/i.test(tl!.hint!),
    'Pose2 schema playPose.timeline has human hint');
  // holdPose / loopPose must NOT gain timeline
  for (const kind of ['holdPose', 'loopPose'] as const) {
    const step = (schema.animRecipes?.steps || []).find((s) => s.kind === kind);
    const hasTl = !!(step?.fields || []).some((f) => f.key === 'timeline');
    ok(!hasTl, `Pose2 schema ${kind} has no timeline field`);
  }
  ok(
    designerJs.includes("path === 'timeline'")
      && designerJs.includes('全时间轴')
      && designerJs.includes('timeline:full'),
    'Pose2 designer.js: timeline enum labels + human preview',
  );
  ok(
    previewJs.includes('poseAnglesForPlayPose')
      && previewJs.includes("timeline === 'full'")
      && previewJs.includes('posePhaseFromLocalT'),
    'Pose2 designer-preview.js: full scrub three-state',
  );
  // export round-trip: deepClone path keeps timeline on steps (structural)
  const fakeExport = {
    animRecipes: [{
      id: 'pose2_roundtrip',
      label: 'Pose2 RT',
      steps: [
        { kind: 'playPose', poseId: 'slash1', frames: 12, timeline: 'full' },
        { kind: 'playPose', poseId: 'slash1', frames: 5 },
      ],
    }],
  };
  const round = JSON.parse(JSON.stringify(fakeExport)) as typeof fakeExport;
  const s0 = round.animRecipes[0].steps[0] as { timeline?: string };
  const s1 = round.animRecipes[0].steps[1] as { timeline?: string };
  ok(s0.timeline === 'full', 'Pose2 export JSON round-trip keeps timeline:full');
  ok(s1.timeline === undefined, 'Pose2 export JSON round-trip omits absent timeline (strike default)');
  // runtime Schema still accepts designer-shaped step
  let schemaOk = true;
  try {
    validateAnimSteps([{ kind: 'playPose', poseId: 'slash1', frames: 12, timeline: 'full' }], 'pose2');
  } catch {
    schemaOk = false;
  }
  ok(schemaOk, 'Pose2: runtime Schema accepts designer playPose+timeline:full');
}

// Pose3: 示范包 bingren playPose+timeline:full（Cordis+种子对齐；零核心解释器 diff）
{
  ok(loadPack('bingren'), 'Pose3: load bingren');
  const pose = getPose('bingren_canmang_pose');
  ok(!!pose && pose.wind.lean !== pose.strike.lean && pose.strike.lean !== pose.rec.lean,
    'Pose3: bingren_canmang_pose three frames distinct');
  const anim = getAnimRecipe('bingren_canmang_anim');
  const poseStep = anim?.steps?.find((s: any) => s.kind === 'playPose') as any;
  ok(!!poseStep && poseStep.poseId === 'bingren_canmang_pose' && poseStep.timeline === 'full' && poseStep.frames === 12,
    'Pose3: Cordis anim carries playPose timeline:full frames:12');
  let schemaOk = true;
  try {
    validateAnimSteps([{ kind: 'playPose', poseId: 'bingren_canmang_pose', frames: 12, timeline: 'full' }], 'pose3');
  } catch {
    schemaOk = false;
  }
  ok(schemaOk, 'Pose3: Schema accepts bingren playPose+timeline:full');
  // Runtime: recipe steps drive wind→strike→rec on real pack pose
  {
    const W = pose!.wind.lean, S = pose!.strike.lean, R = pose!.rec.lean;
    const caster = {
      dead: false,
      animPoseOverride: null as Pose | null,
      animPoseT: 0,
      animTintT: 0,
      animTrailT: 0,
      animHoverT: 0,
      animScaleT: 0,
      animScale: 1,
      body: { noGravity: false },
      facing: 1 as const,
      x: 0, y: 0,
      team: 'player' as const,
    };
    const gMock = { player: caster, enemies: [], boss: null } as never;
    const ap = new AnimScriptPlayer();
    // 只播 playPose 一步（整段 anim 含 swordQiFlash 等需完整对局图）
    ap.play(gMock, [{ kind: 'playPose', poseId: 'bingren_canmang_pose', frames: 12, timeline: 'full' }], '#7090c0', caster as never);
    ap.update(gMock);
    ok(!!caster.animPoseOverride && caster.animPoseOverride.lean === W, 'Pose3: cast U1 → wind');
    for (let i = 0; i < 4; i++) ap.update(gMock);
    ok(!!caster.animPoseOverride && caster.animPoseOverride.lean === S, 'Pose3: cast U5 → strike');
    for (let i = 0; i < 4; i++) ap.update(gMock);
    ok(!!caster.animPoseOverride && caster.animPoseOverride.lean === R, 'Pose3: cast U9 → rec');
  }
  // Seed file alignment (authoritative for remote)
  {
    const body = JSON.parse(
      readFileSync(resolve('dlc-server/packages/bingren/content.json'), 'utf8'),
    ) as { animRecipes?: Array<{ id?: string; steps?: Array<{ kind?: string; timeline?: string; frames?: number; poseId?: string }> }> };
    const seedStep = body.animRecipes?.find((r) => r.id === 'bingren_canmang_anim')?.steps?.find((s) => s.kind === 'playPose');
    ok(!!seedStep && seedStep.timeline === 'full' && seedStep.frames === 12 && seedStep.poseId === 'bingren_canmang_pose',
      'Pose3: seed content.json aligned timeline:full');
  }
  ok(unloadPack('bingren') && !getAnimRecipe('bingren_canmang_anim') && !getPose('bingren_canmang_pose') && !getPose('hp.idle'),
    'Pose3: unload cleans bingren pose+anim (+hp.idle)');
}


// Loco1: player locomotion soft-reads catalog `hp.*` (getPose?.strike), HP.* fallback — override-only (no CORE seed)
{
  ok(!getPose('hp.idle') && !getPose('hp.run1') && !getPose('hp.hurt'),
    'Loco1: hp.* not in 官方包 poses (override-only)');
  ok(locoPose('hp.idle', HP.idle) === HP.idle && locoPose('hp.hurt', HP.hurt) === HP.hurt,
    'Loco1: locoPose misses → hard HP fallback');

  const IDLE_LEAN = 0.81;
  const IDLE_ROT = 0.17;
  const poseCountBefore = listPoses().length;
  const idlePlug = game.plugin({
    name: 'loco1-hp-idle-override',
    inject: ['poses'],
    apply(ctx) {
      const frame = P({ lean: IDLE_LEAN, rot: IDLE_ROT });
      ctx.poses.add({ id: 'hp.idle', wind: frame, strike: frame, rec: frame });
    },
  });
  ok(!!getPose('hp.idle')?.strike && getPose('hp.idle')!.strike.lean === IDLE_LEAN
    && getPose('hp.idle')!.strike.rot === IDLE_ROT,
    'Loco1: Cordis poses.add overrides hp.idle lean/rot');
  ok(locoPose('hp.idle', HP.idle).lean === IDLE_LEAN && locoPose('hp.idle', HP.idle).rot === IDLE_ROT,
    'Loco1: locoPose(hp.idle) hits catalog strike');
  ok(locoPose('hp.idle', HP.idle).lean !== HP.idle.lean || locoPose('hp.idle', HP.idle).rot !== HP.idle.rot,
    'Loco1: override differs from hard HP.idle');

  const p = new Player(0);
  p.setState('idle');
  p.landT = 0;
  // cycle(a,b,phase): weight 0 when sin(phase)=-1 → pure idle (hp.idle)
  p.t = (3 * Math.PI) / (2 * 0.06);
  const live = p.computePose();
  ok(live.lean === IDLE_LEAN && live.rot === IDLE_ROT,
    'Loco1: Player.computePose idle eats catalog hp.idle strike');

  idlePlug.dispose();
  ok(!getPose('hp.idle') && locoPose('hp.idle', HP.idle) === HP.idle,
    'Loco1: unload hp.idle → hard HP.idle');
  p.setState('idle');
  p.landT = 0;
  p.t = (3 * Math.PI) / (2 * 0.06);
  const restored = p.computePose();
  ok(restored.lean === HP.idle.lean && restored.rot === HP.idle.rot,
    'Loco1: Player idle after unload matches HP.idle');

  // Optional: run1 + hurt one-liners
  const RUN_LEAN = 0.66;
  const HURT_LEAN = -0.88;
  const extra = game.plugin({
    name: 'loco1-hp-run-hurt-override',
    inject: ['poses'],
    apply(ctx) {
      const run = P({ lean: RUN_LEAN, rot: 0.22 });
      const hurt = P({ lean: HURT_LEAN, rot: -0.33 });
      ctx.poses.add({ id: 'hp.run1', wind: run, strike: run, rec: run });
      ctx.poses.add({ id: 'hp.hurt', wind: hurt, strike: hurt, rec: hurt });
    },
  });
  p.setState('run');
  p.runPhase = (3 * Math.PI) / 2; // pure run1
  ok(p.computePose().lean === RUN_LEAN, 'Loco1: Player run eats catalog hp.run1');
  p.setState('hurt');
  ok(p.computePose().lean === HURT_LEAN, 'Loco1: Player hurt eats catalog hp.hurt');
  extra.dispose();
  ok(!getPose('hp.run1') && !getPose('hp.hurt'), 'Loco1: unload cleans hp.run1/hp.hurt');
  ok(listPoses().length === poseCountBefore, 'Loco1: pose catalog size unchanged after unload (CORE 21 intact)');
}

// Loco2: trash locomotion soft-reads catalog `sp.*` (getPose?.strike), SP.* fallback — override-only (no CORE seed)
{
  ok(!getPose('sp.idle') && !getPose('sp.walk1') && !getPose('sp.walk2') && !getPose('sp.hurt'),
    'Loco2: sp.* not in 官方包 poses (override-only)');
  ok(locoPose('sp.idle', SP.idle) === SP.idle && locoPose('sp.walk1', SP.walk1) === SP.walk1
    && locoPose('sp.hurt', SP.hurt) === SP.hurt,
    'Loco2: locoPose misses → hard SP fallback');

  const WALK_LEAN = 0.73;
  const WALK_ROT = 0.19;
  const poseCountBefore = listPoses().length;
  const walkPlug = game.plugin({
    name: 'loco2-sp-walk1-override',
    inject: ['poses'],
    apply(ctx) {
      const frame = P({ lean: WALK_LEAN, rot: WALK_ROT });
      ctx.poses.add({ id: 'sp.walk1', wind: frame, strike: frame, rec: frame });
    },
  });
  ok(!!getPose('sp.walk1')?.strike && getPose('sp.walk1')!.strike.lean === WALK_LEAN
    && getPose('sp.walk1')!.strike.rot === WALK_ROT,
    'Loco2: Cordis poses.add overrides sp.walk1 lean/rot');
  ok(locoPose('sp.walk1', SP.walk1).lean === WALK_LEAN && locoPose('sp.walk1', SP.walk1).rot === WALK_ROT,
    'Loco2: locoPose(sp.walk1) hits catalog strike');
  ok(locoPose('sp.walk1', SP.walk1).lean !== SP.walk1.lean || locoPose('sp.walk1', SP.walk1).rot !== SP.walk1.rot,
    'Loco2: override differs from hard SP.walk1');

  // axe kind uses generic walk1/walk2 (not sh/sp specialized)
  const e = makeEnemy('axe', 0, { eliteChance: 0 });
  ok(!!e && e.kind === 'axe', 'Loco2: makeEnemy axe for walk computePose');
  e.setState('idle');
  e.body.vx = 1.0; // > 0.3 → walk cycle
  // cycle(a,b,phase): weight 0 when sin(phase)=-1 → pure walkA (sp.walk1)
  e.walkPhase = (3 * Math.PI) / 2;
  const liveWalk = e.computePose();
  ok(liveWalk.lean === WALK_LEAN && liveWalk.rot === WALK_ROT,
    'Loco2: Enemy.computePose walk eats catalog sp.walk1 strike');

  walkPlug.dispose();
  ok(!getPose('sp.walk1') && locoPose('sp.walk1', SP.walk1) === SP.walk1,
    'Loco2: unload sp.walk1 → hard SP.walk1');
  e.body.vx = 1.0;
  e.walkPhase = (3 * Math.PI) / 2;
  const restoredWalk = e.computePose();
  ok(restoredWalk.lean === SP.walk1.lean && restoredWalk.rot === SP.walk1.rot,
    'Loco2: Enemy walk after unload matches SP.walk1');

  // Optional: idle + hurt one-liners
  const IDLE_LEAN = 0.77;
  const HURT_LEAN = -0.91;
  const extra = game.plugin({
    name: 'loco2-sp-idle-hurt-override',
    inject: ['poses'],
    apply(ctx) {
      const idle = P({ lean: IDLE_LEAN, rot: 0.11 });
      const hurt = P({ lean: HURT_LEAN, rot: -0.27 });
      ctx.poses.add({ id: 'sp.idle', wind: idle, strike: idle, rec: idle });
      ctx.poses.add({ id: 'sp.hurt', wind: hurt, strike: hurt, rec: hurt });
    },
  });
  e.setState('idle');
  e.body.vx = 0;
  ok(e.computePose().lean === IDLE_LEAN, 'Loco2: Enemy idle (axe) eats catalog sp.idle');
  e.setState('stagger');
  ok(e.computePose().lean === HURT_LEAN, 'Loco2: Enemy stagger eats catalog sp.hurt');
  extra.dispose();
  ok(!getPose('sp.idle') && !getPose('sp.hurt'), 'Loco2: unload cleans sp.idle/sp.hurt');
  ok(listPoses().length === poseCountBefore, 'Loco2: pose catalog size unchanged after unload (CORE 21 intact)');
}

// Loco3: 设计台 poses locomotion 前缀 + 三帧同填标记 + export/apply 含 hp.idle（不改解释器）
{
  const designerJs = readFileSync(resolve('dlc-server/public/assets/designer.js'), 'utf8');
  const previewJs = readFileSync(resolve('dlc-server/public/assets/designer-preview.js'), 'utf8');
  const html = readFileSync(resolve('dlc-server/public/designer.html'), 'utf8');
  const schema = JSON.parse(
    readFileSync(resolve('dlc-server/public/assets/designer-schema.json'), 'utf8'),
  ) as {
    note?: string;
    locoPoseIds?: string[];
    poses?: { label?: string; note?: string; defFields?: Array<{ key?: string; datalist?: string; hint?: string }> };
  };
  ok(typeof schema.note === 'string' && schema.note.includes('Loco3'), 'Loco3 schema note mentions Loco3');
  ok(typeof schema.poses?.note === 'string'
    && /hp\./.test(schema.poses!.note!)
    && /sp\./.test(schema.poses!.note!)
    && /loco|locomotion|只读 strike|三帧同填/i.test(schema.poses!.note!),
    'Loco3 poses.note names hp.*/sp.* loco vs attack');
  const locoIds = schema.locoPoseIds || [];
  const need = ['hp.idle', 'hp.idle2', 'hp.run1', 'hp.run2', 'hp.hurt', 'sp.idle', 'sp.walk1', 'sp.walk2', 'sp.hurt'];
  ok(need.every((id) => locoIds.includes(id)) && locoIds.length === need.length,
    'Loco3 schema locoPoseIds closed set (9)');
  const idField = (schema.poses?.defFields || []).find((f) => f.key === 'id');
  ok(idField?.datalist === 'locoPoseIds' && typeof idField?.hint === 'string' && /hp\.idle|loco/i.test(idField!.hint!),
    'Loco3 poses.id datalist=locoPoseIds + hint');
  ok(
    designerJs.includes('三帧同填 strike')
      && designerJs.includes("field.datalist === 'locoPoseIds'")
      && designerJs.includes("id: 'hp.idle'")
      && designerJs.includes('这条 locomotion 姿态')
      && designerJs.includes("'poses'")
      && designerJs.includes('buildContentExport'),
    'Loco3 designer.js: fill-strike shortcut + datalist + hp.idle seed + human + export',
  );
  ok(
    previewJs.includes("gpKind === 'poses'")
      && previewJs.includes('loco')
      && previewJs.includes('只读 strike'),
    'Loco3 designer-preview.js: poses light loco hint',
  );
  ok(html.includes('攻击姿态（含 loco）') && /hp\.\*|locomotion/i.test(html),
    'Loco3 designer.html: poses option/hint names loco');
  // export JSON round-trip keeps hp.idle PoseDef (deepClone path)
  const fakeExport = {
    poses: [{
      id: 'hp.idle',
      wind: { y: 3, lean: 0.81, head: -0.08, rot: 0.17, ft: 0.42, fk: -0.5, bt: -0.32, bk: -0.3, fa: 0.5, fe: 1.0, ba: -0.3, be: 0.7, w: 0.55 },
      strike: { y: 3, lean: 0.81, head: -0.08, rot: 0.17, ft: 0.42, fk: -0.5, bt: -0.32, bk: -0.3, fa: 0.5, fe: 1.0, ba: -0.3, be: 0.7, w: 0.55 },
      rec: { y: 3, lean: 0.81, head: -0.08, rot: 0.17, ft: 0.42, fk: -0.5, bt: -0.32, bk: -0.3, fa: 0.5, fe: 1.0, ba: -0.3, be: 0.7, w: 0.55 },
    }],
  };
  const round = JSON.parse(JSON.stringify(fakeExport)) as typeof fakeExport;
  ok(round.poses[0].id === 'hp.idle' && round.poses[0].strike.lean === 0.81,
    'Loco3 export JSON round-trip keeps hp.idle strike.lean');
  ok(round.poses[0].wind.lean === round.poses[0].strike.lean
    && round.poses[0].rec.lean === round.poses[0].strike.lean,
    'Loco3 export JSON round-trip keeps three-frame same-fill');
  // designer-shaped applyContent → locoPose('hp.idle') hits catalog (X1 remote poses path)
  const LOCO_LEAN = 0.81;
  const LOCO_ROT = 0.17;
  const body: DlcContentBody = {
    poses: [{
      id: 'hp.idle',
      wind: { y: 3, lean: LOCO_LEAN, head: -0.08, rot: LOCO_ROT, ft: 0.42, fk: -0.5, bt: -0.32, bk: -0.3, fa: 0.5, fe: 1.0, ba: -0.3, be: 0.7, w: 0.55 },
      strike: { y: 3, lean: LOCO_LEAN, head: -0.08, rot: LOCO_ROT, ft: 0.42, fk: -0.5, bt: -0.32, bk: -0.3, fa: 0.5, fe: 1.0, ba: -0.3, be: 0.7, w: 0.55 },
      rec: { y: 3, lean: LOCO_LEAN, head: -0.08, rot: LOCO_ROT, ft: 0.42, fk: -0.5, bt: -0.32, bk: -0.3, fa: 0.5, fe: 1.0, ba: -0.3, be: 0.7, w: 0.55 },
    }],
  };
  const fork = game.plugin({
    name: 'dlc-designer-smoke-loco3-hp-idle',
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx) { applyContent(ctx, body); },
  });
  ok(!!getPose('hp.idle')?.strike && getPose('hp.idle')!.strike.lean === LOCO_LEAN,
    'Loco3 designer-shaped applyContent: getPose(hp.idle)');
  ok(locoPose('hp.idle', HP.idle).lean === LOCO_LEAN && locoPose('hp.idle', HP.idle).rot === LOCO_ROT,
    "Loco3: after apply, locoPose('hp.idle', …) eats catalog strike");
  ok(locoPose('hp.idle', HP.idle).lean !== HP.idle.lean || locoPose('hp.idle', HP.idle).rot !== HP.idle.rot,
    'Loco3: applied hp.idle differs from hard HP.idle');
  fork.dispose();
  ok(!getPose('hp.idle') && locoPose('hp.idle', HP.idle) === HP.idle,
    'Loco3 designer hp.idle smoke unload → hard HP.idle');
}

// Loco4: 示范包 bingren 覆盖 hp.idle（Cordis+种子；?pack=bingren；零核心 diff）
{
  const CANFENG_IDLE_LEAN = 0.38;
  ok(!getPose('hp.idle'), 'Loco4: baseline no hp.idle before pack');
  ok(loadPack('bingren'), 'Loco4: load bingren');
  ok(!!getPose('hp.idle')?.strike && getPose('hp.idle')!.strike.lean === CANFENG_IDLE_LEAN,
    'Loco4: Cordis hp.idle lean=0.38');
  ok(getPose('hp.idle')!.wind.lean === CANFENG_IDLE_LEAN
    && getPose('hp.idle')!.strike.lean === CANFENG_IDLE_LEAN
    && getPose('hp.idle')!.rec.lean === CANFENG_IDLE_LEAN,
    'Loco4: hp.idle three frames same (loco 同填)');
  ok(locoPose('hp.idle', HP.idle).lean === CANFENG_IDLE_LEAN
    && locoPose('hp.idle', HP.idle).lean !== HP.idle.lean,
    'Loco4: locoPose hits catalog, differs from HP.idle');

  const p = new Player(0);
  p.setState('idle');
  p.landT = 0;
  p.t = (3 * Math.PI) / (2 * 0.06); // cycle weight 0 → pure idle
  const live = p.computePose();
  ok(live.lean === CANFENG_IDLE_LEAN, 'Loco4: Player.computePose idle eats bingren hp.idle');

  // Seed alignment
  {
    const body = JSON.parse(
      readFileSync(resolve('dlc-server/packages/bingren/content.json'), 'utf8'),
    ) as { poses?: Array<{ id?: string; strike?: { lean?: number } }> };
    const seed = body.poses?.find((r) => r.id === 'hp.idle');
    ok(!!seed && seed.strike?.lean === CANFENG_IDLE_LEAN, 'Loco4: seed content.json hp.idle aligned');
  }

  ok(unloadPack('bingren') && !getPose('hp.idle') && locoPose('hp.idle', HP.idle) === HP.idle,
    'Loco4: unload → hard HP.idle');
  p.setState('idle');
  p.landT = 0;
  p.t = (3 * Math.PI) / (2 * 0.06);
  const restored = p.computePose();
  ok(restored.lean === HP.idle.lean, 'Loco4: computePose restored after unload');
}


// Invalid content is rejected, not thrown
const bad = game.plugin({
  name: 'bad-test', inject: ['weapons', 'talismans', 'skills', 'titles', 'enemies', 'affixes', 'fragments', 'bossKits', 'armorPieces'],
  apply(ctx) {
    ctx.weapons.add({ id: 'broken' } as never);
    ctx.talismans.script({ id: 'evil', steps: [{ kind: 'eval', code: 'alert(1)' } as never] });
    ctx.talismans.script({ id: 'badDamage', steps: [{ kind: 'damageRadius', rx: 'big' } as never] });
    ctx.talismans.add({
      id: 'badicon', name: '坏图标', fogName: 'x', lore: 'x', tip: 'x', color: '#fff',
      cost: { cinnabar: 1 }, fee: 1, stockCap: 1, runCharges: 1,
      icon: 'https://evil.example/tal.png',
    } as never);
    ctx.talismans.add({
      id: 'badicon2', name: '坏图标2', fogName: 'x', lore: 'x', tip: 'x', color: '#fff',
      cost: { cinnabar: 1 }, fee: 1, stockCap: 1, runCharges: 1,
      icon: 'http://evil.example/tal.png',
    } as never);
    ctx.skills.add({ id: 'noskill' } as never);
    ctx.titles.add({ id: 'badtitle', name: 'x' } as never);
    ctx.enemies.add({ id: 'nobody', name: 'x', body: 'dragon' as never, hp: 10 } as never);
    ctx.affixes.add({ id: 'nope' } as never);
    ctx.fragments.add({ id: 'badfrag', name: 'x' } as never);
    ctx.bossKits.add({ id: 'badkit' } as never);
    ctx.armorPieces.add({ id: 'badarmor', name: 'x', slot: 'wing' as never } as never);
  },
});
ok(!WEAPON_BY_ID['broken'] && !game.talismans.getScript('evil') && !game.talismans.getScript('badDamage'), 'invalid defs rejected');
ok(!('badicon' in TALISMAN_BY_ID) && !('badicon2' in TALISMAN_BY_ID), 'talisman icon http(s) rejected');
ok(!SKILL_BY_ID['noskill'] && !TITLE_BY_ID['badtitle'], 'invalid skill/title rejected');
ok(!ENEMY_BY_ID['nobody'] && !AFFIX_BY_ID['nope'], 'invalid enemy/affix rejected');
ok(!FRAGMENT_BY_ID['badfrag'] && !BOSS_KIT_BY_ID['badkit'] && !ARMOR_BY_ID['badarmor'], 'invalid fragment/bossKit/armorPiece rejected');
bad.dispose();

// Invalid plugin config is rejected by Cordis (Schema) — nothing registered, no crash
ok(!loadMenpai('chixia', { damage: 999 }) && !('chixiafu' in TALISMAN_BY_ID), 'chixia with invalid config is refused');
ok(loadMenpai('chixia', { damage: 30, bursts: 1 }) && game.talismans.getScript('chixiaBurst')?.steps.length === 2 + 8 + 1, 'chixia honours valid config');
ok(unloadMenpai('chixia') && JSON.stringify(snapshot()) === JSON.stringify(after), 'reload/unload cycle clean');
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
