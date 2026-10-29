/**
 * 失败遗产 — next run boon or harder affix risk.
 */
export type LegacyChoice = 'boon' | 'risk' | null;

export interface LegacyState {
  pending: boolean;
  choice: LegacyChoice;
}

export function emptyLegacy(): LegacyState {
  return { pending: false, choice: null };
}
