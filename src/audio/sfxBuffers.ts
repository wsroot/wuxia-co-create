/**
 * R4a: pack-file sfx decode cache.
 * Whitelist ./art/ + format → fetch → decodeAudioData → sfxBus.
 * Failures soft-skip; no second audio engine; no remote URLs.
 */
import type { AudioEngine } from './audio';
import type { SfxDef, SfxFormat } from '../meta/bTier/types';

const ART_SRC_RE = /^\.\/art\//;
/** Hard decode ceiling (aligned with sheet ≤2MB). */
export const SFX_FILE_MAX_BYTES = 2_000_000;

const buffers = new Map<string, AudioBuffer>();
const failed = new Set<string>();
const inflight = new Map<string, Promise<AudioBuffer | null>>();
const warned = new Set<string>();

function warnOnce(id: string, msg: string): void {
  if (warned.has(id)) return;
  warned.add(id);
  try {
    console.warn(`[sfx] ${msg}`);
  } catch {
    /* ignore */
  }
}

/** Interpreter-side path + format gate (Service already rejects at register). */
export function isValidSfxFileSrc(src: string, format: SfxFormat | string | undefined): boolean {
  if (!src || !format) return false;
  if (/^https?:\/\//i.test(src) || src.includes('://')) return false;
  if (!ART_SRC_RE.test(src)) return false;
  const fmt = String(format).toLowerCase();
  if (fmt !== 'wav' && fmt !== 'ogg' && fmt !== 'mp3') return false;
  const q = src.split('?')[0] ?? src;
  const ext = q.includes('.') ? q.slice(q.lastIndexOf('.') + 1).toLowerCase() : '';
  return ext === fmt;
}

export function hasSfxBuffer(id: string): boolean {
  return buffers.has(id);
}

export function getSfxBuffer(id: string): AudioBuffer | undefined {
  return buffers.get(id);
}

/** Test / inject helper (smoke without WebAudio). */
export function putSfxBuffer(id: string, buf: AudioBuffer): void {
  buffers.set(id, buf);
  failed.delete(id);
}

export function clearSfxBuffer(id: string): void {
  buffers.delete(id);
  failed.delete(id);
  inflight.delete(id);
}

export function clearAllSfxBuffers(): void {
  buffers.clear();
  failed.clear();
  inflight.clear();
  warned.clear();
}

/** Play a decoded buffer through the existing sfxBus. */
export function playSfxBuffer(a: AudioEngine, key: string, buf: AudioBuffer, vol = 0.85): void {
  if (!a.ready || !a.allow(`buf:${key}`, 0.03)) return;
  const ctx = a.ctx;
  if (!ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(g).connect(a.sfxBus);
  src.start();
}

/**
 * Lazy fetch+decode. Requires AudioContext (a.ensure()).
 * Returns cached buffer, null on fail / not ready, or a promise while in flight.
 */
export function ensureSfxBuffer(a: AudioEngine, def: SfxDef): Promise<AudioBuffer | null> | AudioBuffer | null {
  if (!def.src || !def.format) return null;
  if (!isValidSfxFileSrc(def.src, def.format)) {
    warnOnce(def.id, `illegal src/format for「${def.id}」, skip decode`);
    failed.add(def.id);
    return null;
  }
  const hit = buffers.get(def.id);
  if (hit) return hit;
  if (failed.has(def.id)) return null;
  const pending = inflight.get(def.id);
  if (pending) return pending;

  if (!a.ensure() || !a.ctx) return null;

  const src = def.src;
  const id = def.id;
  const p = (async (): Promise<AudioBuffer | null> => {
    try {
      const res = await fetch(src);
      if (!res.ok) {
        warnOnce(id, `fetch ${src} → ${res.status}, soft-skip`);
        failed.add(id);
        return null;
      }
      const ab = await res.arrayBuffer();
      if (ab.byteLength > SFX_FILE_MAX_BYTES) {
        warnOnce(id, `sfx「${id}」超体素限额（>${SFX_FILE_MAX_BYTES}）, soft-skip`);
        failed.add(id);
        return null;
      }
      const ctx = a.ctx;
      if (!ctx) {
        failed.add(id);
        return null;
      }
      // copy: decodeAudioData may detach
      const buf = await ctx.decodeAudioData(ab.slice(0));
      buffers.set(id, buf);
      failed.delete(id);
      return buf;
    } catch (e) {
      warnOnce(id, `decode「${id}」失败: ${e instanceof Error ? e.message : String(e)}`);
      failed.add(id);
      return null;
    } finally {
      inflight.delete(id);
    }
  })();
  inflight.set(id, p);
  return p;
}

/** Kick decode when catalog has a valid file src (no throw). */
export function requestSfxDecode(a: AudioEngine, def: SfxDef | undefined): void {
  if (!def?.src || !def.format) return;
  if (!isValidSfxFileSrc(def.src, def.format)) return;
  if (buffers.has(def.id) || failed.has(def.id)) return;
  void ensureSfxBuffer(a, def);
}
