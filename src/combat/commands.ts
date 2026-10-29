/**
 * Active 外功 command moves (weapon-gated).
 *
 * Sequences / labels live on SkillDef (commandSeq / commandLabel);
 * this module only matches motion buffers — no content-id tables.
 */
import { SKILL_BY_ID, getSkill, type SkillId } from '../meta/skills';

export const MOTION_GAP = 16;
export const MOTION_LIFE = 32;

export type Motion = 'D' | 'F' | 'B' | 'U';

export interface MotionStep {
  m: Motion;
  at: number;
}

export interface SkillCommand {
  seq: Motion[];
  label: string;
}

/** Read command from live skill catalog (soft: missing / no seq → undefined). */
export function skillCommand(id: SkillId): SkillCommand | undefined {
  const def = getSkill(id) ?? SKILL_BY_ID[id];
  if (!def?.commandSeq?.length) return undefined;
  return {
    seq: def.commandSeq as Motion[],
    label: def.commandLabel ?? '',
  };
}

/** @deprecated Prefer skillCommand — kept as thin live view for callers. */
export const SKILL_COMMANDS: Partial<Record<SkillId, SkillCommand>> = new Proxy(
  {} as Partial<Record<SkillId, SkillCommand>>,
  {
    get(_t, prop) {
      if (typeof prop !== 'string') return undefined;
      return skillCommand(prop);
    },
    has(_t, prop) {
      return typeof prop === 'string' && !!skillCommand(prop);
    },
  },
);

export function commandLabel(id: SkillId): string {
  return skillCommand(id)?.label ?? '';
}

export function matchCommand(buf: MotionStep[], seq: Motion[], now: number): boolean {
  if (!seq.length || buf.length < seq.length) return false;
  const recent = buf.filter((s) => now - s.at <= MOTION_LIFE);
  if (recent.length < seq.length) return false;
  let ri = recent.length - 1;
  const matched: MotionStep[] = [];
  for (let si = seq.length - 1; si >= 0; si--) {
    let found = false;
    while (ri >= 0) {
      const step = recent[ri];
      ri--;
      if (step.m === seq[si]) {
        matched.push(step);
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  matched.reverse();
  for (let i = 1; i < matched.length; i++) {
    if (matched[i].at - matched[i - 1].at > MOTION_GAP) return false;
  }
  if (now - matched[matched.length - 1].at > MOTION_GAP) return false;
  return true;
}

export function pruneMotions(buf: MotionStep[], now: number): MotionStep[] {
  return buf.filter((s) => now - s.at <= MOTION_LIFE).slice(-10);
}
