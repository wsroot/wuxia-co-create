import { getMaterial, listMaterials, materialMapView } from './contentRegistry';

/** 材料图鉴 — 掉落堆叠，供铁匠 / 炼丹 / 打坐用。 */
/** Built-in material ids (type-safe helpers). */
export type CoreMaterialId =
  | 'iron' | 'bone' | 'cinnabar' | 'herb' | 'xuaniron' | 'yaohe'
  | 'hide' | 'silk' | 'coal' | 'spiritjade';

/** Runtime / save id — any registered material (core or a loaded 内容包). */
export type MaterialId = string;

export interface MaterialDef {
  id: MaterialId;
  name: string;
  lore: string;
  /** Relative drop weight among materials. */
  weight: number;
  /** Boss / elite lean toward these. */
  rare?: boolean;
}

/** Oc5: isCore* 查官方包 id 集（字面量在 changye/seeds；不对外 re-export）。 */
import { CORE_MATERIALS } from '../content/changye/seeds/materials';

/** Live catalog backed by the ctx.materials service (core + loaded 内容包). */
export const MATERIALS: MaterialDef[] = listMaterials();
export const MATERIAL_BY_ID: Record<string, MaterialDef> = materialMapView();

export function isMaterialId(id: string): id is MaterialId {
  return getMaterial(id) !== undefined;
}

/** Oc4: 查官方包 id 集（字面量在 changye）。 */
export function isCoreMaterialId(id: string): id is CoreMaterialId {
  return CORE_MATERIALS.some((m) => m.id === id);
}

export { getMaterial, listMaterials };

export type MaterialBag = Partial<Record<MaterialId, number>>;

export function matCount(bag: MaterialBag, id: MaterialId): number {
  return bag[id] ?? 0;
}

export function hasMaterials(bag: MaterialBag, need: MaterialBag): boolean {
  for (const [k, n] of Object.entries(need)) {
    if ((bag[k as MaterialId] ?? 0) < (n ?? 0)) return false;
  }
  return true;
}

export function spendMaterials(bag: MaterialBag, need: MaterialBag): boolean {
  if (!hasMaterials(bag, need)) return false;
  for (const [k, n] of Object.entries(need)) {
    const id = k as MaterialId;
    bag[id] = (bag[id] ?? 0) - (n ?? 0);
    if (bag[id]! <= 0) delete bag[id];
  }
  return true;
}

export function addMaterial(bag: MaterialBag, id: MaterialId, n = 1): void {
  bag[id] = (bag[id] ?? 0) + n;
}

/** Weighted pick for kill drops. */
export function rollMaterial(preferRare = false): MaterialId {
  const pool = preferRare ? MATERIALS.filter((m) => m.rare) : MATERIALS;
  const list = pool.length ? pool : MATERIALS;
  let total = 0;
  for (const m of list) total += m.weight;
  let r = Math.random() * total;
  for (const m of list) {
    r -= m.weight;
    if (r <= 0) return m.id;
  }
  return list[list.length - 1].id;
}

/**
 * Roll several material picks, preferring distinct kinds when possible.
 * Used by kill / arena / chest bursts for multi-item scatter.
 */
export function rollMaterials(count: number, preferRare = false): MaterialId[] {
  const n = Math.max(0, Math.floor(count));
  if (n <= 0) return [];
  const out: MaterialId[] = [];
  const used = new Set<MaterialId>();
  for (let i = 0; i < n; i++) {
    const leanRare = preferRare && (i === 0 || Math.random() < 0.45);
    let id = rollMaterial(leanRare);
    let tries = 0;
    while (used.has(id) && tries++ < 10) {
      id = rollMaterial(leanRare && Math.random() < 0.5);
    }
    used.add(id);
    out.push(id);
  }
  return out;
}
