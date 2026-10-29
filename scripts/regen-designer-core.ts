/**
 * Regen dlc-server/public/assets/designer-schema.json `core*` id snapshots
 * from official pack 长夜 (`src/content/changye` seeds).
 *
 * Usage (repo root):
 *   npx esbuild scripts/regen-designer-core.ts --bundle --platform=node --format=esm \
 *     --packages=external --outfile=node_modules/.cache/regen-designer-core.mjs --log-level=warning \
 *   && node node_modules/.cache/regen-designer-core.mjs
 *
 * Or: npm run designer:regen-core  (if wired in package.json)
 *
 * Does NOT deploy / touch :4174. Keys stay named `core*` (blueprint mid-term).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CORE_MATERIALS, CORE_WEAPONS, CORE_PILLS, CORE_TALISMANS, CORE_SCRIPTS,
  CORE_ANIM_RECIPES, CORE_STAGES, CORE_BOSS_KITS, CORE_ARMOR_SETS,
  CORE_WEP_AFFIXES, CORE_AFFIXES, CORE_ENEMIES, CORE_ELITE_MODS, CORE_TITLES,
  CORE_FRAGMENTS, CORE_ARMOR_PIECES, CORE_SKILLS, CORE_NEIGONGS,
  CORE_ATTACK_BOXES, CORE_POSES, CORE_PROJECTILES, CORE_FX_RECIPES,
  CORE_SHEETS, CORE_SFX, CORE_VOLLEYS, CORE_SILHOUETTES, CORE_BEHAVIORS,
  CORE_BACKDROPS, CORE_BOSS_MOVES, CORE_WEAPON_LOOKS, CORE_COLLIDERS,
  CORE_COMBAT_STYLES,
} from '../src/content/changye/data';

function ids(arr: { id?: string; name?: string }[]): string[] {
  return arr.map((x) => (x.id || x.name || '') as string).filter(Boolean);
}

/** Talisman-oriented anim subset used by designer talismanAnim datalist (curated; not full CORE_ANIM). */
const TALISMAN_ANIM_SUBSET = [
  'sealBurst', 'sealStampFull', 'sealRainCast', 'baguaBind', 'paperBurnBurst', 'exorcismPulse',
] as const;

const SCHEMA_PATH = resolve('dlc-server/public/assets/designer-schema.json');

function main() {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as Record<string, unknown>;

  const next: Record<string, string[] | Record<string, unknown>> = {
    coreAttackKeys: ids(CORE_ATTACK_BOXES as any),
    coreCombatStyleIds: ids(CORE_COMBAT_STYLES as any),
    coreAnimRecipeIds: ids(CORE_ANIM_RECIPES as any),
    coreTalismanAnimRecipeIds: TALISMAN_ANIM_SUBSET.filter((id) =>
      ids(CORE_ANIM_RECIPES as any).includes(id),
    ),
    coreBehaviorIds: ids(CORE_BEHAVIORS as any),
    coreSilhouetteIds: ids(CORE_SILHOUETTES as any),
    coreColliderIds: ids(CORE_COLLIDERS as any),
    coreFxRecipeIds: ids(CORE_FX_RECIPES as any),
    corePoseIds: ids(CORE_POSES as any),
    coreBossMoveIds: ids(CORE_BOSS_MOVES as any),
    coreBossKitIds: ids(CORE_BOSS_KITS as any),
    coreProjectileIds: ids(CORE_PROJECTILES as any),
    coreVolleyIds: ids(CORE_VOLLEYS as any),
    coreSheetIds: ids(CORE_SHEETS as any),
    coreSynthIds: ids(CORE_SFX as any),
    coreBackdropIds: ids(CORE_BACKDROPS as any),
    coreEliteModIds: ids(CORE_ELITE_MODS as any),
    coreFragmentIds: ids(CORE_FRAGMENTS as any),
    coreTitleIds: ids(CORE_TITLES as any),
    coreMaterialIds: ids(CORE_MATERIALS as any),
    coreArmorSetIds: ids(CORE_ARMOR_SETS as any),
    coreArmorPieceIds: ids(CORE_ARMOR_PIECES as any),
    coreWepAffixIds: ids(CORE_WEP_AFFIXES as any),
    coreAffixIds: ids(CORE_AFFIXES as any),
    corePillIds: ids(CORE_PILLS as any),
    coreNeigongIds: ids(CORE_NEIGONGS as any),
    coreWeaponIds: ids(CORE_WEAPONS as any),
    // Oc1 gaps — snapshots (+ designer.js wires enemy / script / weaponLook where datalist exists)
    coreSkillIds: ids(CORE_SKILLS as any),
    coreTalismanIds: ids(CORE_TALISMANS as any),
    coreScriptIds: ids(CORE_SCRIPTS as any),
    coreEnemyIds: ids(CORE_ENEMIES as any),
    coreStageIds: ids(CORE_STAGES as any),
    coreWeaponLookIds: ids(CORE_WEAPON_LOOKS as any),
  };

  const poseTemplates: Record<string, unknown> = {};
  for (const p of CORE_POSES as any[]) {
    if (!p?.id) continue;
    const { id, ...rest } = p;
    poseTemplates[id] = rest;
  }
  next.corePoseTemplates = poseTemplates;

  const report: { key: string; before: number | string; after: number | string; changed: boolean }[] = [];
  for (const [key, val] of Object.entries(next)) {
    const prev = schema[key];
    let before: number | string;
    let after: number | string;
    if (Array.isArray(val)) {
      before = Array.isArray(prev) ? prev.length : (prev == null ? '∅' : typeof prev);
      after = val.length;
      const same =
        Array.isArray(prev) &&
        prev.length === val.length &&
        prev.every((x, i) => x === val[i]);
      report.push({ key, before, after, changed: !same });
    } else {
      before =
        prev && typeof prev === 'object' && !Array.isArray(prev)
          ? Object.keys(prev as object).length
          : (prev == null ? '∅' : typeof prev);
      after = Object.keys(val).length;
      const same = JSON.stringify(prev) === JSON.stringify(val);
      report.push({ key, before, after, changed: !same });
    }
    schema[key] = val;
  }

  writeFileSync(SCHEMA_PATH, JSON.stringify(schema, null, 2) + '\n', 'utf8');

  console.log('Wrote', SCHEMA_PATH);
  console.log('key\tbefore\tafter\tchanged');
  for (const r of report) {
    console.log(`${r.key}\t${r.before}\t${r.after}\t${r.changed ? 'YES' : 'no'}`);
  }
}

main();
