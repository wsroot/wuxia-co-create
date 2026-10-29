import { POSE_GALLERY, SP, GP, SKEL_ATTACKS, GARG_ATTACKS } from './poses';
import { drawHunter } from './drawHunter';
import { drawSkeleton } from './drawSkeleton';
import { drawGargoyle } from './drawGargoyle';
import type { Pose } from './rig';

/** Dev-only pose sheet (?gallery=1) used to tune procedural animation poses. */
export function renderGallery(ctx: CanvasRenderingContext2D, page = 1): void {
  ctx.fillStyle = '#2a2234';
  ctx.fillRect(0, 0, 960, 540);
  if (page === 2) { gargPage(ctx); return; }
  if (page === 3) {
    ctx.fillStyle = '#1a2030';
    ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = '#c9a466';
    ctx.font = '16px Songti SC, serif';
    ctx.textAlign = 'center';
    const rows: Array<[string, 'axe' | 'shield' | 'archer' | 'spear', number]> = [
      ['山贼亡魂', 'axe', 120],
      ['官差尸兵', 'shield', 360],
      ['蒙面刺客', 'archer', 600],
      ['枪影亡魂', 'spear', 840],
    ];
    for (const [label, kind, x] of rows) {
      ctx.save();
      ctx.translate(x, 420);
      ctx.scale(3.2, 3.2);
      drawSkeleton(ctx, SP.idle, { kind, time: 90, draw: kind === 'archer' ? 0.6 : 0 });
      ctx.restore();
      ctx.fillText(label, x, 500);
    }
    return;
  }
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  let i = 0;
  const cell = (label: string, fn: () => void, w = 64, h = 130) => {
    const cols = Math.floor(960 / w);
    const x = (i % cols) * w + w / 2, y = Math.floor(i / cols) * h + h - 14;
    ctx.save();
    ctx.translate(x, y);
    fn();
    ctx.restore();
    ctx.fillStyle = '#ddd';
    ctx.fillText(label, x, y + 10);
    i++;
  };
  for (const [k, p] of POSE_GALLERY) cell(k, () => drawHunter(ctx, p, { time: 0, speed: 0 }), 64, 120);
  const sk: Array<[string, Pose, 'axe' | 'shield' | 'archer' | 'spear']> = [
    ['axe', SP.idle, 'axe'], ['axe.w', SKEL_ATTACKS.axe.wind, 'axe'], ['axe.s', SKEL_ATTACKS.axe.strike, 'axe'],
    ['sh', SP.shIdle, 'shield'], ['bang', SP.shBang, 'shield'], ['chg', SP.shCharge, 'shield'], ['bash', SKEL_ATTACKS.bash.strike, 'shield'],
    ['ar', SP.arIdle, 'archer'], ['aim', SP.arAim, 'archer'], ['whip', SKEL_ATTACKS.whip.strike, 'archer'],
    ['sp', SP.spIdle, 'spear'], ['thrust', SKEL_ATTACKS.thrust.strike, 'spear'], ['lunge', SKEL_ATTACKS.lunge.strike, 'spear'],
    ['down', SP.down, 'axe'],
  ];
  i = Math.ceil(i / 15) * 15;
  for (const [k, p, kind] of sk) cell(k, () => drawSkeleton(ctx, p, { kind, time: 0, draw: k === 'aim' ? 1 : 0 }), 64, 120);
}

function gargPage(ctx: CanvasRenderingContext2D): void {
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  const gp: Array<[string, Pose]> = [['idle', GP.idle], ['c1w', GARG_ATTACKS.claw1.wind], ['c1s', GARG_ATTACKS.claw1.strike], ['c3s', GARG_ATTACKS.claw3.strike], ['roar', GP.roar], ['fly', GP.fly], ['charge', GP.charge]];
  ctx.save();
  ctx.translate(0, 0);
  for (let j = 0; j < gp.length; j++) {
    ctx.save();
    ctx.translate(120 + (j % 4) * 230, 230 + Math.floor(j / 4) * 260);
    drawGargoyle(ctx, gp[j][1], { time: 0, wing: j === 5 ? 0.8 : 0.1, jaw: j === 4 ? 1 : 0.1, rage: false });
    ctx.restore();
    ctx.fillStyle = '#ddd';
    ctx.fillText(gp[j][0], 120 + (j % 4) * 230, 248 + Math.floor(j / 4) * 260);
  }
  ctx.restore();
}
