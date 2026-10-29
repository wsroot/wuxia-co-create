/**
 * Load a remote data-only pack from DLCServer into Cordis catalogs.
 * Trusted publisher path (not arbitrary player upload).
 */
import type { ForkScope } from 'cordis';
import type { Context } from 'cordis';
import { game } from '../plugins/root';
import type { DlcContentBody, DlcKind } from './types';
import { absolutize, resolveDlcBase } from './baseUrl';

const remoteLoaded = new Map<string, ForkScope>();

/** Cordis inject list for remote data packs. */
export const REMOTE_DLC_INJECT = [
  'pills', 'materials', 'talismans',
  // R1: backdrops before stages (backdropTheme)
  'backdrops',
  // Act1: 'acts' = ActService（pool/beat SlotStack）；apply 体内专用路径，勿假灌 add
  'stages', 'acts',
  // A2: attacks before skills/behaviors (attackKey resolve)
  'attacks',
  // X1: poses + fxRecipes before animRecipes / skills (poseId / recipeId)
  'poses', 'fxRecipes',
  // R1: sheets/sfx early (sheetId / sfx); projectiles before volleys; both before behaviors
  'sheets', 'sfx', 'projectiles', 'volleys',
  // B-tier: animRecipes before skills (skill.castAnim string resolve)
  'animRecipes',
  'skills', 'neigong',
  // B-tier deps for weapons: Style + look must exist before weapon add
  'combatStyles', 'weaponLooks',
  'weapons',
  'armorSets', 'wepAffixes', 'affixes',
  // B-tier: silhouettes + behaviors + colliders before enemies
  'silhouettes', 'behaviors', 'colliders',
  // G1: bossMoves before bossKits / enemies (kit weights reference move ids)
  'bossMoves',
  'enemies', 'eliteMods', 'titles', 'bossKits', 'fragments', 'armorPieces',
] as const;

/** Apply content.json body into Cordis catalogs.
 * Order: poses + fxRecipes early (poseId / recipeId for anim/符);
 * R1 sheets/sfx early; projectiles before volleys (and before behaviors);
 * attacks early (attackKey); animRecipes before skills (castAnim);
 * combatStyles & weaponLooks before weapons;
 * silhouettes / behaviors / colliders before enemies (silhouetteId / behaviorId / colliderId);
 * bossMoves before bossKits / enemies (kit move ids);
 * R1 backdrops before stages (backdropTheme);
 * Act1 acts.pools/beats after catalogs → ctx.acts.pool / beat（禁止 add('acts')）. */
export function applyContent(ctx: Context, body: DlcContentBody): void {
  const add = (svc: string, list?: unknown[]) => {
    if (!list) return;
    for (const d of list) (ctx as any)[svc].add(d);
  };
  // X1: poses / fxRecipes before talismanScripts / animRecipes / skills
  add('poses', body.poses);
  add('fxRecipes', body.fxRecipes);
  // R1: sheets / sfx before talismanScripts / weapons (sheetId / sfx id)
  add('sheets', body.sheets);
  add('sfx', body.sfx);
  // R1: projectiles before volleys (projectileId / volleyId consumers)
  add('projectiles', body.projectiles);
  add('volleys', body.volleys);
  const t = body.talismanScripts;
  if (t) for (const s of t) (ctx as any).talismans.script(s);
  add('talismans', body.talismans);
  add('pills', body.pills);
  add('attacks', body.attacks);
  add('animRecipes', body.animRecipes);
  add('skills', body.skills);
  add('neigong', body.neigong);
  add('combatStyles', body.combatStyles);
  add('weaponLooks', body.weaponLooks);
  add('weapons', body.weapons);
  add('materials', body.materials);
  add('armorSets', body.armorSets);
  add('armorPieces', body.armorPieces);
  add('wepAffixes', body.wepAffixes);
  add('affixes', body.affixes);
  add('silhouettes', body.silhouettes);
  add('behaviors', body.behaviors);
  add('colliders', body.colliders);
  // G1: bossMoves before bossKits (and before enemies in INJECT order)
  add('bossMoves', body.bossMoves);
  add('enemies', body.enemies);
  add('eliteMods', body.eliteMods);
  add('titles', body.titles);
  add('bossKits', body.bossKits);
  add('fragments', body.fragments);
  // R1: backdrops before stages
  add('backdrops', body.backdrops);
  add('stages', body.stages);
  // Act1: 幕池在目录键之后；SlotStack 按幕序覆盖——禁止 add('acts', …)
  if (body.acts?.pools) {
    for (const row of body.acts.pools) {
      const { actIndex, ...pool } = row;
      (ctx as any).acts.pool(actIndex, pool);
    }
  }
  if (body.acts?.beats) {
    for (const row of body.acts.beats) {
      const { fromAct, ...beat } = row;
      (ctx as any).acts.beat(fromAct, beat);
    }
  }
}

function makePlugin(id: string, kind: DlcKind, body: DlcContentBody) {
  return {
    name: `dlc-remote-${kind}-${id}`,
    inject: [...REMOTE_DLC_INJECT],
    apply(ctx: Context) {
      applyContent(ctx, body);
    },
  };
}

export function isRemoteDlcLoaded(id: string): boolean {
  return remoteLoaded.has(id);
}

export function listRemoteLoaded(): string[] {
  return [...remoteLoaded.keys()];
}

export function unloadRemoteDlc(id: string): boolean {
  const fork = remoteLoaded.get(id);
  if (!fork) return false;
  fork.dispose();
  remoteLoaded.delete(id);
  return true;
}

/**
 * Fetch content.json and register as a Cordis fork.
 * `contentUrl` may be absolute or server-relative; if omitted, uses /packages/<id>/content.json.
 */
export async function loadRemoteDlc(
  id: string,
  kind: DlcKind,
  contentUrl?: string,
): Promise<boolean> {
  if (remoteLoaded.has(id)) return true;
  const base = resolveDlcBase();
  if (!base) {
    game.logger('dlc').warn('DLCServer 未配置，无法拉取远程包');
    return false;
  }
  const url = contentUrl
    ? absolutize(base, contentUrl)
    : absolutize(base, `/packages/${id}/content.json`);
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) {
      game.logger('dlc').warn(`拉取内容包失败 ${id}: HTTP ${res.status}`);
      return false;
    }
    const body = (await res.json()) as DlcContentBody;
    const plugin = makePlugin(id, kind, body);
    remoteLoaded.set(id, game.plugin(plugin));
    return true;
  } catch (e) {
    game.logger('dlc').warn(`拉取内容包失败 ${id}: ${(e as Error).message}`);
    return false;
  }
}
