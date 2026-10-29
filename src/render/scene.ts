import { GROUND_SCREEN_Y, GROUND_Y, VIEW_H, VIEW_W, VIEW_WW, WORLD_ZOOM } from '../engine/constants';
import type { Game } from '../game';
import { drawLayer, type Backdrop } from './backgrounds';
import { drawGlow } from '../effects/glow';
import { drawHazards } from '../level/eliteMods';
import { drawProps } from '../level/props';
import { getBackdrop } from '../meta/contentRegistry';

/** Drifting plum blossoms / bamboo leaves. */
interface Petal { x: number; y: number; vx: number; vy: number; ph: number; s: number; kind: 0 | 1 }
const petals: Petal[] = [];

function updatePetals(t: number): void {
  if (petals.length < 28 && Math.random() < 0.055) {
    petals.push({
      x: Math.random() * VIEW_W,
      y: -10,
      vx: -0.4 + Math.random() * 0.8,
      vy: 0.35 + Math.random() * 0.55,
      ph: Math.random() * 6,
      s: 0.6 + Math.random() * 0.9,
      kind: Math.random() < 0.55 ? 0 : 1,
    });
  }
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];
    p.x += p.vx + Math.sin(t * 0.04 + p.ph) * 0.35;
    p.y += p.vy;
    if (p.y > VIEW_H + 20) petals.splice(i, 1);
  }
}

function drawPetals(ctx: CanvasRenderingContext2D, t: number): void {
  for (const p of petals) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(t * 0.02 + p.ph);
    ctx.scale(p.s, p.s);
    if (p.kind === 0) {
      // plum blossom
      ctx.fillStyle = 'rgba(240,190,200,0.7)';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 3.5, Math.sin(a) * 3.5, 2.2, 1.4, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(200,60,80,0.8)';
      ctx.beginPath();
      ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // bamboo leaf
      ctx.fillStyle = 'rgba(40,80,50,0.55)';
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(0, -3, 7, 0);
      ctx.quadraticCurveTo(0, 2.5, -6, 0);
      ctx.fill();
    }
    ctx.restore();
  }
}

function haze(ctx: CanvasRenderingContext2D, y: number, h: number, color: string): void {
  ctx.globalAlpha = 0.65;
  const g = ctx.createLinearGradient(0, y - h, 0, y + h * 0.3);
  g.addColorStop(0, color + '00');
  g.addColorStop(0.7, color);
  g.addColorStop(1, color + '00');
  ctx.fillStyle = g;
  ctx.fillRect(-40, y - h, VIEW_W + 80, h * 1.3);
  ctx.globalAlpha = 1;
}

export function renderScene(ctx: CanvasRenderingContext2D, g: Game, bd: Backdrop): void {
  const cam = g.cam;
  const camX = cam.x;
  const camY = cam.y;
  updatePetals(g.tick);
  ctx.save();
  const z = cam.zoom * WORLD_ZOOM;
  ctx.translate(VIEW_W / 2, GROUND_SCREEN_Y);
  ctx.scale(z, z);
  // cam.y lifts the view for rooftops (negative = look up)
  ctx.translate(-VIEW_WW / 2 + cam.ox, -GROUND_Y - camY + cam.oy);
  const top = GROUND_Y - GROUND_SCREEN_Y / WORLD_ZOOM;

  ctx.drawImage(bd.sky, -40, top - 40, VIEW_WW + 80, VIEW_H / WORLD_ZOOM + 80);
  // Per-act backdrop tint — catalog BackdropDef.theme selects generator key
  {
    const bdDef = getBackdrop(g.backdropTheme);
    const theme = bdDef?.theme ?? g.backdropTheme;
    const blend = g.themeBlend;
    if (theme !== 'night' && blend > 0.01) {
      const tint =
        theme === 'dock' ? 'rgba(20,60,90,' :
        theme === 'ash' ? 'rgba(50,42,36,' :
        theme === 'eclipse' ? 'rgba(90,12,28,' :
        'rgba(0,0,0,';
      const a = (theme === 'eclipse' ? 0.28 : theme === 'ash' ? 0.22 : 0.18) * blend;
      ctx.fillStyle = (bdDef?.skyTint && bdDef.skyTint.startsWith('rgba'))
        ? bdDef.skyTint
        : tint + a + ')';
      ctx.fillRect(-40, top - 40, VIEW_WW + 80, VIEW_H / WORLD_ZOOM + 80);
    }
  }
  const blood = g.bloodMoon;
  const mx = 560 - camX * 0.02, my = top + 92;
  ctx.drawImage(bd.moon, mx - 130, my - 130, 260, 260);
  if (blood > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = blood * 0.85;
    ctx.fillStyle = '#c01828';
    ctx.beginPath();
    ctx.arc(mx, my, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, mx, my, 160, '#a01020', blood * 0.4);
    ctx.restore();
  }
  drawPetals(ctx, g.tick);

  drawLayer(ctx, bd.layers[0], camX);
  haze(ctx, 420, 90, '#142030');
  drawLayer(ctx, bd.layers[1], camX);
  haze(ctx, 456, 70, '#101828');
  drawLayer(ctx, bd.layers[2], camX);
  {
    const gx = 520 - camX * 0.15;
    const grd = ctx.createRadialGradient(gx, GROUND_Y - 40, 20, gx, GROUND_Y - 20, 380);
    grd.addColorStop(0, 'rgba(160,190,220,0.08)');
    grd.addColorStop(0.5, 'rgba(80,100,140,0.03)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(-40, GROUND_Y - 220, VIEW_W + 80, 260);
  }
  drawLayer(ctx, bd.ground, camX);
  ctx.fillStyle = '#06080c';
  ctx.fillRect(-40, VIEW_H, VIEW_W + 80, 40);

  if (g.superDark > 0) {
    ctx.fillStyle = `rgba(10,0,8,${g.superDark * 0.7})`;
    ctx.fillRect(-200, -200, VIEW_W + 400, VIEW_H + 400);
  }

  ctx.save();
  ctx.translate(-camX, 0);
  drawPlatforms(ctx, g.platforms);
  if (g.locked) drawGates(ctx, g);
  drawHazards(ctx, g);
  drawProps(ctx, g);
  for (const c of g.chests) c.draw(ctx, g.tick);
  for (const p of g.pickups) p.draw(ctx, g.tick);
  if (g.boss) g.boss.draw(ctx, g);
  for (const e of g.enemies) e.draw(ctx, g);
  g.player.draw(ctx, g);
  for (const pr of g.projectiles) pr.draw(ctx);
  g.animScripts.draw(ctx);
  g.fx.draw(ctx);
  if (g.debug) drawDebug(ctx, g);
  g.texts.draw(ctx);
  ctx.restore();

  const fogY = GROUND_Y - 130;
  ctx.globalAlpha = 0.55;
  const o1 = ((camX * 1.1 + g.tick * 0.3) % 1024 + 1024) % 1024;
  for (let x = -o1; x < VIEW_W; x += 1024) ctx.drawImage(bd.fog, x, fogY, 1024, 180);
  ctx.globalAlpha = 0.28;
  const o2 = ((camX * 0.6 - g.tick * 0.2) % 1024 + 1024) % 1024;
  for (let x = -o2; x < VIEW_W; x += 1024) ctx.drawImage(bd.fog, x, fogY - 60, 1024, 180);
  ctx.globalAlpha = 0.92;
  drawLayer(ctx, bd.fore, camX);
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.drawImage(bd.vignette, 0, 0, VIEW_W, VIEW_H);
  if (g.flashA > 0.01) {
    ctx.globalAlpha = g.flashA;
    ctx.fillStyle = g.flashColor;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1;
  }
}

function drawPlatforms(ctx: CanvasRenderingContext2D, plats: import('../physics/body').Platform[]): void {
  for (const pl of plats) {
    const top = pl.y;
    const base = top + pl.h;
    // wall
    ctx.fillStyle = pl.kind === 'pavilion' ? '#2a2030' : pl.kind === 'bridge' ? '#3a3428' : '#241c28';
    ctx.fillRect(pl.x + 6, top, pl.w - 12, pl.h);
    // door / window glow
    if (pl.kind !== 'bridge') {
      ctx.fillStyle = 'rgba(255,150,50,0.35)';
      ctx.fillRect(pl.x + pl.w * 0.42, top + pl.h * 0.35, pl.w * 0.16, pl.h * 0.4);
    }
    // flying-eave roof
    ctx.fillStyle = pl.kind === 'bridge' ? '#4a4030' : '#3a2010';
    ctx.beginPath();
    ctx.moveTo(pl.x - 10, top + 8);
    ctx.quadraticCurveTo(pl.x + pl.w / 2, top - 22, pl.x + pl.w + 10, top + 8);
    ctx.lineTo(pl.x + pl.w, top + 16);
    ctx.lineTo(pl.x, top + 16);
    ctx.closePath();
    ctx.fill();
    // walkable top highlight
    ctx.fillStyle = 'rgba(200,180,140,0.35)';
    ctx.fillRect(pl.x, top - 2, pl.w, 3);
    // stone posts for bridge
    if (pl.kind === 'bridge') {
      ctx.fillStyle = '#2a2820';
      ctx.fillRect(pl.x + 4, top, 6, pl.h);
      ctx.fillRect(pl.x + pl.w - 10, top, 6, pl.h);
    }
  }
}

function drawGates(ctx: CanvasRenderingContext2D, g: Game): void {
  const t = g.tick;
  for (const [x, dir] of [[g.bounds.min, 1], [g.bounds.max, -1]] as const) {
    const grd = ctx.createLinearGradient(x, 0, x + dir * 50, 0);
    const a = 0.35 + Math.sin(t * 0.1) * 0.1;
    grd.addColorStop(0, `rgba(180,40,50,${a})`);
    grd.addColorStop(1, 'rgba(180,40,50,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(dir > 0 ? x : x - 50, GROUND_Y - 260, 50, 262);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const y = GROUND_Y - 30 - ((t * 1.5 + i * 52) % 240);
      drawGlow(ctx, x + dir * 8, y, 10, '#e04050', 0.75);
    }
    ctx.restore();
  }
}

function drawDebug(ctx: CanvasRenderingContext2D, g: Game): void {
  ctx.lineWidth = 1;
  const all = [g.player, ...g.targets()];
  for (const f of all) {
    const hu = f.hurtbox();
    if (hu) { ctx.strokeStyle = '#30ff60'; ctx.strokeRect(hu.x, hu.y, hu.w, hu.h); }
    const hb = f.hitbox();
    if (hb) { ctx.strokeStyle = '#ff3030'; ctx.strokeRect(hb.x, hb.y, hb.w, hb.h); }
  }
}
