/**
 * Resolve DLCServer base URL.
 * Priority: ?dlc=… → VITE_DLC_BASE → same host :4174.
 * ?dlc=0|off|false disables remote catalog (built-in only).
 */
export function resolveDlcBase(search?: string): string | null {
  const params = new URLSearchParams(
    search ?? (typeof location !== 'undefined' ? location.search : ''),
  );
  if (params.has('dlc')) {
    const q = (params.get('dlc') || '').trim();
    if (q === '0' || q === 'off' || q === 'false') return null;
    if (q) return q.replace(/\/$/, '');
  }

  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
    const v = (env?.VITE_DLC_BASE || '').trim();
    if (v === '0' || v === 'off') return null;
    if (v) return v.replace(/\/$/, '');
  } catch { /* no import.meta.env */ }

  if (typeof location === 'undefined') return null;
  const u = new URL(location.href);
  if (u.port === '4174') return `${u.protocol}//${u.host}`;
  return `${u.protocol}//${u.hostname}:4174`;
}

export function absolutize(base: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const b = base.replace(/\/$/, '');
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${b}${p}`;
}
