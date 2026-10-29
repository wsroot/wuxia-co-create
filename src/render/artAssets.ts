/**
 * Approved flat-art paths (public/art) for hub / title / between-act mood.
 * Combat character bodies stay procedural. Weapon sheets: core whitelist via weaponSheets.ts.
 *
 * Talisman icons: prefer TalismanDef.icon; legacy slot map kept for preload warm.
 */
import { getTalisman } from '../meta/contentRegistry';
import { preloadWeaponSheets } from './weaponSheets';

/** Relative to Vite base (`./`). */
export const ART = {
  titleKey: './art/bg/T-01-title-keyart.png',
  hubMountain: './art/bg/B-01-bg-mountain-road.png',
  interludePagoda: './art/bg/B-03-interlude-pagoda.png',
  corner128: './art/icons/H-01-corner_128.png',
  corner256: './art/icons/H-01-corner_256.png',
  divider128: './art/icons/H-01-divider_128.png',
  divider256: './art/icons/H-01-divider_256.png',
  plaque128: './art/icons/H-01-frame-plaque_128.png',
  plaque256: './art/icons/H-01-frame-plaque_256.png',
  square128: './art/icons/H-01-frame-square_128.png',
  square64: './art/icons/H-01-frame-square_64.png',
} as const;

/** Warm-preload keys (not an id→art table for runtime). */
export const TALISMAN_ART_SLOTS = [
  { art: 'H-05-tal-1' },
  { art: 'H-05-tal-2' },
  { art: 'H-05-tal-3' },
  { art: 'H-05-tal-4' },
] as const;

export function talismanIconUrl(id: string, size: 64 | 128 = 128): string | null {
  const def = getTalisman(id);
  const key = def?.icon;
  if (!key) return null;
  // Defense in depth: register already rejects http(s); never feed UI an absolute URL.
  if (/^https?:\/\//i.test(key) || key.includes('://')) return null;
  if (key.startsWith('./') || key.startsWith('/')) return key;
  return `./art/icons/${key}_${size}.png`;
}

let pagodaImg: HTMLImageElement | null = null;
let pagodaReady = false;

/** Lazy-load B-03 for canvas between-act / 幕间 mood. */
export function getInterludePagoda(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!pagodaImg) {
    pagodaImg = new Image();
    pagodaImg.onload = () => { pagodaReady = true; };
    pagodaImg.onerror = () => { pagodaReady = false; };
    pagodaImg.src = ART.interludePagoda;
  }
  return pagodaReady && pagodaImg.complete && pagodaImg.naturalWidth > 0 ? pagodaImg : null;
}

/** Kick off preload (call once from main). */
export function preloadArt(): void {
  if (typeof Image === 'undefined') return;
  getInterludePagoda();
  const warm = [
    ART.titleKey, ART.hubMountain,
    ART.corner128, ART.divider128, ART.plaque128,
  ];
  for (const src of warm) {
    const im = new Image();
    im.src = src;
  }
  for (const s of TALISMAN_ART_SLOTS) {
    const im = new Image();
    im.src = `./art/icons/${s.art}_128.png`;
  }
  preloadWeaponSheets();
}
