import { GROUND_Y } from '../engine/constants';
import { rand, choose } from '../engine/math';
import { drawGlow } from './glow';

export type PKind = 'spark' | 'blood' | 'dust' | 'ember' | 'bone' | 'shard' | 'ring' | 'flare' | 'line' | 'fire' | 'mote' | 'qi';

export interface Particle {
  kind: PKind;
  x: number; y: number; vx: number; vy: number;
  life: number; max: number;
  size: number; color: string;
  g: number; drag: number;
  rot: number; vr: number;
  len: number; add: boolean;
  x2: number; y2: number;
}

const MAX = 900;

export class Particles {
  list: Particle[] = [];

  spawn(p: Partial<Particle> & { kind: PKind; x: number; y: number }): Particle {
    const q: Particle = {
      vx: 0, vy: 0, life: 30, max: 30, size: 3, color: '#fff', g: 0, drag: 1,
      rot: 0, vr: 0, len: 1, add: false, x2: 0, y2: 0, ...p,
    };
    if (p.life !== undefined && p.max === undefined) q.max = p.life;
    if (this.list.length >= MAX) this.list.shift();
    this.list.push(q);
    return q;
  }

  // ---- presets --------------------------------------------------------
  hitSpark(x: number, y: number, dir: number, heavy = false, color = '#c01828'): void {
    const n = heavy ? 18 : 11;
    for (let i = 0; i < n; i++) {
      const a = (dir > 0 ? 0 : Math.PI) + rand(-1.1, 1.1);
      const sp = rand(5, heavy ? 15 : 11);
      this.spawn({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(10, 20) | 0, size: rand(1.5, 3), len: rand(2, 4), drag: 0.86, color: i % 3 === 0 ? '#ffd0d6' : color, add: true });
    }
    this.spawn({ kind: 'flare', x, y, life: 10, size: heavy ? 70 : 46, color: '#c02838', add: true });
    this.spawn({ kind: 'flare', x, y, life: 6, size: heavy ? 34 : 22, color: '#ffffff', add: true });
    this.spawn({ kind: 'ring', x, y, life: 12, size: heavy ? 46 : 30, color: '#e04050' });
    for (let i = 0; i < (heavy ? 16 : 8); i++) {
      this.spawn({ kind: 'blood', x, y, vx: dir * rand(1.2, 7.5) + rand(-1.2, 1.2), vy: rand(-8, -0.5), life: rand(34, 70) | 0, size: rand(1.4, 3.8), g: 0.34, drag: 0.985, color: choose(['#5a0010', '#8a1020', '#c01828', '#2a0808']) });
    }
    // cinnabar + ink mist
    for (let i = 0; i < (heavy ? 8 : 3); i++) {
      this.spawn({ kind: 'blood', x, y, vx: dir * rand(0.4, 3) + rand(-2, 2), vy: rand(-4, 1), life: rand(18, 36) | 0, size: rand(0.8, 1.6), g: 0.22, drag: 0.96, color: choose(['#e03040', '#901020', '#1a1018']) });
    }
  }

  guardSpark(x: number, y: number, dir: number, perfect = false): void {
    const n = perfect ? 26 : 10;
    for (let i = 0; i < n; i++) {
      const a = (dir > 0 ? Math.PI : 0) + rand(-1.4, 1.4);
      const sp = rand(4, perfect ? 16 : 9);
      this.spawn({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(10, 24) | 0, size: rand(1.4, 2.6), len: 3, drag: 0.88, color: perfect ? choose(['#fff6d0', '#a8e8c0', '#ffffff']) : '#70c8a0', add: true, g: 0.15 });
    }
    this.spawn({ kind: 'flare', x, y, life: perfect ? 18 : 8, size: perfect ? 120 : 40, color: perfect ? '#ffe7a0' : '#80d0b0', add: true });
    if (perfect) {
      this.spawn({ kind: 'ring', x, y, life: 22, size: 110, color: '#fff2c0' });
      this.spawn({ kind: 'ring', x, y, life: 16, size: 60, color: '#ffffff' });
    }
  }

  boneShatter(x: number, y: number, dir: number): void {
    for (let i = 0; i < 16; i++) {
      this.spawn({ kind: 'bone', x: x + rand(-14, 14), y: y - rand(10, 70), vx: dir * rand(0, 6) + rand(-3, 3), vy: rand(-9, -2), life: rand(50, 80) | 0, size: rand(4, 10), g: 0.42, drag: 0.99, rot: rand(0, 6), vr: rand(-0.4, 0.4), color: choose(['#4a3420', '#2a2030', '#6a5040', '#c8b090']) });
    }
    for (let i = 0; i < 12; i++) this.spawn({ kind: 'dust', x: x + rand(-25, 25), y: y - rand(0, 50), vx: rand(-1, 1), vy: rand(-1, 0), life: rand(30, 50) | 0, size: rand(10, 22), color: '#6a5a7a' });
    for (let i = 0; i < 10; i++) this.spawn({ kind: 'ember', x: x + rand(-20, 20), y: y - rand(10, 60), vx: rand(-1, 1), vy: rand(-2.5, -0.5), life: rand(40, 70) | 0, size: rand(1.5, 3), color: choose(['#c01828', '#e8d8a0', '#60a080']), add: true });
  }

  stoneShatter(x: number, y: number, n = 30): void {
    for (let i = 0; i < n; i++) {
      this.spawn({ kind: 'shard', x: x + rand(-40, 40), y: y - rand(0, 120), vx: rand(-9, 9), vy: rand(-12, -2), life: rand(60, 100) | 0, size: rand(4, 14), g: 0.4, drag: 0.99, rot: rand(0, 6), vr: rand(-0.3, 0.3), color: choose(['#5a5268', '#463f55', '#6e6580']) });
    }
  }

  dust(x: number, y: number, n = 6, dir = 0): void {
    for (let i = 0; i < n; i++) {
      this.spawn({ kind: 'dust', x: x + rand(-10, 10), y: y - rand(0, 6), vx: dir * rand(0.5, 3) + rand(-1.2, 1.2), vy: rand(-1.4, -0.2), life: rand(22, 40) | 0, size: rand(6, 14), color: '#4a3f5a' });
    }
  }

  ring(x: number, y: number, r: number, color: string, life = 18): void {
    this.spawn({ kind: 'ring', x, y, life, size: r, color });
  }

  flare(x: number, y: number, r: number, color: string, life = 12): void {
    this.spawn({ kind: 'flare', x, y, life, size: r, color, add: true });
  }

  slashLine(x1: number, y1: number, x2: number, y2: number, color = '#ff2040', life = 14, width = 6): void {
    this.spawn({ kind: 'line', x: x1, y: y1, x2, y2, life, size: width, color, add: true });
  }

  /** 剑气 crescent — pure VFX (no hurtbox). */
  swordQi(x: number, y: number, dir: number, heavy = false): void {
    const life = heavy ? 18 : 12;
    const reach = heavy ? 110 : 70;
    this.spawn({
      kind: 'qi', x, y, vx: dir * (heavy ? 9 : 6), vy: heavy ? -1.2 : -0.6,
      life, size: heavy ? 28 : 18, len: reach, color: heavy ? '#e8f0ff' : '#b8d0f0',
      add: true, drag: 0.94, rot: dir > 0 ? -0.4 : Math.PI + 0.4,
    });
    this.spawn({
      kind: 'qi', x: x + dir * 8, y: y + 6, vx: dir * (heavy ? 7 : 4.5), vy: 0.4,
      life: life - 3, size: heavy ? 18 : 12, len: reach * 0.75,
      color: '#ffd0d8', add: true, drag: 0.93, rot: dir > 0 ? 0.25 : Math.PI - 0.25,
    });
    if (heavy) {
      this.spawn({ kind: 'flare', x: x + dir * 20, y, life: 8, size: 40, color: '#c8e0ff', add: true });
      this.slashLine(x, y - 10, x + dir * reach, y - 30, '#ffffff', 10, 3);
    }
  }

  fire(x: number, y: number, n = 3, spread = 6): void {
    for (let i = 0; i < n; i++) {
      this.spawn({ kind: 'fire', x: x + rand(-spread, spread), y: y + rand(-spread, spread), vx: rand(-0.6, 0.6), vy: rand(-1.6, -0.3), life: rand(14, 26) | 0, size: rand(5, 11), color: choose(['#ff6a1a', '#ff9a30', '#ff3a10']), add: true });
    }
  }

  update(): void {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.vy += p.g;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if ((p.kind === 'bone' || p.kind === 'shard' || p.kind === 'blood') && p.y > GROUND_Y - 2) {
        p.y = GROUND_Y - 2;
        if (p.kind === 'blood') { p.vx = 0; p.vy = 0; p.g = 0; }
        else { p.vy *= -0.35; p.vx *= 0.6; p.vr *= 0.5; }
      }
      if (--p.life <= 0) L.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      const k = p.life / p.max;
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      switch (p.kind) {
        case 'spark': {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = Math.min(1, k * 1.6);
          ctx.lineWidth = p.size * (0.4 + k);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * p.len, p.y - p.vy * p.len);
          ctx.stroke();
          break;
        }
        case 'blood':
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.g === 0 ? p.size * 1.3 : p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'dust':
          ctx.globalAlpha = k * 0.35;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'ember':
        case 'mote':
          ctx.globalAlpha = Math.min(1, k * 2) * (p.kind === 'mote' ? 0.5 : 1);
          drawGlow(ctx, p.x, p.y, p.size * 4, p.color, 0.8);
          break;
        case 'fire':
          ctx.globalAlpha = k;
          drawGlow(ctx, p.x, p.y, p.size * (0.6 + k), p.color, 1);
          break;
        case 'bone': {
          ctx.globalAlpha = Math.min(1, k * 3);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -1.5, p.size, 3);
          ctx.beginPath();
          ctx.arc(-p.size / 2, 0, 2.2, 0, Math.PI * 2);
          ctx.arc(p.size / 2, 0, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'shard': {
          ctx.globalAlpha = Math.min(1, k * 3);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(-p.size / 2, p.size / 3);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(0, -p.size / 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'ring':
          ctx.globalAlpha = k;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3 * k + 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - k * 0.8), 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'qi': {
          const a = Math.max(0, p.life / p.max);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          const grd = ctx.createLinearGradient(0, 0, p.len, 0);
          grd.addColorStop(0, p.color + '00');
          grd.addColorStop(0.25, p.color);
          grd.addColorStop(1, '#ffffff00');
          ctx.strokeStyle = grd;
          ctx.globalAlpha = a * 0.95;
          ctx.lineWidth = p.size * a;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(p.len * 0.45, -p.size * 0.8, p.len, -p.size * 0.15);
          ctx.stroke();
          ctx.lineWidth = Math.max(1.5, p.size * 0.25 * a);
          ctx.strokeStyle = `rgba(255,255,255,${a * 0.7})`;
          ctx.beginPath();
          ctx.moveTo(p.len * 0.1, 0);
          ctx.quadraticCurveTo(p.len * 0.5, -p.size * 0.4, p.len * 0.9, 0);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'flare':
          ctx.globalAlpha = k;
          drawGlow(ctx, p.x, p.y, p.size * (0.5 + 0.5 * k), p.color, 1);
          break;
        case 'line': {
          ctx.globalAlpha = k;
          ctx.strokeStyle = p.color;
          ctx.lineCap = 'round';
          ctx.lineWidth = p.size * k;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x2, p.y2);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = p.size * k * 0.3;
          ctx.stroke();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
