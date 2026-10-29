/**
 * 战斗灵符 — prepared in 符箓 (2 slots), used in-run (U/5 use, Y/6 cycle).
 * Known after material discovery / craft; hub hides unknown. 鉴定仅铁匠铺耗血晶.
 *
 * Effects are data timelines (scriptId / inline timeline) executed by the core
 * script player — plugins must not ship arbitrary JS.
 */
import type { MaterialBag } from './materials';
import type { ScriptStep } from './talismanScripts';
import type { AnimStep } from './animScripts';
import { getTalisman, listTalismans, talismanMapView } from './contentRegistry';

/** Built-in talisman ids (type-safe helpers). */
export type CoreTalismanId =
  | 'quxie' | 'qingwu' | 'jiekong' | 'poshi'
  | 'hushen' | 'dingshen' | 'anhunfu' | 'jingxue' | 'zhangyan'
  | 'feijianfu' | 'leifu' | 'shuilongfu';

/** Runtime / save id — any registered talisman (core or a loaded 内容包). */
export type TalismanId = string;

export interface TalismanDef {
  id: TalismanId;
  name: string;
  fogName: string;
  lore: string;
  tip: string;
  color: string;
  cost: MaterialBag;
  fee: number;
  stockCap: number;
  runCharges: number;
  /**
   * Effect script id (data timeline registered via ctx.talismans.script).
   * Defaults to `id` when omitted.
   */
  scriptId?: string;
  /** Numeric knobs merged into the cast (e.g. damageMul). */
  scriptParams?: Record<string, number | string | boolean>;
  /** Inline timeline — used instead of scriptId when non-empty. */
  timeline?: ScriptStep[];
  /** Look-only AnimStep recipe (id or inline); overrides script.anim when set. */
  anim?: string | AnimStep[];
  /** 固有品质 tag. */
  quality?: import('./taxonomy').InherentQuality;
  /** 品级 上/中/下. */
  grade?: import('./taxonomy').ConsumableGrade;
  /**
   * Icon art key or relative url.
   * - `H-05-tal-1` style keys resolve under ./art/icons/{key}_{size}.png
   * - paths starting with `./` or `/` used as-is (size ignored); prefer `./art/`
   * - `http(s)://` 外链禁止（登记拒收）
   */
  icon?: string;
}

/** Built-in 灵符 — registered by the official 内容包 (after its scripts). */
/** Oc5: isCore* 查官方包 id 集（字面量在 changye/seeds；不对外 re-export）。 */
import { CORE_TALISMANS } from '../content/changye/seeds/talismans';

/** Live catalog backed by the ctx.talismans service (core + loaded 内容包). */
export const TALISMANS: TalismanDef[] = listTalismans();
export const TALISMAN_BY_ID: Record<string, TalismanDef> = talismanMapView();

export function isTalismanId(id: string): id is TalismanId {
  return getTalisman(id) !== undefined;
}

export function isCoreTalismanId(id: string): id is CoreTalismanId {
  return CORE_TALISMANS.some((t) => t.id === id);
}

export { getTalisman, listTalismans };

export type TalismanBag = Partial<Record<TalismanId, number>>;
export type TalismanSlot = { id: TalismanId; n: number } | null;

/** Exactly 2 sortie talisman slots. */
export const TALISMAN_SLOT_COUNT = 2;

export function emptyTalismanSlots(): TalismanSlot[] {
  return [null, null];
}

export function talismanDisplayName(id: TalismanId, known: boolean): string {
  const d = TALISMAN_BY_ID[id];
  if (!d) return known ? id : '灵符·??';
  return known ? d.name : d.fogName;
}

/** Clone slots for run snapshot. */
export function cloneTalismanSlots(slots: TalismanSlot[] | null | undefined): TalismanSlot[] {
  const src = slots && slots.length ? slots : emptyTalismanSlots();
  const out = emptyTalismanSlots();
  for (let i = 0; i < TALISMAN_SLOT_COUNT; i++) {
    const s = src[i];
    out[i] = s ? { id: s.id, n: s.n } : null;
  }
  return out;
}
