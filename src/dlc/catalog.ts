/**
 * Fetch DLCServer catalog and merge with built-in OPTIONAL_* for the store UI.
 */
import type { DlcCatalog, DlcRemoteEntry } from './types';
import { absolutize, resolveDlcBase } from './baseUrl';

export type CatalogSource = 'server' | 'builtin' | 'mixed';

let cached: DlcRemoteEntry[] | null = null;
let cachedSource: CatalogSource = 'builtin';
let cachedAt = 0;
let lastError: string | null = null;

const CACHE_MS = 30_000;

export function getDlcCatalogSource(): CatalogSource {
  return cachedSource;
}

export function getDlcCatalogError(): string | null {
  return lastError;
}

export function clearDlcCatalogCache(): void {
  cached = null;
  cachedAt = 0;
}

/** Sync snapshot of last successful remote list (may be empty). */
export function peekRemoteCatalog(): DlcRemoteEntry[] {
  return cached ?? [];
}

export async function fetchRemoteCatalog(force = false): Promise<DlcRemoteEntry[] | null> {
  const base = resolveDlcBase();
  if (!base) {
    lastError = null;
    cachedSource = 'builtin';
    return null;
  }
  if (!force && cached && Date.now() - cachedAt < CACHE_MS) return cached;

  const url = absolutize(base, '/catalog.json');
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(url, { cache: 'no-cache', signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as DlcCatalog;
    if (!data || !Array.isArray(data.packages)) throw new Error('catalog shape');
    cached = data.packages.map((p) => ({
      ...p,
      download: absolutize(base, p.download),
      content: p.content ? absolutize(base, p.content) : absolutize(base, `/packages/${p.id}/content.json`),
    }));
    cachedAt = Date.now();
    lastError = null;
    cachedSource = 'server';
    return cached;
  } catch (e) {
    lastError = (e as Error).message || 'unreachable';
    // keep stale cache if any
    if (cached) {
      cachedSource = 'mixed';
      return cached;
    }
    cachedSource = 'builtin';
    return null;
  }
}
