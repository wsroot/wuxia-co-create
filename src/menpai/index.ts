/**
 * 门派 boot（Oc3）：
 * - **核心解释器**：Cordis 服务 + Schema + 白名单；目录启动可空。
 * - **长夜包** `changye`（`src/content/changye`）：出厂内容 always-on，经 `bootOfficialPack()` 显式灌入。
 * - 商店兼容 id 仍为 `core`（「长夜」文案）；`menpai-core` 仅为遗留兼容壳，不再自灌目录。
 * - **勿**把 `changye` 塞进 `OPTIONAL_PACKS`。禁止与 ContentCore / menpai-core 双登记同一批 id。
 *
 * Bare hands = unequipped (no fist WeaponDef).
 *
 * Deprecated: `?menpai=chixia` still loads the renamed content pack once
 * (logged as deprecation). Prefer `?pack=chixia`.
 */
import type { ForkScope } from 'cordis';
import { game } from '../plugins/root';
import { Changye, CHANGYE_PACK_ID, type ChangyeConfig } from '../content/changye';
import { QingchengMenpai } from './qingcheng';
import {
  bootContent, loadPack, unloadPack, packFromUrl, isOptionalPack,
  listPackCatalog, isPackLoaded, listLoadedPacks, type PackCatalogEntry,
} from '../content';
import {
  fetchRemoteCatalog, peekRemoteCatalog, getDlcCatalogSource, getDlcCatalogError,
  loadRemoteDlc, isRemoteDlcLoaded, resolveDlcBase,
  type DlcRemoteEntry,
} from '../dlc';

/** Store-facing display meta (江湖口吻，无技术词). */
export interface MenpaiMeta {
  name: string;
  lore: string;
}

/**
 * 商店 / 存档兼容 id（展示「长夜」）。
 * 出厂内容 Cordis id 为 `changye`（见 `CHANGYE_PACK_ID`）；二者勿混为 OPTIONAL。
 */
export const CORE_MENPAI_ID = 'core';
export const CORE_MENPAI_META: MenpaiMeta = {
  name: '长夜',
  lore: '官方正传出厂内容。江湖长夜之中，兵刃、丹药、符箓、功法尽出此门。',
};

export { Changye, CHANGYE_PACK_ID };
export type { ChangyeConfig };

/** Optional 门派 that can be switched on by name. */
export const OPTIONAL_MENPAI: Record<string, { plugin: any; config?: unknown; meta: MenpaiMeta }> = {
  qingcheng: {
    plugin: QingchengMenpai,
    meta: {
      name: '青城',
      lore: '青城山门一脉，擅护体遁甲之术。',
    },
  },
};

const loaded = new Map<string, ForkScope>();

export function loadMenpai(name: string, config?: unknown): boolean {
  if (loaded.has(name)) return true;
  const entry = OPTIONAL_MENPAI[name];
  if (!entry) {
    // Backward compat: former "门派" names that are now content packs.
    if (isOptionalPack(name)) {
      game.logger('menpai').warn(
        `「${name}」已是内容包而非门派；请改用 ?pack=${name} / __pack.load('${name}')（本次仍代为加载）`,
      );
      return loadPack(name, config);
    }
    game.logger('menpai').warn(`未知门派：${name}`);
    return false;
  }
  const cfg = config ?? entry.config;
  try {
    entry.plugin.Config?.(cfg);
  } catch (e) {
    game.logger('menpai').warn(`门派 ${name} 配置无效，未加载：${(e as Error).message}`);
    return false;
  }
  loaded.set(name, game.plugin(entry.plugin, cfg));
  return true;
}

export function unloadMenpai(name: string): boolean {
  const fork = loaded.get(name);
  if (fork) {
    fork.dispose();
    loaded.delete(name);
    return true;
  }
  // Compat: unloading a deprecated menpai-alias also unloads the pack.
  if (isOptionalPack(name)) return unloadPack(name);
  return false;
}

/** Live fork for the official 长夜包 (`changye`). */
let official: ForkScope | undefined;

/** True when always-on 长夜包 is loaded. */
export function isOfficialPackLoaded(): boolean {
  return !!official;
}

/**
 * Explicitly load the official 长夜包（idempotent）.
 * Single registration path — do NOT also plugin Changye / CoreMenpai content / ContentCore.
 */
export function bootOfficialPack(config?: ChangyeConfig): void {
  official ??= game.plugin(Changye, config);
}

/**
 * Test-only: dispose the official pack so catalogs drop to empty/near-empty.
 * Production must not call this and expect a playable empty-core.
 */
export function unloadOfficialPack(): boolean {
  if (!official) return false;
  official.dispose();
  official = undefined;
  return true;
}

/** Boot options for menpai / official pack wiring. */
export interface BootMenpaiOptions {
  /**
   * Load always-on 长夜包 `changye`（默认 true，生产观感不变）。
   * 仅测可传 false → 目录空/近空；OPTIONAL 仍可叠加。
   */
  officialPack?: boolean;
}

/** Load official 长夜包（idempotent）. Respects `officialPack` (default true). */
export function bootMenpaiOnly(opts: BootMenpaiOptions = {}): void {
  if (opts.officialPack !== false) bootOfficialPack();
}

/**
 * Boot official 长夜包 (all catalogs by default), then any `?pack=` / `?menpai=` extras.
 * Call once before reading the save.
 */
export function bootMenpai(
  extraMenpai: string[] = [],
  extraPacks: string[] = [],
  opts: BootMenpaiOptions = {},
): void {
  bootContent();
  bootMenpaiOnly(opts);
  for (const n of extraPacks) loadPack(n);
  for (const n of extraMenpai) loadMenpai(n);
}

export function menpaiFromUrl(search: string): string[] {
  const v = new URLSearchParams(search).get('menpai');
  return v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

function isOfficialAlias(name: string): boolean {
  return name === CORE_MENPAI_ID
    || name === 'menpai-core'
    || name === CHANGYE_PACK_ID
    || name === 'changye';
}

/** Live: official 长夜包 or optional menpai currently loaded. */
export function isMenpaiLoaded(name: string): boolean {
  if (isOfficialAlias(name)) return isOfficialPackLoaded();
  return loaded.has(name);
}

/** Live ids: always includes `core` when 长夜包 booted, plus optional forks. */
export function listLoadedMenpai(): string[] {
  const ids: string[] = [];
  if (official) ids.push(CORE_MENPAI_ID);
  for (const k of loaded.keys()) ids.push(k);
  return ids;
}

export interface MenpaiCatalogEntry {
  id: string;
  name: string;
  lore: string;
  enabled: boolean;
  official?: boolean;
}

/**
 * 门派 rows for DLC 商店（含官方长夜）.
 * id=`core` 为商店兼容壳；出厂内容本体 Cordis id=`changye`（文档称「长夜包」）。
 */
export function listMenpaiCatalog(): MenpaiCatalogEntry[] {
  const out: MenpaiCatalogEntry[] = [{
    id: CORE_MENPAI_ID,
    name: CORE_MENPAI_META.name,
    lore: CORE_MENPAI_META.lore,
    enabled: isOfficialPackLoaded(),
    official: true,
  }];
  for (const [id, e] of Object.entries(OPTIONAL_MENPAI)) {
    out.push({
      id,
      name: e.meta.name,
      lore: e.meta.lore,
      enabled: loaded.has(id),
    });
  }
  return out;
}

export type DlcKind = 'menpai' | 'pack';

export interface DlcStoreEntry {
  id: string;
  kind: DlcKind;
  name: string;
  lore: string;
  enabled: boolean;
  official?: boolean;
  /** From DLCServer when catalog reachable. */
  version?: string;
  size?: number;
  md5?: string;
  /** Listed via remote catalog (may still enable via built-in). */
  remote?: boolean;
  /** Built-in OPTIONAL_* mirror on server. */
  builtin?: boolean;
}

function builtinStoreRows(): DlcStoreEntry[] {
  const menpai = listMenpaiCatalog().map((e): DlcStoreEntry => ({
    id: e.id, kind: 'menpai', name: e.name, lore: e.lore, enabled: e.enabled, official: e.official,
  }));
  const packs = listPackCatalog().map((e: PackCatalogEntry): DlcStoreEntry => ({
    id: e.id, kind: 'pack', name: e.name, lore: e.lore, enabled: e.enabled,
  }));
  return [...menpai, ...packs];
}

function isEnabledLocal(id: string, kind: DlcKind): boolean {
  if (kind === 'menpai') return isMenpaiLoaded(id) || isRemoteDlcLoaded(id);
  return isPackLoaded(id) || isRemoteDlcLoaded(id);
}

function mergeRemote(remote: DlcRemoteEntry[]): DlcStoreEntry[] {
  const local = builtinStoreRows();
  const byKey = new Map<string, DlcStoreEntry>();
  for (const e of local) byKey.set(`${e.kind}:${e.id}`, e);
  // Official core always first from local
  const out: DlcStoreEntry[] = [];
  const coreRow = byKey.get('menpai:core');
  if (coreRow) {
    out.push(coreRow);
    byKey.delete('menpai:core');
  }
  for (const r of remote) {
    if (r.id === 'core' || r.id === 'menpai-core' || r.id === CHANGYE_PACK_ID) continue;
    const key = `${r.kind}:${r.id}`;
    const loc = byKey.get(key);
    out.push({
      id: r.id,
      kind: r.kind,
      name: r.name || loc?.name || r.id,
      lore: r.description || loc?.lore || '',
      enabled: isEnabledLocal(r.id, r.kind),
      version: r.version,
      size: r.size,
      md5: r.md5,
      remote: true,
      builtin: r.builtin || !!loc,
    });
    byKey.delete(key);
  }
  // Remaining built-ins not on server
  for (const e of byKey.values()) {
    if (e.official) continue;
    out.push(e);
  }
  return out;
}

/** Sync: last known merge (remote cache or built-in only). */
export function listDlcStore(): DlcStoreEntry[] {
  const remote = peekRemoteCatalog();
  if (remote.length) return mergeRemote(remote);
  return builtinStoreRows();
}

/** Async: refresh from DLCServer, fallback to built-in if unreachable. */
export async function listDlcStoreAsync(force = false): Promise<{
  entries: DlcStoreEntry[];
  source: ReturnType<typeof getDlcCatalogSource>;
  error: string | null;
  base: string | null;
}> {
  const base = resolveDlcBase();
  const remote = await fetchRemoteCatalog(force);
  const entries = remote && remote.length ? mergeRemote(remote) : builtinStoreRows();
  return { entries, source: getDlcCatalogSource(), error: getDlcCatalogError(), base };
}

/**
 * One-way enable from the store (title / hub). Does not unload.
 * Official 长夜包 cannot be toggled off in store. Prefers built-in Cordis pack; else remote content.json.
 */
export function enableDlc(id: string, kind: DlcKind): boolean {
  if (kind === 'menpai') {
    if (isOfficialAlias(id)) {
      bootOfficialPack();
      return isOfficialPackLoaded();
    }
    if (OPTIONAL_MENPAI[id]) return loadMenpai(id);
    return false;
  }
  if (isOptionalPack(id)) return loadPack(id);
  return false;
}

/** Async enable: built-in first, then DLCServer content.json. */
export async function enableDlcAsync(id: string, kind: DlcKind): Promise<boolean> {
  if (kind === 'menpai') {
    if (isOfficialAlias(id)) {
      bootOfficialPack();
      return isOfficialPackLoaded();
    }
    if (OPTIONAL_MENPAI[id]) return loadMenpai(id);
  } else if (isOptionalPack(id)) {
    return loadPack(id);
  }
  const remote = peekRemoteCatalog().find((e) => e.id === id && e.kind === kind);
  return loadRemoteDlc(id, kind, remote?.content);
}

// Re-export pack helpers so main / smoke can import one place if desired.
export {
  loadPack, unloadPack, packFromUrl, bootContent,
  isPackLoaded, listLoadedPacks, listPackCatalog,
};
