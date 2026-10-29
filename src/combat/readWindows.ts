/**
 * 读招窗口：破绽 / 反击帧（敌人与 Boss 攻击过程）。
 * Tuned: counter slightly narrower / less punishing; vuln still rewarding.
 */
import type { Fighter } from '../entities/fighter';
import type { AttackInst } from './types';

export type ReadWindow = 'counter' | 'vuln' | 'neutral';

/**
 * During an attack:
 * - late startup → early active: 反击
 * - recovery: 破绽
 * Outside attack: stagger/parried/hitstun count as 破绽.
 */
export function readWindowOf(f: Fighter): ReadWindow | null {
  if (f.dead) return null;
  if (['stagger', 'parried', 'hitstun', 'down', 'getup'].includes(f.state)) return 'vuln';
  const a = f.atk;
  if (!a || f.state !== 'attack') return null;
  return windowFromAttack(a, !!f.superArmor || ('eliteMod' in f && !!(f as { eliteMod?: string | null }).eliteMod));
}

function windowFromAttack(a: AttackInst, eliteOrBoss: boolean): ReadWindow {
  const d = a.def;
  const f = a.f;
  const activeEnd = d.startup + d.active;
  const total = activeEnd + d.recovery;
  // Recovery = full 破绽 (slightly earlier: last 2 active frames count as vuln for readability)
  if (f >= activeEnd - (d.active > 4 ? 1 : 0) && f < total) return 'vuln';
  // Counter: narrower — only late startup into first ~40% active; require meaningful startup
  const counterLead = eliteOrBoss ? 7 : 4;
  const counterStart = Math.max(0, d.startup - counterLead);
  const counterEnd = d.startup + Math.max(1, Math.floor(d.active * 0.4));
  if (f >= counterStart && f < counterEnd && d.startup >= 12) return 'counter';
  // Elite/boss short moves: very brief counter on first active frame only
  if (eliteOrBoss && d.startup >= 8 && f >= d.startup && f < d.startup + 2) return 'counter';
  return 'neutral';
}

export function readWindowLabel(w: ReadWindow): string {
  if (w === 'counter') return '反击';
  if (w === 'vuln') return '破绽';
  return '';
}

export function readWindowColor(w: ReadWindow): string {
  if (w === 'counter') return '#ff6060';
  if (w === 'vuln') return '#ffd27a';
  return '#c8c0d0';
}

export function vulnDmgMul(w: ReadWindow | null): number {
  return w === 'vuln' ? 1.32 : 1;
}

export function vulnHitstunBonus(w: ReadWindow | null): number {
  return w === 'vuln' ? 8 : 0;
}

export function windowPoiseMul(w: ReadWindow | null): number {
  if (w === 'vuln') return 1.4;
  if (w === 'counter') return 0.45;
  return 1;
}

/** Player chip when hitting into 反击 (softer than first pass). */
export function counterPunishMul(): number {
  return 0.22;
}

/** Outgoing damage retained when hitting into 反击. */
export function counterOutgoingMul(): number {
  return 0.72;
}
