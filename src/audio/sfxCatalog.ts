/**
 * Catalog-aware sfx playback (R4a).
 * File buffer (preferred) → synth → historical raw name → soft-skip.
 */
import type { AudioEngine } from './audio';
import { getSfxDef } from '../meta/contentRegistry';
import { playSfx } from './sfx';
import {
  getSfxBuffer,
  isValidSfxFileSrc,
  playSfxBuffer,
  requestSfxDecode,
} from './sfxBuffers';

/**
 * @returns true if buffer or synth (or historical raw) path was taken.
 */
export function playCatalogSfx(a: AudioEngine, catalogId: string): boolean {
  const id = catalogId?.trim();
  if (!id) return false;

  const buf = getSfxBuffer(id);
  if (buf) {
    playSfxBuffer(a, id, buf);
    return true;
  }

  const def = getSfxDef(id);
  if (def?.src && isValidSfxFileSrc(def.src, def.format)) {
    requestSfxDecode(a, def);
  }

  if (def?.synth) {
    playSfx(a, def.synth);
    return true;
  }

  if (!def) {
    // Historical core synth names with no catalog row
    playSfx(a, id);
    return true;
  }

  // src-only, buffer not ready / decode failed → soft-skip
  return false;
}
