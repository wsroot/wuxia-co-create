/**
 * Lightweight story beats — banners + optional hold/slowmo.
 * Stable beat ids are documented in README for later script attachment.
 */

export type BeatWhen = 'enter' | 'afterArena' | 'beforeBoss' | 'afterBoss' | 'betweenActs';

export interface StageBeat {
  id: string;
  when: BeatWhen;
  /** Arena index for afterArena; ignored otherwise. */
  arenaIndex?: number;
  title: string;
  subtitle?: string;
  /** Banner / soft hold duration in frames (~60fps). */
  holdFrames?: number;
  /** Optional slowmo factor during hold (e.g. 0.55). */
  slowmo?: number;
}

export interface BeatFireResult {
  id: string;
  holdFrames: number;
}

/** Fire a beat: banner + optional slowmo. Returns hold length for Director soft-lock. */
export function fireBeat(
  g: { showBanner: (t: string, s: string, d?: number) => void; slowmo: (f: number, frames: number) => void },
  beat: StageBeat | undefined,
): BeatFireResult | null {
  if (!beat) return null;
  const hold = beat.holdFrames ?? 120;
  g.showBanner(beat.title, beat.subtitle ?? '', hold);
  if (beat.slowmo != null && beat.slowmo < 1) g.slowmo(beat.slowmo, Math.min(hold, 90));
  return { id: beat.id, holdFrames: hold };
}

/** Look up the first matching beat by when (+ optional arena index). */
export function findBeat(
  beats: StageBeat[] | undefined,
  when: BeatWhen,
  arenaIndex?: number,
): StageBeat | undefined {
  if (!beats) return undefined;
  return beats.find((b) => {
    if (b.when !== when) return false;
    if (when === 'afterArena') return b.arenaIndex === arenaIndex;
    return true;
  });
}
