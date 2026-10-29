import type { MaterialId } from './materials';
import type { WeaponCategory } from './weapons';
import { getSkill, listSkills, skillMapView } from './contentRegistry';
import type { ScriptStep } from './talismanScripts';
import type { AnimStep } from './animScripts';

/** Built-in 外功 ids (type-safe helpers / effect tables). */
export type CoreSkillId =
  | 'qinggong' | 'shanshen' | 'tiebushan' | 'lianhuan'
  | 'pojun' | 'liaoshang'
  | 'daomang' | 'qiangjue' | 'bengquan' | 'huzhua'
  | 'huixuan' | 'zhanma'           // 刀剑
  | 'tuci' | 'chuanxin'            // 枪
  | 'hengsao' | 'kaitian'          // 重兵
  | 'tieshan' | 'fanyun'           // 空手
  | 'ningqi';                      // 通用

/** Runtime / save id — any registered skill (core or a loaded 门派). */
export type SkillId = string;

export type SkillKind = 'passive' | 'active';
export type SkillTrack = 'combat';

/** Weapon gate for actives. Passives use undefined. */
export type SkillWeaponGate = WeaponCategory | 'any';

export const SKILL_RANK_MAX = 5;

export interface SkillDef {
  id: SkillId; // string; core ids are CoreSkillId
  name: string;
  /** Fog until obtained. */
  fogName: string;
  kind: SkillKind;
  track: SkillTrack;
  lore: string;
  meditateCost: Partial<Record<MaterialId, number>>;
  fee: number;
  tip: string;
  profHint: string;
  /** Active: which weapon family can cast. */
  weaponGate?: SkillWeaponGate;
  /** 内力 cost to cast (actives). */
  neiliCost?: number;
  /** 固有品质 — tagged by core; framework owns the ladder. */
  quality?: import('./taxonomy').InherentQuality;
  /** Per-rank combat numbers; effectsAtRank reads these (plugins: put data here). */
  effects?: SkillEffectsTable;
  /** How castSkill resolves an active. Passives omit. */
  castKind?: SkillCastKind;
  /**
   * When castKind==='attack': AttackBox catalog id (`ctx.attacks` / getAttackBox).
   * Soft-skip with「招式未备」if missing. No bare BARE[] fallback (W1).
   */
  attackKey?: string;
  /** Passive proficiency triggers (framework awards prof when these combat events fire). */
  profOn?: Array<'jump' | 'dash' | 'block' | 'hitTaken' | 'dashKickHit' | 'poiseBuffHit'>;
  /** Motion command sequence (D/F/B/U). Omit = not command-castable. */
  commandSeq?: Array<'D' | 'F' | 'B' | 'U'>;
  /** Hub command label, e.g. ↓→攻. */
  commandLabel?: string;
  /** HUD hint when equipped & gate matches, e.g. 破军↓→J. */
  hudHint?: string;
  /** Touch / shortcut priority (higher first). Default 0. */
  touchPriority?: number;
  /** After attackKey finishes, auto-chain these AttackBox catalog ids (多段). Soft-skip missing. */
  attackChain?: string[];
  /**
   * Cast VFX timeline — ScriptStep subset (wait/fx/shake/hitstop/flash/sfx/float/banner).
   * Played by core on successful cast. Full ScriptStep set (talisman parity); attackKey → AttackBox catalog id.
   */
  castFx?: ScriptStep[];
  /**
   * Look-only animation recipe — AnimStep id or inline steps (pose / trail / arc / seal…).
   * Plays alongside castFx (both may fire). Does not deal damage; attackKey / castFx damage* still settle hits.
   */
  castAnim?: string | AnimStep[];
}

/** Closed per-rank effect tables (index 0 = 入门 / rank 1). Seconds become frames in effectsAtRank. */
export interface SkillEffectsTable {
  defBonus?: number[];
  jumpBoost?: number[];
  doubleJump?: boolean;
  canDash?: boolean;
  dashKickBonus?: number[];
  pojunMult?: number[];
  pojunDurationSec?: number[];
  pojunCdSec?: number[];
  healAmt?: number[];
  healCdSec?: number[];
  skillDmgMult?: number[];
  skillCdSec?: number[];
}

export type SkillCastKind = 'heal' | 'pojun' | 'ningqi' | 'attack';


/** Built-in 外功 — registered by the official 门派「长夜」(src/menpai/core). */
/** Oc5: isCore* 查官方包 id 集（字面量在 changye/seeds；不对外 re-export）。 */
import { CORE_SKILLS } from '../content/changye/seeds/skills';

/** Live catalog backed by ctx.skills (core + loaded 门派). */
export const SKILLS: SkillDef[] = listSkills();
export const SKILL_BY_ID: Record<string, SkillDef> = skillMapView();

export function isSkillId(id: string): id is SkillId {
  return getSkill(id) !== undefined;
}

export function isCoreSkillId(id: string): id is CoreSkillId {
  return CORE_SKILLS.some((s) => s.id === id);
}

export { getSkill, listSkills };

export const MAX_ACTIVE_SLOTS = Number.POSITIVE_INFINITY;

export function profToNext(rank: number): number {
  if (rank < 1 || rank >= SKILL_RANK_MAX) return 0;
  return 40 + rank * 35;
}

export function meditateCostFor(_id: SkillId, _nextRank: number): { mats: Partial<Record<MaterialId, number>>; fee: number } {
  return { mats: {}, fee: 0 };
}

export function skillUsableWith(id: SkillId, cat: WeaponCategory): boolean {
  const g = SKILL_BY_ID[id]?.weaponGate;
  if (!g) return true; // passive
  if (g === 'any') return true;
  return g === cat;
}

export function gateLabel(gate: SkillWeaponGate | undefined): string {
  if (!gate || gate === 'any') return '不限兵器';
  const map: Record<WeaponCategory, string> = {
    bare: '空手', blade: '刀剑', spear: '枪', heavy: '重兵（斧锤）'
  };
  return map[gate];
}


export interface SkillEffects {
  rageBonus: number;
  defBonus: number;
  jumpBoost: number;
  doubleJump: boolean;
  canDash: boolean;
  dashKickBonus: number;
  pojunMult: number;
  pojunDuration: number;
  pojunCd: number;
  healAmt: number;
  healCd: number;
  /** Category skill power scalars */
  skillDmgMult: number;
  skillCd: number;
}

function rankPick(table: number[] | undefined, i: number, fallback: number): number {
  if (!table || table.length === 0) return fallback;
  return table[Math.min(i, table.length - 1)] ?? fallback;
}

function secFrames(sec: number): number {
  return Math.round(sec * 60);
}

export function effectsAtRank(id: SkillId, rank: number): SkillEffects {
  const z: SkillEffects = {
    rageBonus: 0, defBonus: 0, jumpBoost: 1, doubleJump: false, canDash: false, dashKickBonus: 0,
    pojunMult: 1, pojunDuration: 0, pojunCd: 9999, healAmt: 0, healCd: 9999,
    skillDmgMult: 1, skillCd: 900
  };
  if (rank < 1) return z;
  const i = Math.min(SKILL_RANK_MAX, rank) - 1;
  const table = getSkill(id)?.effects;
  if (!table) return z;
  const out: SkillEffects = { ...z };
  if (table.defBonus) out.defBonus = rankPick(table.defBonus, i, 0);
  if (table.jumpBoost) out.jumpBoost = rankPick(table.jumpBoost, i, 1);
  if (table.doubleJump) out.doubleJump = true;
  if (table.canDash) out.canDash = true;
  if (table.dashKickBonus) out.dashKickBonus = rankPick(table.dashKickBonus, i, 0);
  if (table.pojunMult) out.pojunMult = rankPick(table.pojunMult, i, 1);
  if (table.pojunDurationSec) out.pojunDuration = secFrames(rankPick(table.pojunDurationSec, i, 0));
  if (table.pojunCdSec) out.pojunCd = secFrames(rankPick(table.pojunCdSec, i, 9999 / 60));
  if (table.healAmt) out.healAmt = rankPick(table.healAmt, i, 0);
  if (table.healCdSec) out.healCd = secFrames(rankPick(table.healCdSec, i, 9999 / 60));
  if (table.skillDmgMult) out.skillDmgMult = rankPick(table.skillDmgMult, i, 1);
  if (table.skillCdSec) out.skillCd = secFrames(rankPick(table.skillCdSec, i, 15));
  return out;
}

export function tipAtRank(id: SkillId, rank: number): string {
  if (rank < 1) return '未习得';
  const e = effectsAtRank(id, rank);
  const def = SKILL_BY_ID[id];
  const gate = def?.weaponGate ? ` · ${gateLabel(def.weaponGate)}` : '';
  const ni = def?.neiliCost ? ` · 内力 ${def.neiliCost}` : '';
  const kind = def?.castKind;
  if (e.defBonus > 0 && !kind) return `常驻减伤 +${Math.round(e.defBonus * 100)}%`;
  if (e.doubleJump) return `跳跃 ×${e.jumpBoost.toFixed(2)} · 二段跳`;
  if (e.canDash) return `闪身步 · 冲刺踢 +${Math.round(e.dashKickBonus * 100)}%`;
  if (!kind && e.dashKickBonus > 0) return `连环腿 +${Math.round(e.dashKickBonus * 100)}%（需闪身）`;
  if (kind === 'pojun') return `破势 ×${e.pojunMult.toFixed(2)} · ${Math.round(e.pojunDuration / 60)}秒${gate}${ni}`;
  if (kind === 'heal') return `回复 ${e.healAmt} · 冷却 ${Math.round(e.healCd / 60)}秒${ni}`;
  if (kind === 'ningqi') return `凝气 · 短时强化 · 冷却 ${Math.round(e.skillCd / 60)}秒${ni}`;
  if (kind === 'attack') {
    const label = def?.name ?? id;
    const extra =
      id === 'chuanxin' || def?.attackKey === 'chuanxin' ? ' · 高破韧' :
      id === 'kaitian' || def?.attackKey === 'kaitian' || id === 'tieshan' || def?.attackKey === 'tieshan' ? ' · 霸体' :
      id === 'fanyun' || def?.attackKey === 'fanyun' ? ' · 上挑' : '';
    return `${label} ×${e.skillDmgMult.toFixed(2)}${extra}${gate}${ni}`;
  }
  return def?.tip ?? id;
}

export function skillDisplayName(id: SkillId, known: boolean): string {
  const d = SKILL_BY_ID[id];
  if (!d) return id;
  return known ? d.name : d.fogName;
}

/** Skills that declare a given proficiency trigger (plugin-safe; no id switch). */
export function skillsWithProfOn(trigger: NonNullable<SkillDef['profOn']>[number]): SkillDef[] {
  return SKILLS.filter((s) => s.profOn?.includes(trigger));
}
