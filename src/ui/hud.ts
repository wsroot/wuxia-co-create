import { VIEW_H, VIEW_W } from '../engine/constants';
import type { Game } from '../game';
import type { Progression } from '../meta/progression';
import { drawGlow } from '../effects/glow';
import { PILL_SHORT, PILL_COLOR, PILL_BY_ID } from '../meta/alchemy';
import { AFFIX_BY_ID } from '../level/affixes';
import { FRAGMENT_BY_ID } from '../meta/runFragments';
import { TALISMAN_BY_ID } from '../meta/talismans';
import { SKILL_BY_ID } from '../meta/skills';
import { getInterludePagoda } from '../render/artAssets';

const FONT = '"Noto Serif SC", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "SimSun", "STSong", serif';

function frame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(6,2,10,0.72)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.strokeStyle = 'rgba(122,90,58,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 2.5, y - 2.5, w + 5, h + 5);
}


/** Screen-space card rect for 幕间三选一 option i (0..2). Shared by draw + hit-test. */
export function betweenCardRect(i: number): { x: number; y: number; w: number; h: number } {
  const cx = VIEW_W / 2 + (i - 1) * 220;
  const cy = 230;
  return { x: cx - 95, y: cy - 40, w: 190, h: 100 };
}

export function drawHUD(ctx: CanvasRenderingContext2D, g: Game, prog?: Progression | null): void {
  const p = g.player;
  ctx.textBaseline = 'middle';
  // portrait sigil
  ctx.save();
  ctx.translate(40, 40);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#1a0812';
  ctx.strokeStyle = '#9a7a4a';
  ctx.lineWidth = 2;
  ctx.fillRect(-17, -17, 34, 34);
  ctx.strokeRect(-17, -17, 34, 34);
  ctx.restore();
  ctx.fillStyle = '#e8dccf';
  ctx.font = `900 20px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('魂', 40, 41);
  if (p.pillAura && p.pillAuraT > 0 && p.pillAura.hudTint) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(g.tick * 0.12);
    drawGlow(ctx, 40, 40, 28, p.pillAura.hudTint, 0.8);
    ctx.restore();
  }

  // HP
  const hx = 72, hy = 24, hw = 250, hh = 14;
  frame(ctx, hx, hy, hw, hh);
  ctx.fillStyle = '#e8e0e8';
  ctx.fillRect(hx, hy, (hw * p.hpLag) / p.maxHp, hh);
  const hg = ctx.createLinearGradient(0, hy, 0, hy + hh);
  hg.addColorStop(0, '#ff4a5a');
  hg.addColorStop(0.5, '#b0102a');
  hg.addColorStop(1, '#5a0010');
  ctx.fillStyle = hg;
  ctx.fillRect(hx, hy, (hw * p.hp) / p.maxHp, hh);
  ctx.font = `700 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f0e0e0';
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, hx + 6, hy + hh / 2 + 1);

  // Rage
  const ry = 46, rw = 190, rh = 7;
  frame(ctx, hx, ry, rw, rh);
  const full = p.rage >= 100;
  const rg = ctx.createLinearGradient(hx, 0, hx + rw, 0);
  rg.addColorStop(0, '#4a1070');
  rg.addColorStop(1, full ? '#ffd27a' : '#c040ff');
  ctx.fillStyle = rg;
  ctx.fillRect(hx, ry, (rw * p.rage) / 100, rh);
  if (full) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, hx + rw + 22, ry + 4, 26 + Math.sin(g.tick * 0.2) * 6, '#ff3050', 0.9);
    ctx.restore();
  }
  ctx.font = `900 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = full ? '#fff0c0' : '#8a70a0';
  ctx.fillText(full ? '气势' : '气', hx + rw + 22, ry + 4);

  // 体力
  const sy = ry + 12, sw = 190, sh = 5;
  frame(ctx, hx, sy, sw, sh);
  const exhausted = p.exhaustT > 0;
  const sg = ctx.createLinearGradient(hx, 0, hx + sw, 0);
  sg.addColorStop(0, exhausted ? '#4a3040' : '#1a5040');
  sg.addColorStop(1, exhausted ? '#806070' : '#50e0a0');
  ctx.fillStyle = sg;
  ctx.fillRect(hx, sy, (sw * p.stamina) / p.maxStamina, sh);
  ctx.font = `700 10px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = exhausted ? '#c0a0b0' : '#90e0c0';
  ctx.fillText(exhausted ? '力竭' : '体', hx + sw + 8, sy + 3);

  // 内力
  const ny = sy + 10, nw = 190, nh = 4;
  frame(ctx, hx, ny, nw, nh);
  const ng = ctx.createLinearGradient(hx, 0, hx + nw, 0);
  ng.addColorStop(0, '#204060');
  ng.addColorStop(1, '#60c0ff');
  ctx.fillStyle = ng;
  ctx.fillRect(hx, ny, (nw * p.neili) / Math.max(1, p.maxNeili), nh);
  ctx.fillStyle = '#90d0ff';
  ctx.fillText('内', hx + nw + 8, ny + 2);

  // 护甲
  const ay = ny + 9, aw = 140, ah = 4;
  frame(ctx, hx, ay, aw, ah);
  const broken = p.armorBreakT > 0;
  ctx.fillStyle = broken ? '#5a3030' : '#6a8098';
  ctx.fillRect(hx, ay, (aw * p.armor) / Math.max(1, p.maxArmor), ah);
  ctx.fillStyle = broken ? '#ff9060' : '#b0c8e0';
  ctx.fillText(broken ? '破甲' : '甲', hx + aw + 8, ay + 2);

  // 锋锐 pips (5)
  const shx = hx + aw + 36;
  const pips = 5;
  const filled = Math.ceil((p.sharpness / 100) * pips);
  for (let i = 0; i < pips; i++) {
    ctx.fillStyle = i < filled ? '#e8d090' : '#3a3040';
    ctx.fillRect(shx + i * 9, ay, 7, ah);
  }
  ctx.fillStyle = '#c8b070';
  ctx.fillText('锋', shx + pips * 9 + 4, ay + 2);

  // Status line
  const statuses: string[] = [];
  if (p.exhaustT > 0) statuses.push('力竭');
  if (p.armorBreakT > 0) statuses.push('破甲');
  if (p.clashStunT > 0) statuses.push('崩刀');
  if (p.hyperArmorT > 0) statuses.push('霸体');
  if (statuses.length) {
    ctx.font = `900 12px ${FONT}`;
    ctx.fillStyle = '#ffd0a0';
    ctx.fillText(statuses.join(' · '), hx, ay + 16);
  }

  // 血晶 (run accumulator + banked total) — shift down
  if (prog) {
    const bank = prog.data.crystals;
    const run = prog.runCrystals;
    ctx.textAlign = 'left';
    ctx.font = `700 13px ${FONT}`;
    ctx.fillStyle = '#ff90b0';
    const metaY = ay + (statuses.length ? 30 : 18);
    ctx.fillText(`血晶 ${bank}` + (run > 0 ? `  (+${run})` : ''), hx, metaY);
    ctx.fillStyle = g.player.weapon.def.blade;
    ctx.fillText(g.player.weapon.def.name, hx + 150, metaY);
    // equipped active command hints
    let cmdX = hx + 280;
    const metaY2 = ay + (statuses.length ? 30 : 18);
    if (g.player.mods.activeSkills.length) {
      const labels: string[] = [];
      const cat = g.player.weapon.def.category;
      for (const id of g.player.mods.activeSkills) {
        const def = SKILL_BY_ID[id];
        if (!def?.hudHint) continue;
        const gate = def.weaponGate;
        if (gate && gate !== 'any' && gate !== cat) continue;
        labels.push(def.hudHint);
      }
      labels.push('抓投→↓J');
      const line = g.player.skillCd > 0 ? `外功冷却` : labels.join(' · ');
      ctx.fillStyle = g.player.skillCd > 0 ? '#6a5870' : '#ffd27a';
      ctx.fillText(line, cmdX, metaY2);
      cmdX += Math.min(240, ctx.measureText(line).width + 12);
    } else {
      ctx.fillStyle = '#8a7a90';
      ctx.fillText('抓投→↓J', cmdX, metaY2);
      cmdX += 70;
    }
  }

  // Always-visible 4 pill slots (keys 1–4) — left column under resource bars
  {
    const slots = g.player.pillSlots;
    const baseX = 72;
    const baseY = 108;
    const slotW = 64;
    const gap = 4;
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) {
      const sx = baseX + i * (slotW + gap);
      const s = slots[i];
      frame(ctx, sx, baseY, slotW, 24);
      // key number
      ctx.font = `900 11px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#9a7a4a';
      ctx.fillText(String(i + 1), sx + 3, baseY + 7);
      if (!s || s.n <= 0) {
        ctx.font = `600 11px ${FONT}`;
        ctx.fillStyle = '#5a4860';
        ctx.textAlign = 'center';
        ctx.fillText('—', sx + slotW / 2 + 3, baseY + 13);
      } else {
        const col = PILL_COLOR[s.id];
        const short = PILL_SHORT[s.id];
        const name = PILL_BY_ID[s.id]?.name ?? short;
        ctx.font = `700 10px ${FONT}`;
        ctx.fillStyle = col;
        ctx.textAlign = 'left';
        ctx.fillText(name.length <= 3 ? name : short, sx + 12, baseY + 13);
        ctx.textAlign = 'right';
        ctx.font = `900 12px ${FONT}`;
        ctx.fillStyle = col;
        ctx.fillText(String(s.n), sx + slotW - 3, baseY + 13);
      }
    }
  }

  // 灵符双槽 (U 释放 / Y 轮换) — left column under pills
  {
    const slots = g.player.talismanSlots;
    const active = g.player.talismanIndex;
    const baseX = 72;
    const baseY = 138;
    const slotW = 110;
    const gap = 5;
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 2; i++) {
      const sx = baseX + i * (slotW + gap);
      const s = slots[i];
      const on = i === active;
      frame(ctx, sx, baseY, slotW, 20);
      if (on) {
        ctx.strokeStyle = '#ffd27a';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(sx - 2.5, baseY - 2.5, slotW + 5, 25);
      }
      ctx.font = `900 9px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#9a7a4a';
      ctx.fillText(i === 0 ? 'U' : 'Y换', sx + 3, baseY + 10);
      if (!s || s.n <= 0) {
        ctx.fillStyle = '#5a4860';
        ctx.font = `600 10px ${FONT}`;
        ctx.fillText('—', sx + 26, baseY + 10);
      } else {
        const td = TALISMAN_BY_ID[s.id];
        ctx.fillStyle = td?.color ?? '#c8a0a8';
        ctx.font = `700 10px ${FONT}`;
        const raw = td?.name ?? '??';
        const nm = raw.length > 3 ? raw.slice(0, 3) : raw;
        ctx.fillText(`${nm}×${s.n}`, sx + 26, baseY + 10);
      }
      if (g.player.talismanCd > 0 && on) {
        ctx.fillStyle = 'rgba(40,20,50,0.45)';
        ctx.fillRect(sx, baseY, slotW * Math.min(1, g.player.talismanCd / 90), 20);
      }
    }
  }

  // 克制 flash
  if (g.player.affinityFlash > 0) {
    const a = Math.min(1, g.player.affinityFlash / 20);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `900 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd27a';
    ctx.strokeStyle = 'rgba(20,0,8,0.85)';
    ctx.lineWidth = 4;
    ctx.strokeText('克制', VIEW_W / 2, 118);
    ctx.fillText('克制', VIEW_W / 2, 118);
    ctx.restore();
  }

  // 场地词缀 chip (top-right; stack above 残页)
  if (g.stageAffix) {
    const known = g.knownAffixes.includes(g.stageAffix);
    const ad = AFFIX_BY_ID[g.stageAffix];
    const label = known ? `场地·${ad.name}` : `场地·${ad.fogName}`;
    const ax = VIEW_W - 18;
    const ay = 22;
    ctx.textAlign = 'right';
    ctx.font = `900 13px ${FONT}`;
    ctx.fillStyle = 'rgba(8,2,10,0.72)';
    const tw = ctx.measureText(label).width + 16;
    ctx.fillRect(ax - tw, ay - 10, tw, 20);
    ctx.strokeStyle = ad.color;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(ax - tw, ay - 10, tw, 20);
    ctx.fillStyle = known ? ad.color : '#8a7a90';
    ctx.fillText(label, ax - 8, ay);
    if (g.affixToastT > 0 && known) {
      const a = Math.min(1, g.affixToastT / 20, (120 - g.affixToastT) / 20);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = `700 14px ${FONT}`;
      ctx.fillStyle = ad.color;
      ctx.fillText(ad.desc, VIEW_W / 2, 102);
      ctx.restore();
    }
    if (g.affixBellWeak) {
      ctx.font = `900 11px ${FONT}`;
      ctx.fillStyle = '#d0a0ff';
      ctx.fillText('钟鸣', ax - 8, ay + 16);
    }
  }

  // 心法残页 chips (below 场地)
  if (g.fragments.active.length) {
    let fx = VIEW_W - 18;
    const fy = g.stageAffix ? 48 : 28;
    ctx.textAlign = 'right';
    ctx.font = `700 11px ${FONT}`;
    for (let i = g.fragments.active.length - 1; i >= 0; i--) {
      const id = g.fragments.active[i]!;
      const fd = FRAGMENT_BY_ID[id];
      if (!fd) continue;
      const known = g.fragments.known.includes(id);
      const label = known ? fd.name : fd.fogName;
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = 'rgba(8,2,10,0.7)';
      ctx.fillRect(fx - tw, fy - 8, tw, 16);
      ctx.strokeStyle = fd.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(fx - tw, fy - 8, tw, 16);
      ctx.fillStyle = fd.color;
      ctx.fillText(label, fx - 6, fy);
      fx -= tw + 6;
    }
  }

  // Combo
  const c = g.combo;
  if (c.fade > 0 && c.shown >= 2) {
    const r = c.rating(c.shown);
    const alpha = c.count > 0 ? 1 : c.fade;
    ctx.save();
    ctx.globalAlpha = alpha;
    const cx = VIEW_W - 90, cy = 168;
    const s = 1 + c.pop * 0.4;
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.textAlign = 'right';
    ctx.font = `italic 900 54px ${FONT}`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(30,0,10,0.9)';
    ctx.strokeText(String(c.shown), 0, 0);
    const cg = ctx.createLinearGradient(0, -26, 0, 26);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(1, r ? r.color : '#ff4060');
    ctx.fillStyle = cg;
    ctx.fillText(String(c.shown), 0, 0);
    ctx.font = `900 18px ${FONT}`;
    ctx.fillStyle = '#e8d0d8';
    ctx.fillText('连击', 44, 6);
    if (r) {
      ctx.font = `italic 900 36px ${FONT}`;
      ctx.strokeText(r.letter, 44, 44);
      ctx.fillStyle = r.color;
      ctx.fillText(r.letter, 44, 44);
      ctx.font = `900 15px ${FONT}`;
      ctx.fillStyle = '#e8d8e0';
      ctx.fillText(r.name, -6, 44);
    }
    // timer bar
    ctx.fillStyle = 'rgba(255,60,90,0.8)';
    ctx.fillRect(-110, 64, 150 * (c.timer / 110), 3);
    ctx.restore();
  }

  // Boss bar
  const boss = g.boss;
  if (boss && boss.state !== 'intro') {
    const bw = 560, bx = (VIEW_W - bw) / 2, by = VIEW_H - 44;
    ctx.font = `900 18px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f0d8c8';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText('镇山石兽', bx, by - 16);
    ctx.fillText('镇山石兽', bx, by - 16);
    if (boss.superArmor && !boss.dead) {
      ctx.fillStyle = '#ff3050';
      ctx.font = `900 14px ${FONT}`;
      ctx.fillText('【霸体】', bx + 150, by - 15);
    }
    frame(ctx, bx, by, bw, 12);
    const bg = ctx.createLinearGradient(0, by, 0, by + 12);
    bg.addColorStop(0, '#ff5a3a');
    bg.addColorStop(1, '#6a0010');
    ctx.fillStyle = bg;
    ctx.fillRect(bx, by, (bw * Math.max(0, boss.hp)) / boss.maxHp, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(bx + bw * 0.5 - 1, by, 2, 12);
    // poise
    const pw = bw * 0.55;
    ctx.fillStyle = 'rgba(10,0,10,0.75)';
    ctx.fillRect(bx, by + 16, pw, 5);
    const pg = ctx.createLinearGradient(bx, 0, bx + pw, 0);
    pg.addColorStop(0, '#a07020');
    pg.addColorStop(1, '#ffd27a');
    ctx.fillStyle = pg;
    ctx.fillRect(bx, by + 16, (pw * Math.max(0, boss.poise)) / boss.poiseMax, 5);
    if (boss.state === 'stagger') {
      ctx.fillStyle = '#ffd27a';
      ctx.font = `900 12px ${FONT}`;
      ctx.fillText('破绽中', bx + pw + 8, by + 18);
    }
    ctx.font = `700 10px ${FONT}`;
    ctx.fillStyle = '#b8a890';
    ctx.fillText('架势', bx + bw * 0.4 + 6, by + 18);
  }

  // Banner (+ B-03 mood plate for between-act narrative beats)
  const bn = g.banner;
  if (bn && bn.t > 0) {
    const k = Math.min(1, bn.t / 20, (bn.max - bn.t) / 15);
    ctx.save();
    ctx.globalAlpha = Math.max(0, k);
    ctx.textAlign = 'center';
    const y = 140;
    const isInterlude = /夜色更深|幕间|长夜将尽/.test(bn.text + bn.sub);
    if (isInterlude) {
      const mood = getInterludePagoda();
      if (mood) {
        const plateW = 560, plateH = 120;
        const px = VIEW_W / 2 - plateW / 2, py = y - 48;
        ctx.save();
        ctx.beginPath();
        ctx.rect(px, py, plateW, plateH);
        ctx.clip();
        const iw = mood.naturalWidth || 1920, ih = mood.naturalHeight || 1080;
        const s = Math.max(plateW / iw, plateH / ih);
        ctx.globalAlpha = Math.max(0, k) * 0.7;
        ctx.drawImage(mood, px + (plateW - iw * s) / 2, py + (plateH - ih * s) / 2, iw * s, ih * s);
        ctx.restore();
        ctx.globalAlpha = Math.max(0, k);
        ctx.fillStyle = 'rgba(6,11,23,0.45)';
        ctx.fillRect(px, py, plateW, plateH);
      }
    }
    const lg = ctx.createLinearGradient(VIEW_W / 2 - 260, 0, VIEW_W / 2 + 260, 0);
    lg.addColorStop(0, 'rgba(120,10,30,0)');
    lg.addColorStop(0.5, 'rgba(120,10,30,0.55)');
    lg.addColorStop(1, 'rgba(120,10,30,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(VIEW_W / 2 - 260, y - 34, 520, 72);
    ctx.font = `900 36px ${FONT}`;
    ctx.fillStyle = '#f4e6d8';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(20,0,8,0.85)';
    ctx.strokeText(bn.text, VIEW_W / 2, y - 6);
    ctx.fillText(bn.text, VIEW_W / 2, y - 6);
    ctx.font = `700 16px ${FONT}`;
    ctx.fillStyle = '#d8a0a8';
    ctx.fillText(bn.sub, VIEW_W / 2, y + 24);
    ctx.restore();
  }

  // Go arrow
  if (g.director.goArrow > 0 && (g.tick >> 4) % 2 === 0) {
    ctx.font = `900 26px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd0d8';
    ctx.fillText('前进 ➜', VIEW_W - 30, VIEW_H / 2 - 40);
  }


  // 幕间剧情卡（不挡操作）
  if (g.storyCard && g.storyCard.t > 0) {
    const a = Math.min(1, g.storyCard.t / 20, (160 - (160 - g.storyCard.t)) / 20);
    ctx.save();
    ctx.globalAlpha = Math.max(0.35, Math.min(0.9, g.storyCard.t / 40));
    ctx.fillStyle = 'rgba(12,4,16,0.75)';
    ctx.fillRect(VIEW_W - 280, 70, 250, 64);
    ctx.strokeStyle = '#7a5a3a';
    ctx.strokeRect(VIEW_W - 280, 70, 250, 64);
    ctx.textAlign = 'left';
    ctx.font = `900 14px ${FONT}`;
    ctx.fillStyle = '#ffd27a';
    ctx.fillText(g.storyCard.title, VIEW_W - 268, 92);
    ctx.font = `600 12px ${FONT}`;
    ctx.fillStyle = '#d8c8d0';
    ctx.fillText(g.storyCard.body, VIEW_W - 268, 114);
    ctx.restore();
  }
  // 安魂目标（fog）
  if (g.anhun && !g.anhun.failed && !g.anhun.done) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = `700 11px ${FONT}`;
    ctx.fillStyle = '#a090b0';
    const label = g.anhun.known ? `安魂·${g.anhun.goal.name}` : g.anhun.goal.fogName;
    ctx.fillText(label, 72, 110);
    ctx.restore();
  }
  // 套装残响
  if (g.player.mods.setEchoLabel) {
    ctx.save();
    ctx.font = `700 11px ${FONT}`;
    ctx.fillStyle = '#c0a0ff';
    ctx.textAlign = 'left';
    ctx.fillText(g.player.mods.setEchoLabel, 72, 124);
    ctx.restore();
  }

  // 幕间三选一 — B-03 pagoda mood behind cards
  const bet = g.runEvents?.between;
  if (bet && g.pausedForEvent) {
    ctx.save();
    const mood = getInterludePagoda();
    if (mood) {
      // cover, centered; dim for readability
      const iw = mood.naturalWidth || 1920;
      const ih = mood.naturalHeight || 1080;
      const s = Math.max(VIEW_W / iw, VIEW_H / ih);
      const dw = iw * s, dh = ih * s;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(mood, (VIEW_W - dw) / 2, (VIEW_H - dh) / 2, dw, dh);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(6,2,10,0.62)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.font = `900 28px ${FONT}`;
    ctx.fillStyle = '#f0e0d0';
    ctx.fillText('幕间机缘', VIEW_W / 2, 120);
    ctx.font = `600 14px ${FONT}`;
    ctx.fillStyle = '#b8a0a8';
    ctx.fillText(g.touchMode ? '点选卡牌，或按右侧 1 / 2 / 3' : '按 1 / 2 / 3 选择一项', VIEW_W / 2, 150);
    bet.forEach((c, i) => {
      const r = betweenCardRect(i);
      const x = r.x + r.w / 2;
      const y = r.y + 40;
      ctx.fillStyle = 'rgba(20,8,16,0.9)';
      ctx.strokeStyle = '#9a7a4a';
      ctx.lineWidth = 2;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.font = `900 18px ${FONT}`;
      ctx.fillStyle = '#ffd27a';
      ctx.fillText(`${i + 1}. ${c.label}`, x, y);
      ctx.font = `600 13px ${FONT}`;
      ctx.fillStyle = '#d0c0c8';
      ctx.fillText(c.sub, x, y + 28);
    });
    ctx.restore();
  }

  // 据点
  if (g.runEvents?.outpostOpen && !g.runEvents.outpostUsed) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `900 16px ${FONT}`;
    ctx.fillStyle = '#c8e0ff';
    ctx.fillText('据点残片 · 1休整 2辨物 3残简', VIEW_W / 2, VIEW_H - 48);
    ctx.restore();
  }

  // 邪气潮
  if (g.runEvents?.tideActive) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `900 14px ${FONT}`;
    ctx.fillStyle = '#c090ff';
    ctx.fillText('邪气潮 · 肃清亡潮', VIEW_W / 2, 86);
    ctx.restore();
  }

  // 处决提示
  if (g.executePromptT > 0) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `900 18px ${FONT}`;
    ctx.fillStyle = '#ffd27a';
    ctx.fillText(g.touchMode ? '处决 · 点「技」' : '处决 · 按 I', VIEW_W / 2, VIEW_H - 70);
    ctx.restore();
  }

  // control hint at start
  if (g.playTime < 60 * 9 && !g.touchMode && !g.boss) {
    ctx.globalAlpha = Math.min(1, (60 * 9 - g.playTime) / 60) * 0.8;
    ctx.font = `600 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d8c8e0';
    ctx.fillText('A/D 移动 · J 攻 · K 防 · L 闪 · I 技/处决 · U 灵符 · ↓+I 临时符 · 1–4 丹/选项 · Esc 暂停', VIEW_W / 2, VIEW_H - 18);
    ctx.globalAlpha = 1;
  }
}
