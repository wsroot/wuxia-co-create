/**
 * 图鉴 — fog-until-known for mods / fragments / talismans / affixes.
 */
import type { EliteModId } from '../level/eliteMods';
import type { AffixId } from '../level/affixes';
import type { FragmentId } from './runFragments';
import type { TalismanId } from './talismans';
import type { WepAffixId } from './weaponInstAffix';

export interface CodexData {
  elites: EliteModId[];
  affixes: AffixId[];
  fragments: FragmentId[];
  talismans: TalismanId[];
  wepAffixes: WepAffixId[];
}

export function emptyCodex(): CodexData {
  return { elites: [], affixes: [], fragments: [], talismans: [], wepAffixes: [] };
}

export function codexDiscover<T extends string>(list: T[], id: T): boolean {
  if (list.includes(id)) return false;
  list.push(id);
  return true;
}
