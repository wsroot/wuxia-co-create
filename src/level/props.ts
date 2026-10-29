/**
 * 环境互动：木桶 / 火盆 / 安魂钟.
 */
import type { Game } from '../game';
import { GROUND_Y } from '../engine/constants';
import { playSfx } from '../audio/sfx';
import { getAffix } from '../meta/contentRegistry';
import { failAnhun } from './objectives';

export type PropKind = 'barrel' | 'brazier' | 'bell';

export interface WorldProp {
  kind: PropKind;
  x: number;
  y: number;
  hp: number;
  dead: boolean;
  t: number;
}

export function spawnStageProps(g: Game): void {
  g.props = [];
  const act = g.actIndex;
  const base = 400 + act * 40;
  // barrels
  for (let i = 0; i < 4; i++) {
    g.props.push({ kind: 'barrel', x: base + i * 520 + (i % 2) * 80, y: GROUND_Y, hp: 18, dead: false, t: 0 });
  }
  // braziers
  for (let i = 0; i < 2; i++) {
    g.props.push({ kind: 'brazier', x: 1100 + i * 1400, y: GROUND_Y, hp: 28, dead: false, t: 0 });
  }
  // bell near mid / for 安魂钟 synergy
  g.props.push({ kind: 'bell', x: 2400 + act * 100, y: GROUND_Y, hp: 40, dead: false, t: 0 });
}

export function hitProps(g: Game, x: number, y: number, r: number, dmg: number, dir: number): void {
  for (const p of g.props) {
    if (p.dead) continue;
    if (Math.abs(p.x - x) > r + 20) continue;
    if (Math.abs(p.y - 40 - y) > 80) continue;
    p.hp -= dmg;
    p.t = 8;
    if (p.hp <= 0) breakProp(g, p, dir);
  }
}

function breakProp(g: Game, p: WorldProp, dir: number): void {
  p.dead = true;
  playSfx(g.audio, 'bone');
  if (p.kind === 'barrel') {
    g.fx.dust(p.x, p.y - 20, 10, dir);
    g.areaHit(g.player, p.x, p.y - 30, 70, 50, {
      name: 'barrelBurst', startup: 0, active: 1, recovery: 0,
      box: { x: 0, y: 0, w: 0, h: 0 }, damage: 12, kbX: 6, kbY: -3,
      hitstun: 18, hitstop: 4, shake: 4,
    });
    g.texts.add('木桶爆', p.x, p.y - 80, '#c8a070', 14);
  } else if (p.kind === 'brazier') {
    g.hazards.push({
      x: p.x, y: p.y - 10, r: 56, ttl: 60 * 6, tick: 0,
      color: '#ff6030', label: '火盆', dmg: 3, period: 24,
    });
    g.fx.flare(p.x, p.y - 40, 80, '#ff6030', 20);
    g.texts.add('火盆倾', p.x, p.y - 80, '#ff8060', 14);
    failAnhun(g, 'noBrazier');
  } else if (p.kind === 'bell') {
    g.affixBellWeak = true;
    g.bellStrikeT = 60 * 5;
    g.showBanner('安魂钟鸣', '杂兵气弱', 90);
    g.fx.ring(p.x, p.y - 60, 160, '#d0a0ff', 28);
    g.texts.add('钟鸣', p.x, p.y - 90, '#d0a0ff', 18, true);
    failAnhun(g, 'protectBell');
  }
}

export function tickProps(g: Game): void {
  if (g.bellStrikeT > 0) {
    g.bellStrikeT--;
    if (g.bellStrikeT <= 0 && !getAffix(g.stageAffix ?? '')?.bellCycle) g.affixBellWeak = false;
  }
  for (const p of g.props) {
    if (p.t > 0) p.t--;
  }
}

export function drawProps(ctx: CanvasRenderingContext2D, g: Game): void {
  for (const p of g.props) {
    if (p.dead) continue;
    const shake = p.t > 0 ? (Math.random() - 0.5) * 3 : 0;
    const x = p.x + shake;
    const y = p.y;
    ctx.save();
    if (p.kind === 'barrel') {
      ctx.fillStyle = '#6a4428';
      ctx.strokeStyle = '#c8a070';
      ctx.lineWidth = 1.5;
      ctx.fillRect(x - 14, y - 36, 28, 36);
      ctx.strokeRect(x - 14, y - 36, 28, 36);
      ctx.fillStyle = '#8a6038';
      ctx.fillRect(x - 12, y - 28, 24, 4);
    } else if (p.kind === 'brazier') {
      ctx.fillStyle = '#3a3038';
      ctx.fillRect(x - 16, y - 18, 32, 18);
      ctx.fillStyle = '#ff6030';
      ctx.globalAlpha = 0.7 + Math.sin(g.tick * 0.2) * 0.2;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 18);
      ctx.lineTo(x, y - 38);
      ctx.lineTo(x + 10, y - 18);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // bell
      ctx.fillStyle = '#c9a466';
      ctx.strokeStyle = '#fff0c0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 10);
      ctx.quadraticCurveTo(x, y - 70, x + 18, y - 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#8a7040';
      ctx.fillRect(x - 3, y - 78, 6, 12);
    }
    ctx.restore();
  }
}
