/**
 * 安魂目标 — per-act hidden optional.
 */
import type { Game } from '../game';
import { tryAddFragment } from '../meta/runFragments';

export type AnhunGoalId = 'protectBell' | 'noBrazier' | 'tideClean' | 'noBengdao';

export interface AnhunGoal {
  id: AnhunGoalId;
  fogName: string;
  name: string;
  desc: string;
}

export const ANHUN_GOALS: AnhunGoal[] = [
  { id: 'protectBell', fogName: '安魂·??', name: '护钟', desc: '本幕勿击破安魂钟' },
  { id: 'noBrazier', fogName: '安魂·??', name: '冷焰', desc: '本幕勿引爆火盆' },
  { id: 'tideClean', fogName: '安魂·??', name: '潮净', desc: '肃清邪气潮' },
  { id: 'noBengdao', fogName: '安魂·??', name: '稳锋', desc: '本幕零崩刀' },
];

export function pickAnhunGoal(actIndex: number): AnhunGoal {
  return ANHUN_GOALS[actIndex % ANHUN_GOALS.length]!;
}

export interface AnhunRuntime {
  goal: AnhunGoal;
  failed: boolean;
  done: boolean;
  known: boolean;
}

export function startAnhun(actIndex: number): AnhunRuntime {
  return { goal: pickAnhunGoal(actIndex), failed: false, done: false, known: false };
}

export function failAnhun(g: Game, reason: AnhunGoalId): void {
  if (!g.anhun || g.anhun.failed || g.anhun.done) return;
  if (g.anhun.goal.id !== reason) return;
  g.anhun.failed = true;
  g.texts.add('安魂破…', g.player.x, g.player.y - 120, '#a090a0', 14);
}

export function tryCompleteAnhun(g: Game): void {
  if (!g.anhun || g.anhun.failed || g.anhun.done) return;
  const id = g.anhun.goal.id;
  let ok = false;
  if (id === 'tideClean' && g.runEvents.tideCleared) ok = true;
  if ((id === 'protectBell' || id === 'noBrazier' || id === 'noBengdao') && g.director.phase === 'transition') {
    ok = !g.anhun.failed;
  }
  if (!ok) return;
  g.anhun.done = true;
  g.anhun.known = true;
  g.showBanner('安魂', g.anhun.goal.name, 90);
  tryAddFragment(g.fragments, 'guixi');
  g.meta?.unlockTitle('anhun');
}
