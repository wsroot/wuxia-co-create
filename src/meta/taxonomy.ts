/**
 * Framework-owned quality / rank / grade / tier rulers.
 *
 * Plugins only *tag* content with these ids; they must not invent new tiers.
 * Names, colors, default multipliers, drop/craft weights, sell bases, and
 * reforge caps all live here (and consumers in craft / sell / weaponInstAffix).
 */

/* ── 固有品质 InherentQuality（功法、符箓、丹药、装备） ───────── */

/** High → low: 天 / 地 / 玄 / 黄 / 凡 / 劣 */
export type InherentQuality = 'tian' | 'di' | 'xuan' | 'huang' | 'fan' | 'lie';

export const INHERENT_QUALITIES = ['tian', 'di', 'xuan', 'huang', 'fan', 'lie'] as const satisfies readonly InherentQuality[];

/** @deprecated Use InherentQuality — kept as alias so call sites compile during migration. */
export type Quality = InherentQuality;

export const QUALITY_NAME: Record<InherentQuality, string> = {
  tian: '天',
  di: '地',
  xuan: '玄',
  huang: '黄',
  fan: '凡',
  lie: '劣',
};

/**
 * Tint palette (ground loot + UI).
 * 天=金白 · 地=橙金 · 玄=紫 · 黄=绿 · 凡=灰白 · 劣=浊褐
 */
export const QUALITY_COLOR: Record<InherentQuality, string> = {
  tian: '#ffe8a0',
  di: '#ff9040',
  xuan: '#9060ff',
  huang: '#50e070',
  fan: '#c8c8d0',
  lie: '#786860',
};

/** Flat mults on identified weapon quality (on top of forge level). */
export function qualityBonus(q: InherentQuality): { damage: number; poise: number } {
  switch (q) {
    case 'tian': return { damage: 1.25, poise: 1.2 };
    case 'di': return { damage: 1.15, poise: 1.12 };
    case 'xuan': return { damage: 1.09, poise: 1.08 };
    case 'huang': return { damage: 1.04, poise: 1.04 };
    case 'lie': return { damage: 0.92, poise: 0.92 };
    default: return { damage: 1, poise: 1 };
  }
}

/** Armor bonus scale by inherent quality. */
export function qualityArmorMult(q: InherentQuality): number {
  switch (q) {
    case 'tian': return 1.55;
    case 'di': return 1.4;
    case 'xuan': return 1.2;
    case 'huang': return 1.1;
    case 'lie': return 0.9;
    default: return 1;
  }
}

/** Identify roll weights (sum ≈ 100). Mostly 凡/黄, rare 玄/地, very rare 天; 劣 as junk. */
export const IDENTIFY_QUALITY_WEIGHTS: ReadonlyArray<readonly [InherentQuality, number]> = [
  ['fan', 42],
  ['huang', 28],
  ['xuan', 14],
  ['di', 7],
  ['tian', 2],
  ['lie', 7],
];

/** Craft roll — slightly stingier than identify. */
export const CRAFT_QUALITY_WEIGHTS: ReadonlyArray<readonly [InherentQuality, number]> = [
  ['fan', 48],
  ['huang', 30],
  ['xuan', 12],
  ['di', 5],
  ['tian', 1],
  ['lie', 4],
];

/** Chest / boss-chest quality weights. */
export const CHEST_QUALITY_WEIGHTS: ReadonlyArray<readonly [InherentQuality, number]> = [
  ['fan', 32],
  ['huang', 30],
  ['xuan', 20],
  ['di', 8],
  ['tian', 2],
  ['lie', 8],
];

export function rollWeightedQuality(
  weights: ReadonlyArray<readonly [InherentQuality, number]>,
  rng = Math.random,
): InherentQuality {
  let total = 0;
  for (const [, w] of weights) total += w;
  let r = rng() * total;
  for (const [q, w] of weights) {
    r -= w;
    if (r <= 0) return q;
  }
  return 'fan';
}

export function rollQuality(rng = Math.random): InherentQuality {
  return rollWeightedQuality(IDENTIFY_QUALITY_WEIGHTS, rng);
}

export function rollCraftQuality(rng = Math.random): InherentQuality {
  return rollWeightedQuality(CRAFT_QUALITY_WEIGHTS, rng);
}

/** Numeric rank for comparing qualities (lie=0 … tian=5). */
export function qualityRank(q: InherentQuality): number {
  return ({ lie: 0, fan: 1, huang: 2, xuan: 3, di: 4, tian: 5 } as const)[q];
}

/** True for 玄/地/天 — rare lean in loot. */
export function isRareQuality(q: InherentQuality): boolean {
  return q === 'xuan' || q === 'di' || q === 'tian';
}

/** Save migration: old fan|liang|you|ji → InherentQuality. */
export const LEGACY_QUALITY_MAP: Record<string, InherentQuality> = {
  fan: 'fan',
  liang: 'huang',
  you: 'xuan',
  ji: 'di',
  // already-new ids pass through
  tian: 'tian',
  di: 'di',
  xuan: 'xuan',
  huang: 'huang',
  lie: 'lie',
};

export function migrateQuality(raw: unknown): InherentQuality {
  if (typeof raw === 'string' && raw in LEGACY_QUALITY_MAP) return LEGACY_QUALITY_MAP[raw]!;
  return 'fan';
}

export function isInherentQuality(s: string): s is InherentQuality {
  return (INHERENT_QUALITIES as readonly string[]).includes(s);
}

/* ── 功法修为等级 GongfaRank（外功 + 内功心法） ──────────────── */

/** 入门 / 小成 / 大成 / 圆满 / 化境 — still 5 steps; storage stays 1..5. */
export type GongfaRankId = 'rumen' | 'xiaocheng' | 'dacheng' | 'yuanman' | 'huajing';

export const GONGFA_RANKS = ['rumen', 'xiaocheng', 'dacheng', 'yuanman', 'huajing'] as const satisfies readonly GongfaRankId[];

export const GONGFA_RANK_NAME: Record<GongfaRankId, string> = {
  rumen: '入门',
  xiaocheng: '小成',
  dacheng: '大成',
  yuanman: '圆满',
  huajing: '化境',
};

/** Ceiling label (rank 5) — not 「大成」 alone. */
export const GONGFA_RANK_MAX_LABEL = GONGFA_RANK_NAME.huajing;

/** Map stored int 1..5 → GongfaRankId. */
export function gongfaRankId(rank: number): GongfaRankId {
  const i = Math.max(1, Math.min(5, Math.floor(rank || 1))) - 1;
  return GONGFA_RANKS[i]!;
}

/** UI label for stored rank int (0 → 未修). */
export function gongfaRankName(rank: number): string {
  if (rank < 1) return '未修';
  return GONGFA_RANK_NAME[gongfaRankId(rank)];
}

/* ── 符箓 / 丹药品级 ConsumableGrade ─────────────────────────── */

export type ConsumableGrade = 'shang' | 'zhong' | 'xia';

export const CONSUMABLE_GRADES = ['shang', 'zhong', 'xia'] as const satisfies readonly ConsumableGrade[];

export const GRADE_NAME: Record<ConsumableGrade, string> = {
  shang: '上品',
  zhong: '中品',
  xia: '下品',
};

export function isConsumableGrade(s: string): s is ConsumableGrade {
  return (CONSUMABLE_GRADES as readonly string[]).includes(s);
}

/* ── 装备阶位 EquipTier（兵刃 + 防具） ───────────────────────── */

/**
 * EquipTier is the user-facing 装备等级 ladder (「一阶」…「九阶」).
 * Forge / 强化 progression stays on GearItem.level (淬炼第N重, capped separately).
 * Do not conflate the two: tier = grade; level = reinforce.
 */
export type EquipTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const EQUIP_TIER_MIN = 1;
export const EQUIP_TIER_MAX = 9;

const TIER_HAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

export function equipTierName(tier: number): string {
  const t = clampEquipTier(tier);
  return `${TIER_HAN[t]}阶`;
}

export function clampEquipTier(n: unknown, fallback: EquipTier = 1): EquipTier {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : fallback;
  return Math.max(EQUIP_TIER_MIN, Math.min(EQUIP_TIER_MAX, v)) as EquipTier;
}

export function isEquipTier(n: unknown): n is EquipTier {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 9;
}

/** Default starting tier when identifying/forging, keyed by inherent quality. */
export const QUALITY_DEFAULT_TIER: Record<InherentQuality, EquipTier> = {
  lie: 1,
  fan: 1,
  huang: 2,
  xuan: 4,
  di: 6,
  tian: 8,
};

/** Soft coerce: unknown string → undefined + warn (plugins must not invent tiers). */
export function coerceInherentQuality(raw: unknown, where = 'quality'): InherentQuality | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string' && isInherentQuality(raw)) return raw;
  console.warn(`[taxonomy] 未知${where}=${String(raw)}，已忽略（仅允许 ${INHERENT_QUALITIES.join('|')}）`);
  return undefined;
}

export function coerceConsumableGrade(raw: unknown, where = 'grade'): ConsumableGrade | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string' && isConsumableGrade(raw)) return raw;
  console.warn(`[taxonomy] 未知${where}=${String(raw)}，已忽略（仅允许 ${CONSUMABLE_GRADES.join('|')}）`);
  return undefined;
}

export function coerceEquipTier(raw: unknown, where = 'tier'): EquipTier | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (isEquipTier(raw)) return raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    console.warn(`[taxonomy] ${where}=${raw} 超出 1..9，已钳制`);
    return clampEquipTier(raw);
  }
  console.warn(`[taxonomy] 未知${where}=${String(raw)}，已忽略（仅允许 1..9）`);
  return undefined;
}

/* ── 击杀掉落尺子（种类门槛 + 全局稀有率；内容 id 仍由插件贡献） ─ */

/**
 * 图纸 / 装备 / 丹方：仅精英（或 Boss）击杀才掷骰；普通杂兵恒为 0。
 * 材料、血晶、药水、秘籍等不在此列。
 */
export const ELITE_ONLY_KILL_LOOT_KINDS = ['blueprint', 'gear', 'pillRecipe'] as const;

export type EliteOnlyKillLootKind = (typeof ELITE_ONLY_KILL_LOOT_KINDS)[number];

export function isEliteOnlyKillLootKind(kind: string): kind is EliteOnlyKillLootKind {
  return (ELITE_ONLY_KILL_LOOT_KINDS as readonly string[]).includes(kind);
}

/**
 * 全局 onKill 稀有掉落率（普通怪对精英门槛种类恒为 0）。
 * 历史：blueprint elite 0.12 / normal 0.035；gear elite 0.18 / normal 0.07。
 */
export const KILL_LOOT_CHANCE = {
  /** 精英击杀掉图纸 */
  blueprintElite: 0.045,
  /** 精英击杀掉未鉴定装备 */
  gearElite: 0.07,
  /** Boss 击杀（若走 onKill）略高于精英 */
  blueprintBoss: 0.06,
  gearBoss: 0.09,
} as const;

/**
 * EnemyDef.loot 表里精英门槛种类的 chance 乘子（表内数值再压一截）。
 * 材料 / 血晶 / skill / neigong 等不受影响。
 */
export const ELITE_ONLY_TABLE_CHANCE_MUL = 0.55;

