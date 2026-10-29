/**
 * Weapon sprite sheets. Bundled 6 are pack-registered via ctx.sheets (menpai-core).
 * Plugins may register more SheetDef under ./art/ with size/format limits.
 * Unknown / missing id → soft-skip → parametric blade draw.
 */
import { getSheet, listSheets } from '../meta/contentRegistry';

/** @deprecated Prefer catalog; kept for any legacy checks. */
export const WEAPON_SHEET_IDS = [
  'blade_ink',
  'dagger_ink',
  'spear_ink',
  'axe_ink',
  'twin_ink',
  'greatsword_ink',
] as const;

export type WeaponSheetId = (typeof WEAPON_SHEET_IDS)[number];

/** Frame cell size inside each strip (3 frames × 64 wide) — defaults. */
export const WEAPON_SHEET_FRAME_W = 64;
export const WEAPON_SHEET_FRAME_H = 32;
export const WEAPON_SHEET_FRAMES = 3;

const cache = new Map<string, HTMLImageElement | null>();

export function isWeaponSheetId(id: string): boolean {
  return getSheet(id) !== undefined || (WEAPON_SHEET_IDS as readonly string[]).includes(id);
}

/** Soft-load: returns image only when decoded & ready; unknown id → null. */
export function getWeaponSheet(sheetId: string): HTMLImageElement | null {
  const def = getSheet(sheetId);
  // Bundled fallback path if catalog not booted yet (tests / early import).
  const src = def?.src ?? (
    (WEAPON_SHEET_IDS as readonly string[]).includes(sheetId)
      ? `./art/weapons/${sheetId}.png`
      : null
  );
  if (!src) return null;
  if (/^https?:\/\//i.test(src) || src.includes('://')) return null;

  const hit = cache.get(sheetId);
  if (hit === null) return null;
  if (hit && hit.complete && hit.naturalWidth > 0) return hit;
  if (typeof Image === 'undefined') return null;
  if (!hit) {
    const im = new Image();
    im.onload = () => { /* ready next frame */ };
    im.onerror = () => { cache.set(sheetId, null); };
    im.src = src;
    cache.set(sheetId, im);
    return null;
  }
  return null;
}

export function sheetFrameSize(sheetId: string): { w: number; h: number; frames: number } {
  const def = getSheet(sheetId);
  return {
    w: def?.frameW ?? WEAPON_SHEET_FRAME_W,
    h: def?.frameH ?? WEAPON_SHEET_FRAME_H,
    frames: def?.frames ?? WEAPON_SHEET_FRAMES,
  };
}

/** Kick off warm loads (optional; call from preloadArt). */
export function preloadWeaponSheets(): void {
  if (typeof Image === 'undefined') return;
  const live = listSheets().map((s) => s.id);
  const ids = live.length ? live : [...WEAPON_SHEET_IDS];
  for (const id of ids) getWeaponSheet(id);
}
