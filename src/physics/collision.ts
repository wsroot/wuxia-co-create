import type { Rect } from './body';
import type { V } from '../engine/math';

export const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Converts a facing-right local box (relative to feet) into world space. */
export function worldBox(box: Rect, fx: number, fy: number, facing: number): Rect {
  return {
    x: facing > 0 ? fx + box.x : fx - box.x - box.w,
    y: fy + box.y,
    w: box.w,
    h: box.h,
  };
}

export function overlapCenter(a: Rect, b: Rect): V {
  const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w);
  const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h);
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}
