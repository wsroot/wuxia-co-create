/** Cached soft radial glow sprites per color (cheap additive lights). */
const cache = new Map<string, HTMLCanvasElement>();

export function glowSprite(color: string): HTMLCanvasElement {
  let c = cache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, color);
  grd.addColorStop(0.35, color + '88');
  grd.addColorStop(1, color + '00');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  cache.set(color, c);
  return c;
}

export function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1): void {
  const s = glowSprite(color);
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prev;
}
