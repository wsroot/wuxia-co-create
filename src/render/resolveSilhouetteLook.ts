/**
 * Resolve enemy mainhand WeaponAppearance from gear + SilhouetteDef.parts.
 * Priority: loadout gear WeaponDef → silhouette mainhand (weaponId / inline) → null (legacy).
 */
import type { SilhouetteDef, SilhouettePart } from '../meta/bTier/types';
import type { WeaponDef } from '../meta/weapons';
import { getWeapon } from '../meta/contentRegistry';
import {
  appearanceFromWeapon,
  defaultLength,
  type WeaponAppearance,
} from './drawWeaponAppearance';
import type { BladeShape } from '../meta/weapons';

const warned = new Set<string>();
function warnOnce(key: string, msg: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[silhouette] ${msg}`);
}

/** First weapons-catalog id found in gear entries (armor ids skipped). */
export function findGearWeapon(gear: { id?: string }[] | null | undefined): WeaponDef | null {
  if (!gear) return null;
  for (const g of gear) {
    if (!g.id) continue;
    const w = getWeapon(g.id);
    if (w) return w;
  }
  return null;
}

function fromMainhandPart(
  p: Extract<SilhouettePart, { kind: 'mainhand' }>,
  silId: string,
): WeaponAppearance | null {
  if (p.weaponId) {
    if (/^https?:\/\//i.test(p.weaponId) || p.weaponId.includes('://')) {
      warnOnce(`url:${silId}`, `mainhand.weaponId 禁止 URL「${p.weaponId}」`);
      return null;
    }
    const w = getWeapon(p.weaponId);
    if (w) return appearanceFromWeapon(w);
    warnOnce(`wep:${p.weaponId}`, `mainhand.weaponId「${p.weaponId}」不在兵刃目录，已跳过`);
  }
  if (p.shape) {
    const shape = p.shape as BladeShape;
    return {
      shape,
      length: p.length ?? defaultLength(shape),
      blade: p.blade ?? '#9aa0a8',
      trail: p.trail ?? '#ff2040',
      edge: p.edge ?? '#c8d0d8',
    };
  }
  return null;
}

/**
 * Resolve mainhand look for drawing.
 * - Gear weapon always wins (covers silhouette mainhand).
 * - Else silhouette mainhand part (weaponId / inline shape).
 * - fromWeapon with no gear → null (caller uses body default / legacy).
 * - No parts and no gear weapon → null (legacy kind-hardcoded).
 */
export function resolveSilhouetteWeaponLook(
  sil: SilhouetteDef | null | undefined,
  gearWeapon: WeaponDef | null | undefined,
): WeaponAppearance | null {
  if (gearWeapon) return appearanceFromWeapon(gearWeapon);

  const parts = sil?.parts;
  if (!parts?.length) return null;

  for (const p of parts) {
    if ((p as { kind?: string }).kind !== 'mainhand') continue;
    const mh = p as Extract<SilhouettePart, { kind: 'mainhand' }>;
    if (mh.fromWeapon) {
      // gear already checked; fall through to inline / weaponId on same part
    }
    const look = fromMainhandPart(mh, sil!.id);
    if (look) return look;
  }
  return null;
}
