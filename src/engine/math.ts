export interface V { x: number; y: number }
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const choose = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeIn = (t: number) => Math.pow(clamp(t, 0, 1), 2);
export const approach = (v: number, target: number, step: number) =>
  v < target ? Math.min(v + step, target) : Math.max(v - step, target);
export const sign = (v: number) => (v < 0 ? -1 : 1);

/** Deterministic RNG for procedural textures. */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
