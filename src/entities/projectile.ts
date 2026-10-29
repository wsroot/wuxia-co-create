import { GROUND_Y } from '../engine/constants';
import type { AttackDef } from '../combat/types';
import type { Rect } from '../physics/body';
import type { Game } from '../game';
import type { Team } from './fighter';
import { drawGlow } from '../effects/glow';
import { playSfx, type Sfx } from '../audio/sfx';
import { getProjectile } from '../meta/contentRegistry';

/** @deprecated Prefer catalog ProjectileDef ids; drawKind still arrow|fireball. */
export type ProjKind = string;

export class Projectile {
  dead = false;
  life = 240;
  hit = new Set<object>();
  reflected = false;
  t = 0;

  constructor(
    public kind: ProjKind,
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public team: Team,
    public def: AttackDef,
  ) {}

  rect(): Rect {
    const d = getProjectile(this.kind);
    const draw = d?.drawKind ?? (this.kind === 'fireball' ? 'fireball' : 'arrow');
    const w = d?.hitW ?? (draw === 'arrow' ? 24 : 28);
    const h = d?.hitH ?? (draw === 'arrow' ? 8 : 28);
    return { x: this.x - w / 2, y: this.y - h / 2, w, h };
  }

  reflect(): void {
    this.vx = -this.vx * 1.5;
    this.vy = -Math.abs(this.vy) * 0.5;
    this.team = this.team === 'enemy' ? 'player' : 'enemy';
    this.reflected = true;
    this.hit.clear();
    this.def = { ...this.def, damage: this.def.damage * 2, kbX: 6, kbY: -5, knockdown: true };
  }

  update(g: Game): void {
    this.t++;
    this.x += this.vx;
    this.y += this.vy;
    const d = getProjectile(this.kind);
    const draw = d?.drawKind ?? (this.kind === 'fireball' ? 'fireball' : 'arrow');
    const lifeMax = d?.life;
    if (lifeMax != null && this.t === 1) this.life = lifeMax;
    if (draw === 'fireball' || d?.explodeOnGround) {
      const every = d?.trailEvery ?? 2;
      if (every > 0 && this.t % every === 0) g.fx.fire(this.x - this.vx, this.y - this.vy, 1, 5);
      if (this.y >= GROUND_Y - 6) this.explode(g);
    } else if (this.y >= GROUND_Y - 2) {
      this.dead = true;
      g.fx.dust(this.x, GROUND_Y, 2);
    }
    if (--this.life <= 0 || this.x < g.cam.x - 200 || this.x > g.cam.x + 1200) this.dead = true;
  }

  explode(g: Game): void {
    if (this.dead) return;
    this.dead = true;
    const d = getProjectile(this.kind);
    const draw = d?.drawKind ?? (this.kind === 'fireball' ? 'fireball' : 'arrow');
    if (draw === 'fireball' || d?.explodeOnGround) {
      g.fx.fire(this.x, this.y, 14, 18);
      g.fx.flare(this.x, this.y, 70, '#ff6020', 16);
      g.fx.ring(this.x, this.y, 50, '#ff8040', 14);
      g.cam.shake(3, 6);
      playSfx(g.audio, (d?.explodeSfx ?? 'fire') as Sfx);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const d = getProjectile(this.kind);
    const draw = d?.drawKind ?? (this.kind === 'fireball' ? 'fireball' : 'arrow');
    if (draw === 'arrow') {
      const a = Math.atan2(this.vy, this.vx);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(a);
      if (this.reflected) drawGlow(ctx, 0, 0, 22, '#ffd27a', 0.8);
      ctx.strokeStyle = '#6a5038';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.fillStyle = '#b8bcc8';
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(8, -3.5); ctx.lineTo(8, 3.5); ctx.fill();
      ctx.fillStyle = '#8a1020';
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-20, -4); ctx.lineTo(-12, 0); ctx.lineTo(-20, 4); ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, this.x, this.y, 40, '#ff4010', 0.9);
      drawGlow(ctx, this.x, this.y, 18, '#ffd060', 1);
      ctx.restore();
    }
  }
}
