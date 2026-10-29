/**
 * 藏经阁设计台 · 纸墨即时预览（Canvas 2D）
 * 只消费白名单积木配方；无 eval / 外链图 / 任意 URL。
 * 示意级绘制，不必像素级复刻游戏，但须看得出形制与节奏。
 */
(() => {
  const BG = '#0c0a12';
  const GROUND = '#1e1824';
  const GOLD = '#c9a466';
  const PAPER = '#d8ccb8';
  const MUTED = '#7a6e60';
  const INK = '#2a2218';

  const DEFAULT_LEN = {
    dagger: 28, sword: 44, axe: 48, spear: 58, twin: 36, greatsword: 56,
  };

  /** @type {WeakMap<Element, { stop: () => void }>} */
  const ctrls = new WeakMap();

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function hexAlpha(hex, a) {
    const h = String(hex || '#fff').replace('#', '');
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return `rgba(${r},${g},${b},${a})`;
    }
    if (h.length >= 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    }
    return hex;
  }

  function clearCanvas(ctx, w, h) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    // faint paper grain / moon wash
    const g = ctx.createRadialGradient(w * 0.75, h * 0.2, 4, w * 0.75, h * 0.2, w * 0.55);
    g.addColorStop(0, 'rgba(200,176,120,0.07)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // ground line
    ctx.strokeStyle = 'rgba(201,164,102,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, h - 28);
    ctx.lineTo(w - 12, h - 28);
    ctx.stroke();
  }

  function label(ctx, text, x, y) {
    ctx.fillStyle = MUTED;
    ctx.font = '11px "Noto Serif SC", "Songti SC", serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
  }

  /* ── Weapon appearance (simplified interpreter) ─────────── */

  function collectWeaponState(parts, base) {
    const st = {
      blade: base.blade || '#9aa0a8',
      trail: base.trail || '#ff2040',
      edge: base.edge || '#c8d0d8',
      grip: '#3a2a18',
      metal: '#c9a050',
      inkEdge: null,
      glow: null,
      idleTrail: null,
      twin: null,
      hasStructural: false,
    };
    for (const p of parts || []) {
      if (!p || !p.kind) continue;
      switch (p.kind) {
        case 'palette':
          if (p.blade) st.blade = p.blade;
          if (p.trail) st.trail = p.trail;
          if (p.edge) st.edge = p.edge;
          if (p.grip) st.grip = p.grip;
          if (p.metal) st.metal = p.metal;
          break;
        case 'inkEdge':
          st.inkEdge = { color: p.color || st.edge, width: clamp(p.width ?? 0.8, 0.3, 3) };
          break;
        case 'glow':
          st.glow = {
            color: p.color || st.trail,
            radius: clamp(p.radius ?? 10, 2, 40),
            alpha: clamp(p.alpha ?? 0.3, 0.05, 0.8),
          };
          break;
        case 'idleTrail':
          st.idleTrail = {
            color: p.color || st.trail,
            width: clamp(p.width ?? 2, 0.5, 8),
            alpha: clamp(p.alpha ?? 0.2, 0.05, 0.6),
          };
          break;
        case 'twinOffset':
          st.twin = {
            dx: clamp(p.dx ?? -8, -40, 40),
            dy: clamp(p.dy ?? -10, -40, 40),
            scale: clamp(p.scale ?? 0.75, 0.3, 1.2),
            mirror: !!p.mirror,
          };
          break;
        case 'grip': case 'guard': case 'tsuba': case 'pommel':
        case 'blade': case 'tip': case 'haft': case 'head':
        case 'chain': case 'tassel': case 'ring':
          st.hasStructural = true;
          break;
        default:
          break;
      }
    }
    return st;
  }

  function drawBladeProfile(ctx, h, tip, dx, dy, px, py, profile, color, width, curveAmount, fuller) {
    ctx.fillStyle = color;
    const w = width;
    const curve = curveAmount == null ? 1 : clamp(curveAmount, 0, 2);
    if (profile === 'curved' || profile === 'leaf') {
      const mid = { x: (h.x + tip.x) / 2, y: (h.y + tip.y) / 2 };
      const bulge = (profile === 'leaf' ? w * 2.2 : w * 1.6) * curve;
      ctx.beginPath();
      ctx.moveTo(h.x + px * w * 0.6, h.y + py * w * 0.6);
      ctx.quadraticCurveTo(mid.x + px * bulge, mid.y + py * bulge, tip.x, tip.y);
      ctx.quadraticCurveTo(mid.x - px * bulge * 0.55, mid.y - py * bulge * 0.55,
        h.x - px * w * 0.6, h.y - py * w * 0.6);
      ctx.closePath();
      ctx.fill();
    } else if (profile === 'needle' || profile === 'dagger') {
      ctx.beginPath();
      ctx.moveTo(h.x + px * w * 0.7, h.y + py * w * 0.7);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(h.x - px * w * 0.7, h.y - py * w * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (profile === 'broad' || profile === 'greatsword') {
      ctx.beginPath();
      ctx.moveTo(h.x + px * w * 1.4, h.y + py * w * 1.4);
      ctx.lineTo(tip.x + px * 0.4, tip.y + py * 0.4);
      ctx.lineTo(tip.x - px * 0.4, tip.y - py * 0.4);
      ctx.lineTo(h.x - px * w * 1.4, h.y - py * w * 1.4);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(h.x + px * w, h.y + py * w);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(h.x - px * w, h.y - py * w);
      ctx.closePath();
      ctx.fill();
    }
    if (fuller && fuller > 0.05) {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = Math.max(0.6, w * 0.35 * fuller);
      ctx.beginPath();
      ctx.moveTo(h.x + dx * 4, h.y + dy * 4);
      ctx.lineTo(tip.x - dx * 8, tip.y - dy * 8);
      ctx.stroke();
    }
  }

  function drawGuard(ctx, h, dx, dy, px, py, style, width, color, diskR) {
    if (style === 'none') return;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    if (style === 'disk') {
      const r = diskR ?? width * 0.45;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(h.x + dx, h.y + dy, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (style === 'wing') {
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(h.x + px * width * 0.55, h.y + py * width * 0.55);
      ctx.quadraticCurveTo(h.x + px * width + dx * 4, h.y + py * width + dy * 4,
        h.x + px * width * 0.3 + dx * 6, h.y + py * width * 0.3 + dy * 6);
      ctx.moveTo(h.x - px * width * 0.55, h.y - py * width * 0.55);
      ctx.quadraticCurveTo(h.x - px * width + dx * 4, h.y - py * width + dy * 4,
        h.x - px * width * 0.3 + dx * 6, h.y - py * width * 0.3 + dy * 6);
      ctx.stroke();
    } else {
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(h.x + px * width * 0.5, h.y + py * width * 0.5);
      ctx.lineTo(h.x - px * width * 0.5, h.y - py * width * 0.5);
      ctx.stroke();
    }
  }

  function drawTip(ctx, tip, dx, dy, px, py, style, size, color) {
    ctx.fillStyle = color;
    if (style === 'blunt') {
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'hook' || style === 'crescent') {
      ctx.beginPath();
      ctx.moveTo(tip.x - dx * size * 0.2, tip.y - dy * size * 0.2);
      ctx.quadraticCurveTo(tip.x + px * size * 0.9, tip.y + py * size * 0.9,
        tip.x + dx * size * 0.35, tip.y + dy * size * 0.35);
      ctx.quadraticCurveTo(tip.x + px * size * 0.25, tip.y + py * size * 0.25,
        tip.x - dx * size * 0.15, tip.y - dy * size * 0.15);
      ctx.closePath();
      ctx.fill();
    } else if (style === 'fork') {
      ctx.beginPath();
      ctx.moveTo(tip.x + px * size * 0.35, tip.y + py * size * 0.35);
      ctx.lineTo(tip.x + dx * size * 0.5 + px * size * 0.2, tip.y + dy * size * 0.5 + py * size * 0.2);
      ctx.lineTo(tip.x - dx * size * 0.1, tip.y - dy * size * 0.1);
      ctx.lineTo(tip.x + dx * size * 0.5 - px * size * 0.2, tip.y + dy * size * 0.5 - py * size * 0.2);
      ctx.lineTo(tip.x - px * size * 0.35, tip.y - py * size * 0.35);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(tip.x + dx * size * 0.15, tip.y + dy * size * 0.15);
      ctx.lineTo(tip.x - dx * size * 0.55 + px * size * 0.35, tip.y - dy * size * 0.55 + py * size * 0.35);
      ctx.lineTo(tip.x - dx * size * 0.55 - px * size * 0.35, tip.y - dy * size * 0.55 - py * size * 0.35);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawHead(ctx, tip, mid, dx, dy, px, py, style, size, color) {
    ctx.fillStyle = color;
    if (style === 'hammer') {
      const hw = size * 0.55, hh = size * 0.4;
      ctx.beginPath();
      ctx.moveTo(mid.x + px * hw - dx * hh, mid.y + py * hw - dy * hh);
      ctx.lineTo(mid.x + px * hw + dx * hh, mid.y + py * hw + dy * hh);
      ctx.lineTo(mid.x - px * hw + dx * hh, mid.y - py * hw + dy * hh);
      ctx.lineTo(mid.x - px * hw - dx * hh, mid.y - py * hw - dy * hh);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (style === 'spear') {
      const base = { x: tip.x - dx * size, y: tip.y - dy * size };
      ctx.beginPath();
      ctx.moveTo(tip.x + dx * 2, tip.y + dy * 2);
      ctx.lineTo(base.x + px * size * 0.4, base.y + py * size * 0.4);
      ctx.lineTo(base.x - dx * 2, base.y - dy * 2);
      ctx.lineTo(base.x - px * size * 0.4, base.y - py * size * 0.4);
      ctx.closePath();
      ctx.fill();
      return;
    }
    // axe / halberd / crescent
    ctx.beginPath();
    ctx.moveTo(mid.x - dx * 4, mid.y - dy * 4);
    ctx.quadraticCurveTo(
      mid.x + px * size * 1.2 + dx * 6, mid.y + py * size * 1.2 + dy * 6,
      mid.x + px * size + dx * size * 0.9, mid.y + py * size + dy * size * 0.9,
    );
    ctx.quadraticCurveTo(
      mid.x + px * size * 0.55 - dx * 2, mid.y + py * size * 0.55 - dy * 2,
      mid.x + px * size * 0.9 - dx * size * 0.8, mid.y + py * size * 0.9 - dy * size * 0.8,
    );
    ctx.quadraticCurveTo(
      mid.x + px * size * 0.75 - dx * 4, mid.y + py * size * 0.75 - dy * 4,
      mid.x - dx * 10, mid.y - dy * 10,
    );
    ctx.closePath();
    ctx.fill();
  }

  function drawLegacyWeapon(ctx, h, tip, dx, dy, px, py, len, shape, blade, edge) {
    if (shape === 'spear') {
      ctx.strokeStyle = '#2a2218';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(h.x - dx * 10, h.y - dy * 10);
      ctx.lineTo(tip.x - dx * 10, tip.y - dy * 10);
      ctx.stroke();
      const base = { x: tip.x - dx * 12, y: tip.y - dy * 12 };
      ctx.fillStyle = blade;
      ctx.beginPath();
      ctx.moveTo(tip.x + dx * 2, tip.y + dy * 2);
      ctx.lineTo(base.x + px * 5, base.y + py * 5);
      ctx.lineTo(base.x - dx * 2, base.y - dy * 2);
      ctx.lineTo(base.x - px * 5, base.y - py * 5);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (shape === 'axe') {
      const mid = { x: h.x + dx * len * 0.55, y: h.y + dy * len * 0.55 };
      ctx.strokeStyle = '#5a3e2a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(h.x - dx * 4, h.y - dy * 4);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.fillStyle = blade;
      ctx.beginPath();
      ctx.moveTo(mid.x - dx * 4, mid.y - dy * 4);
      ctx.quadraticCurveTo(mid.x + px * 22 + dx * 6, mid.y + py * 22 + dy * 6,
        mid.x + px * 18 + dx * 16, mid.y + py * 18 + dy * 16);
      ctx.quadraticCurveTo(mid.x + px * 10 - dx * 2, mid.y + py * 10 - dy * 2,
        mid.x + px * 16 - dx * 14, mid.y + py * 16 - dy * 14);
      ctx.quadraticCurveTo(mid.x + px * 14 - dx * 4, mid.y + py * 14 - dy * 4,
        mid.x - dx * 10, mid.y - dy * 10);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (shape === 'dagger') {
      ctx.fillStyle = blade;
      ctx.beginPath();
      ctx.moveTo(h.x + px * 1.6, h.y + py * 1.6);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(h.x - px * 1.6, h.y - py * 1.6);
      ctx.closePath();
      ctx.fill();
    } else if (shape === 'twin') {
      ctx.fillStyle = blade;
      ctx.beginPath();
      ctx.moveTo(h.x + px * 1.8, h.y + py * 1.8);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(h.x - px * 1.8, h.y - py * 1.8);
      ctx.closePath();
      ctx.fill();
      const ox = h.x - dx * 8 - px * 10, oy = h.y - dy * 8 - py * 10;
      ctx.beginPath();
      ctx.moveTo(ox + px * 1.2, oy + py * 1.2);
      ctx.lineTo(ox + dx * 18, oy + dy * 18);
      ctx.lineTo(ox - px * 1.2, oy - py * 1.2);
      ctx.closePath();
      ctx.fill();
    } else if (shape === 'greatsword') {
      ctx.fillStyle = blade;
      ctx.beginPath();
      ctx.moveTo(h.x + px * 3.4, h.y + py * 3.4);
      ctx.lineTo(tip.x + px * 0.5, tip.y + py * 0.5);
      ctx.lineTo(tip.x - px * 0.5, tip.y - py * 0.5);
      ctx.lineTo(h.x - px * 3.4, h.y - py * 3.4);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = '#3a2a18';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(h.x - dx * 6, h.y - dy * 6);
      ctx.lineTo(tip.x - dx * 6, tip.y - dy * 6);
      ctx.stroke();
      ctx.fillStyle = blade;
      ctx.beginPath();
      ctx.moveTo(h.x + px * 2.2, h.y + py * 2.2);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(h.x - px * 2.2, h.y - py * 2.2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = edge;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(h.x + dx * 4, h.y + dy * 4);
    ctx.lineTo(tip.x - dx * 6, tip.y - dy * 6);
    ctx.stroke();
  }

  function profileFromShape(shape) {
    switch (shape) {
      case 'dagger': return 'needle';
      case 'greatsword': return 'broad';
      case 'twin': return 'curved';
      case 'spear': return 'needle';
      case 'axe': return 'leaf';
      default: return 'straight';
    }
  }

  function drawWeaponAt(ctx, hand, ang, look) {
    const parts = look.parts || [];
    const shape = look.shape || look.baseShape || 'sword';
    const len = look.length || DEFAULT_LEN[shape] || 44;
    const dx = Math.sin(ang), dy = Math.cos(ang);
    const tip = { x: hand.x + dx * len, y: hand.y + dy * len };
    const px = -dy, py = dx;
    const st = collectWeaponState(parts, look);

    if (st.glow) {
      const mid = { x: hand.x + dx * len * 0.55, y: hand.y + dy * len * 0.55 };
      const grd = ctx.createRadialGradient(mid.x, mid.y, 1, mid.x, mid.y, st.glow.radius);
      grd.addColorStop(0, hexAlpha(st.glow.color, st.glow.alpha));
      grd.addColorStop(1, hexAlpha(st.glow.color, 0));
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(mid.x, mid.y, st.glow.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (st.idleTrail) {
      const t = st.idleTrail;
      ctx.strokeStyle = hexAlpha(t.color, t.alpha);
      ctx.lineWidth = t.width;
      ctx.beginPath();
      ctx.moveTo(hand.x + dx * 4 + px * 3, hand.y + dy * 4 + py * 3);
      ctx.lineTo(tip.x - dx * 4 + px * 2, tip.y - dy * 4 + py * 2);
      ctx.stroke();
    }

    const drawBody = (ox, oy, scale) => {
      const hh = { x: hand.x + ox, y: hand.y + oy };
      const tipS = { x: hh.x + dx * len * scale, y: hh.y + dy * len * scale };
      for (const p of parts) {
        if (!p || !p.kind) continue;
        if (p.kind === 'haft') {
          const L = (p.length ?? 12) * scale;
          const W = (p.width ?? 3.2) * scale;
          ctx.strokeStyle = p.color || st.grip;
          ctx.lineWidth = W;
          ctx.beginPath();
          ctx.moveTo(hh.x - dx * L * 0.35, hh.y - dy * L * 0.35);
          ctx.lineTo(tipS.x - dx * 10 * scale, tipS.y - dy * 10 * scale);
          ctx.stroke();
        } else if (p.kind === 'grip') {
          const L = (p.length ?? 9) * scale;
          const W = (p.width ?? 3.2) * scale;
          ctx.strokeStyle = p.color || st.grip;
          ctx.lineWidth = W;
          ctx.beginPath();
          ctx.moveTo(hh.x - dx * L * 0.55, hh.y - dy * L * 0.55);
          ctx.lineTo(hh.x + dx * L * 0.35, hh.y + dy * L * 0.35);
          ctx.stroke();
        } else if (p.kind === 'pommel') {
          const r = (p.size ?? 3) * scale;
          ctx.fillStyle = p.color || st.metal;
          ctx.beginPath();
          ctx.arc(hh.x - dx * 8 * scale, hh.y - dy * 8 * scale, r, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === 'ring') {
          const r = (p.radius ?? 4) * scale;
          const atPommel = (p.at || 'pommel') === 'pommel';
          const cx = atPommel ? hh.x - dx * 8 * scale : hh.x + dx * 2 * scale;
          const cy = atPommel ? hh.y - dy * 8 * scale : hh.y + dy * 2 * scale;
          ctx.strokeStyle = p.color || st.metal;
          ctx.lineWidth = 1.4 * scale;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.kind === 'guard' || p.kind === 'tsuba') {
          drawGuard(ctx, hh, dx, dy, px, py,
            p.style || (p.kind === 'tsuba' ? 'disk' : 'cross'),
            (p.width ?? (p.kind === 'tsuba' ? 10 : 11)) * scale,
            p.color || st.metal,
            p.kind === 'tsuba' ? (p.radius ?? 5) * scale : undefined);
        } else if (p.kind === 'blade') {
          const frac = clamp(p.lengthFrac ?? 1, 0.4, 1.2);
          const tipB = { x: hh.x + dx * len * frac * scale, y: hh.y + dy * len * frac * scale };
          const taper = clamp(p.taper ?? 1, 0.4, 1.4);
          const ww = (p.width ?? 2.2) * scale * taper;
          drawBladeProfile(ctx, hh, tipB, dx, dy, px, py,
            p.profile || profileFromShape(shape), p.color || st.blade, ww, p.curveAmount, p.fuller);
        } else if (p.kind === 'tip') {
          drawTip(ctx, tipS, dx, dy, px, py, p.style || 'point', (p.size ?? 6) * scale, p.color || st.blade);
        } else if (p.kind === 'head') {
          const mid = { x: hh.x + dx * len * 0.55 * scale, y: hh.y + dy * len * 0.55 * scale };
          drawHead(ctx, tipS, mid, dx, dy, px, py, p.style || 'axe', (p.size ?? 14) * scale, p.color || st.blade);
        } else if (p.kind === 'tassel') {
          const root = { x: hh.x - dx * 2 - px * 3, y: hh.y - dy * 2 - py * 3 };
          const n = p.style === 'long' ? 4 : 3;
          const lenT = (p.length ?? 10) * scale * (p.style === 'long' ? 1.35 : 1);
          ctx.strokeStyle = p.color || '#a02820';
          ctx.lineWidth = 1.2;
          for (let i = 0; i < n; i++) {
            const off = (i - (n - 1) / 2) * 1.6;
            ctx.beginPath();
            ctx.moveTo(root.x + px * off, root.y + py * off);
            ctx.quadraticCurveTo(
              root.x - dx * lenT * 0.45 + px * off * 1.4,
              root.y - dy * lenT * 0.45 + py * off * 1.4,
              root.x - dx * lenT + px * off * 0.6,
              root.y - dy * lenT + py * off * 0.6,
            );
            ctx.stroke();
          }
        } else if (p.kind === 'chain') {
          const root = { x: hh.x - dx * 6, y: hh.y - dy * 6 };
          const length = (p.length ?? 14) * scale;
          const links = clamp(p.links ?? 5, 2, 12);
          ctx.strokeStyle = p.color || st.metal;
          ctx.lineWidth = 1.3;
          if (p.style === 'line') {
            ctx.beginPath();
            ctx.moveTo(root.x, root.y);
            ctx.lineTo(root.x - dx * length, root.y - dy * length);
            ctx.stroke();
          } else {
            const step = length / links;
            for (let i = 0; i < links; i++) {
              const t0 = i * step, t1 = (i + 0.7) * step;
              const side = i % 2 === 0 ? 1.5 : -1.5;
              const x0 = root.x - dx * t0 - px * side;
              const y0 = root.y - dy * t0 - py * side;
              const x1 = root.x - dx * t1 - px * side;
              const y1 = root.y - dy * t1 - py * side;
              ctx.beginPath();
              ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, step * 0.35, 1.6, Math.atan2(dy, dx), 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        } else if (p.kind === 'runeInlay') {
          const along = clamp(p.along ?? 0.45, 0.15, 0.85);
          const cx = hh.x + dx * len * along * scale;
          const cy = hh.y + dy * len * along * scale;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(Math.atan2(dy, dx));
          ctx.fillStyle = p.color || st.edge;
          ctx.font = `${Math.max(6, 8 * scale)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = 0.75;
          ctx.fillText(String(p.text || '刃').slice(0, 2), 0, 0);
          ctx.restore();
        }
      }
      if (st.inkEdge) {
        ctx.strokeStyle = st.inkEdge.color;
        ctx.lineWidth = st.inkEdge.width * scale;
        ctx.beginPath();
        ctx.moveTo(hh.x + dx * 4 * scale, hh.y + dy * 4 * scale);
        ctx.lineTo(tipS.x - dx * 6 * scale, tipS.y - dy * 6 * scale);
        ctx.stroke();
      }
    };

    if (!st.hasStructural) {
      drawLegacyWeapon(ctx, hand, tip, dx, dy, px, py, len, shape, st.blade, st.edge);
    } else {
      drawBody(0, 0, 1);
      if (st.twin) {
        const t = st.twin;
        const oxx = px * t.dx + dx * t.dy;
        const oyy = py * t.dx + dy * t.dy;
        drawBody(oxx, oyy, t.scale);
        if (t.mirror) drawBody(-oxx, -oyy * 0.2, t.scale * 0.92);
      }
    }
  }

  function drawWeaponPreview(ctx, w, h, def) {
    clearCanvas(ctx, w, h);
    if (!def) {
      label(ctx, '尚无兵器长相', 16, 28);
      return;
    }
    label(ctx, def.label || def.id || '兵器', 16, 22);
    const hand = { x: w * 0.38, y: h * 0.62 };
    const look = {
      shape: def.baseShape || 'sword',
      baseShape: def.baseShape || 'sword',
      length: DEFAULT_LEN[def.baseShape || 'sword'] || 44,
      blade: '#9aa0a8',
      trail: '#c9a466',
      edge: '#c8d0d8',
      parts: def.parts || [],
    };
    // subtle grip marker
    ctx.fillStyle = 'rgba(200,176,144,0.25)';
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 4, 0, Math.PI * 2);
    ctx.fill();
    drawWeaponAt(ctx, hand, -0.55, look);
    // second angle for twin/feel
    if ((def.parts || []).some((p) => p && p.kind === 'twinOffset')) {
      drawWeaponAt(ctx, { x: w * 0.68, y: h * 0.58 }, 0.35, look);
    }
  }

  /* ── Silhouette (simplified full-body) ──────────────────── */

  function paletteFor(body, F) {
    if (F) {
      const w = '#fff';
      return { cloak: w, coat: w, arm: w, armB: w, leg: w, legB: w, boot: w, skin: w, sash: w, collar: w, eye: w };
    }
    if (body === 'shield') {
      return {
        cloak: '#2a2430', coat: '#3a3040', arm: '#4a3848', armB: '#342838',
        leg: '#2e2834', legB: '#241e28', boot: '#1a1418', skin: '#d8c8b0',
        sash: '#8a2030', collar: '#1a1018', eye: '#c03040',
      };
    }
    if (body === 'archer') {
      return {
        cloak: '#121820', coat: '#1a2430', arm: '#243040', armB: '#182028',
        leg: '#1a222c', legB: '#121820', boot: '#0a0e14', skin: '#c8b8a8',
        sash: '#305060', collar: '#0a1018', eye: '#50a0c0',
      };
    }
    if (body === 'spear') {
      return {
        cloak: '#141820', coat: '#1c2430', arm: '#2a3440', armB: '#1a222c',
        leg: '#182028', legB: '#121820', boot: '#0a0e12', skin: '#d0c0a8',
        sash: '#6a3040', collar: '#0c1018', eye: '#c07040',
      };
    }
    return {
      cloak: '#2a1810', coat: '#3a2818', arm: '#4a3420', armB: '#302418',
      leg: '#2e2218', legB: '#241810', boot: '#140e0a', skin: '#e0c8a8',
      sash: '#a02820', collar: '#1a1008', eye: '#e05030',
    };
  }

  function parseSilParts(parts) {
    const out = {
      scale: 1, palette: null, cloak: null, armor: [], ornaments: [],
      faceMark: null, stance: null, headgear: null, offhand: null, mainhand: null,
    };
    for (const p of parts || []) {
      if (!p || !p.kind) continue;
      if (p.kind === 'scale') out.scale = clamp(p.value ?? 1, 0.6, 1.6);
      else if (p.kind === 'palette') out.palette = p;
      else if (p.kind === 'cloak') out.cloak = p;
      else if (p.kind === 'armorLayer') out.armor.push(p);
      else if (p.kind === 'ornament') out.ornaments.push(p);
      else if (p.kind === 'faceMark') out.faceMark = p;
      else if (p.kind === 'stanceBias') out.stance = p;
      else if (p.kind === 'headgear') out.headgear = p.style || 'bandit';
      else if (p.kind === 'offhand') out.offhand = p.style || 'none';
      else if (p.kind === 'mainhand') out.mainhand = p;
    }
    return out;
  }

  function limb(ctx, a, b, c, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
  }

  function drawSilhouettePreview(ctx, w, h, def, content) {
    clearCanvas(ctx, w, h);
    if (!def) {
      label(ctx, '尚无长相', 16, 28);
      return;
    }
    label(ctx, def.label || def.id || '剪影', 16, 22);
    const body = def.baseRig || def.body || 'axe';
    const parsed = parseSilParts(def.parts);
    const s = parsed.scale;
    let pal = paletteFor(body, false);
    if (parsed.palette) {
      for (const k of ['cloak', 'coat', 'arm', 'armB', 'leg', 'legB', 'boot', 'skin', 'sash', 'collar', 'eye']) {
        if (parsed.palette[k]) pal[k] = parsed.palette[k];
      }
    }

    const ox = w * 0.5 + (parsed.stance ? (parsed.stance.lean || 0) * 10 : 0);
    const oy = h * 0.72 + (parsed.stance ? (parsed.stance.crouch || 0) * 12 : 0);
    const hip = { x: ox, y: oy - 18 * s };
    const sh = { x: ox + 2 * s, y: oy - 42 * s };
    const head = { x: ox + 3 * s, y: oy - 58 * s };
    const fKnee = { x: ox + 8 * s, y: oy + 2 * s };
    const fFoot = { x: ox + 12 * s, y: oy + 22 * s };
    const bKnee = { x: ox - 10 * s, y: oy };
    const bFoot = { x: ox - 14 * s, y: oy + 20 * s };
    const fElbow = { x: ox + 18 * s, y: oy - 30 * s };
    const fHand = { x: ox + 28 * s, y: oy - 18 * s };
    const bElbow = { x: ox - 14 * s, y: oy - 28 * s };
    const bHand = { x: ox - 20 * s, y: oy - 14 * s };
    const flutter = 1.5;

    // cloak
    const cloakStyle = parsed.cloak?.style || 'long';
    if (cloakStyle !== 'none') {
      const cf = cloakStyle === 'short' ? 0.55 : cloakStyle === 'ragged' ? 1.15 : 1;
      ctx.fillStyle = parsed.cloak?.color || pal.cloak;
      ctx.beginPath();
      ctx.moveTo(sh.x + 3, sh.y - 2);
      ctx.quadraticCurveTo(sh.x - 14, sh.y + 8, sh.x - 20 * cf, hip.y + 18 * cf + flutter);
      ctx.lineTo(sh.x - 6, hip.y + 12 * cf);
      if (cloakStyle === 'ragged') {
        ctx.lineTo(sh.x - 12, hip.y + 16 + flutter);
        ctx.lineTo(sh.x - 8, hip.y + 20);
        ctx.lineTo(sh.x - 14, hip.y + 24 + flutter);
      } else {
        ctx.lineTo(sh.x - 10, hip.y + 22 * cf + flutter * 0.6);
      }
      ctx.lineTo(hip.x + 2, hip.y - 2);
      ctx.closePath();
      ctx.fill();
    }

    limb(ctx, sh, bElbow, bHand, 5.2 * s, pal.armB);
    limb(ctx, hip, bKnee, bFoot, 6 * s, pal.legB);
    ctx.strokeStyle = pal.boot;
    ctx.lineWidth = 7 * s;
    ctx.beginPath();
    ctx.moveTo(bKnee.x + (bFoot.x - bKnee.x) * 0.5, bKnee.y + (bFoot.y - bKnee.y) * 0.5);
    ctx.lineTo(bFoot.x, bFoot.y);
    ctx.lineTo(bFoot.x + 5 * s, bFoot.y);
    ctx.stroke();

    // torso
    const nx = 1, ny = 0;
    ctx.fillStyle = pal.coat;
    ctx.beginPath();
    ctx.moveTo(sh.x + nx * 9 * s, sh.y);
    ctx.lineTo(sh.x - nx * 8 * s, sh.y);
    ctx.lineTo(hip.x - nx * 8 * s, hip.y);
    ctx.lineTo(hip.x + nx * 8 * s, hip.y);
    ctx.closePath();
    ctx.fill();
    // skirt
    ctx.beginPath();
    ctx.moveTo(hip.x + 8 * s, hip.y);
    ctx.lineTo((hip.x + fKnee.x) / 2 + 5, (hip.y + fKnee.y) / 2 + 8);
    ctx.lineTo(hip.x - 2, hip.y + 18 * s);
    ctx.lineTo(hip.x - 14 * s, hip.y + 16 * s + flutter);
    ctx.lineTo(hip.x - 8 * s, hip.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pal.sash;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(hip.x + 8 * s, hip.y + 2);
    ctx.lineTo(hip.x - 8 * s, hip.y + 2);
    ctx.stroke();

    for (const a of parsed.armor) {
      const col = a.color || (a.style === 'plate' ? '#6a7080' : pal.coat);
      ctx.fillStyle = col;
      ctx.globalAlpha = a.style === 'plate' ? 0.55 : 0.35;
      if (a.slot === 'chest' || !a.slot) {
        ctx.beginPath();
        ctx.moveTo(sh.x + 7 * s, sh.y);
        ctx.lineTo(sh.x - 6 * s, sh.y);
        ctx.lineTo(hip.x - 5 * s, hip.y - 4);
        ctx.lineTo(hip.x + 5 * s, hip.y - 4);
        ctx.closePath();
        ctx.fill();
      } else if (a.slot === 'shoulder') {
        ctx.beginPath();
        ctx.ellipse(sh.x + 10 * s, sh.y + 2, 7 * s, 5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (a.slot === 'skirt') {
        ctx.beginPath();
        ctx.moveTo(hip.x + 7 * s, hip.y);
        ctx.lineTo(hip.x + 10 * s, hip.y + 16 * s);
        ctx.lineTo(hip.x - 10 * s, hip.y + 16 * s);
        ctx.lineTo(hip.x - 7 * s, hip.y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    limb(ctx, hip, fKnee, fFoot, 6.4 * s, pal.leg);
    ctx.strokeStyle = pal.boot;
    ctx.lineWidth = 7 * s;
    ctx.beginPath();
    ctx.moveTo(fKnee.x + (fFoot.x - fKnee.x) * 0.5, fKnee.y + (fFoot.y - fKnee.y) * 0.5);
    ctx.lineTo(fFoot.x, fFoot.y);
    ctx.lineTo(fFoot.x + 5 * s, fFoot.y);
    ctx.stroke();

    // head
    const hr = 8.2 * s;
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.arc(head.x + 1.2, head.y + 1, hr * 0.88, 0, Math.PI * 2);
    ctx.fill();
    const hg = parsed.headgear || (body === 'shield' ? 'hat' : body === 'archer' ? 'hood' : body === 'spear' ? 'topknot' : 'bandit');
    if (hg !== 'none') {
      if (hg === 'bandit') {
        ctx.fillStyle = '#1a1008';
        ctx.beginPath();
        ctx.arc(head.x, head.y - 1, hr + 0.5, Math.PI * 1.05, Math.PI * 1.95);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#8a2030';
        ctx.fillRect(head.x - hr - 1, head.y - 2, hr * 2 + 2, 2.4);
      } else if (hg === 'hat') {
        ctx.fillStyle = '#4a3820';
        ctx.beginPath();
        ctx.ellipse(head.x, head.y - 6, hr + 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (hg === 'topknot') {
        ctx.fillStyle = '#0e1218';
        ctx.beginPath();
        ctx.arc(head.x - 1, head.y - 4, hr * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a4550';
        ctx.fillRect(head.x - hr - 0.5, head.y - 3, hr * 2 + 1, 2.2);
      } else {
        ctx.fillStyle = '#121820';
        ctx.beginPath();
        ctx.moveTo(head.x + 8, head.y - 3);
        ctx.quadraticCurveTo(head.x + 2, head.y - 14, head.x - 9, head.y - 8);
        ctx.lineTo(head.x - 13, head.y + 7);
        ctx.lineTo(head.x - 3, head.y + 8);
        ctx.quadraticCurveTo(head.x - 4, head.y - 2, head.x + 8, head.y - 3);
        ctx.fill();
      }
    }
    ctx.fillStyle = pal.eye;
    ctx.fillRect(head.x + 4.2, head.y, 2.4, 1.4);
    if (parsed.faceMark && parsed.faceMark.style && parsed.faceMark.style !== 'none') {
      const fc = parsed.faceMark.color || '#3a3038';
      ctx.strokeStyle = fc;
      ctx.fillStyle = fc;
      if (parsed.faceMark.style === 'scar') {
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(head.x + 2, head.y - 3);
        ctx.lineTo(head.x + 6, head.y + 4);
        ctx.stroke();
      } else if (parsed.faceMark.style === 'mask') {
        ctx.globalAlpha = 0.75;
        ctx.fillRect(head.x - 2, head.y - 1, 10, 5);
        ctx.globalAlpha = 1;
      }
    }

    // weapon
    let look = null;
    const mh = parsed.mainhand;
    if (mh) {
      if (mh.weaponId && content && Array.isArray(content.weapons)) {
        const wdef = content.weapons.find((x) => x && x.id === mh.weaponId);
        if (wdef) {
          look = {
            shape: wdef.shape || 'sword',
            length: wdef.length || DEFAULT_LEN[wdef.shape] || 44,
            blade: wdef.blade || '#9aa0a8',
            trail: wdef.trail || '#ff2040',
            edge: wdef.edge || '#c8d0d8',
            parts: [],
          };
          if (wdef.lookId && content.weaponLooks) {
            const wl = content.weaponLooks.find((x) => x && x.id === wdef.lookId);
            if (wl) {
              look.parts = wl.parts || [];
              look.baseShape = wl.baseShape || look.shape;
              look.shape = wl.baseShape || look.shape;
            }
          }
        }
      }
      if (!look && mh.shape) {
        look = {
          shape: mh.shape,
          length: mh.length || DEFAULT_LEN[mh.shape] || 44,
          blade: mh.blade || '#9aa0a8',
          trail: mh.trail || '#ff2040',
          edge: mh.edge || '#c8d0d8',
          parts: [],
        };
      }
    }
    if (!look) {
      // body default
      const shape = body === 'spear' ? 'spear' : body === 'axe' ? 'axe' : body === 'archer' ? 'sword' : 'sword';
      look = {
        shape,
        length: DEFAULT_LEN[shape] || 44,
        blade: '#9aa0a8',
        trail: '#c9a466',
        edge: '#c8d0d8',
        parts: [],
      };
    }
    drawWeaponAt(ctx, fHand, -0.4, look);

    limb(ctx, sh, fElbow, fHand, 5.4 * s, pal.arm);
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.arc(fHand.x, fHand.y, 3 * s, 0, Math.PI * 2);
    ctx.fill();

    if (parsed.offhand === 'shield' || (!parsed.offhand && body === 'shield')) {
      ctx.fillStyle = '#4a3840';
      ctx.beginPath();
      ctx.arc(bHand.x, bHand.y, 12 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (parsed.offhand === 'blade') {
      drawWeaponAt(ctx, bHand, 0.9, {
        shape: 'dagger', length: 22, blade: '#8a9098', trail: '#c9a466', edge: '#c8d0d8', parts: [],
      });
    }
  }

  /* ── Anim timeline ──────────────────────────────────────── */

  function stepFrames(step) {
    if (!step || !step.kind) return 4;
    if (typeof step.frames === 'number') return Math.max(1, step.frames);
    if (step.kind === 'wait') return Math.max(1, step.frames || 6);
    if (step.kind === 'holdPose' || step.kind === 'loopPose' || step.kind === 'hover') return Math.max(1, step.frames || 8);
    if (step.kind === 'chainPose') return Math.max(1, (step.poseIds || []).length) * (step.frameEach || 4);
    if (step.kind === 'bounce') return Math.max(1, (step.hops || 1) * (step.gapFrames || 8));
    if (step.kind === 'sfx' || step.kind === 'face' || step.kind === 'fallStrike') return 2;
    return 6;
  }

  function buildTimeline(steps) {
    const items = [];
    let t = 0;
    for (const s of steps || []) {
      const f = stepFrames(s);
      items.push({ step: s, start: t, end: t + f, frames: f });
      t += f;
    }
    return { items, total: Math.max(1, t) };
  }

  function poseAngles(poseId) {
    const id = String(poseId || '');
    if (/slash|cut|斩/.test(id)) return { arm: -1.1, wAng: -1.4, lean: 0.15 };
    if (/thrust|刺|spear/.test(id)) return { arm: -0.2, wAng: -0.15, lean: 0.25 };
    if (/guard|block|挡/.test(id)) return { arm: 0.4, wAng: 0.8, lean: -0.1 };
    if (/cast|seal|符/.test(id)) return { arm: -1.4, wAng: -0.6, lean: 0 };
    if (/idle|stand/.test(id)) return { arm: -0.35, wAng: -0.4, lean: 0 };
    return { arm: -0.55, wAng: -0.7, lean: 0.05 };
  }

  /** Pose2: playPose timeline full → wind/strike/rec by localT thirds (rough stick preview) */
  function posePhaseFromLocalT(localT) {
    const t = Math.max(0, Math.min(1, Number(localT) || 0));
    if (t < 1 / 3) return 'wind';
    if (t < 2 / 3) return 'strike';
    return 'rec';
  }

  function poseAnglesFromNums(nums, fallback) {
    if (!nums || typeof nums !== 'object') return fallback;
    return {
      arm: -(typeof nums.fa === 'number' ? nums.fa : 0.55),
      wAng: -((typeof nums.w === 'number' ? nums.w : 0.3) + 0.5),
      lean: typeof nums.lean === 'number' ? nums.lean : 0,
    };
  }

  function poseAnglesForPlayPose(poseId, step, localT, content) {
    const base = poseAngles(poseId);
    const full = step && step.timeline === 'full';
    if (!full) return base; // strike / 缺省
    const phase = posePhaseFromLocalT(localT);
    const pack = content && Array.isArray(content.poses)
      ? content.poses.find((x) => x && x.id === poseId)
      : null;
    if (pack && pack[phase]) return poseAnglesFromNums(pack[phase], base);
    // heuristic three-state offsets when pack pose unavailable
    if (phase === 'wind') return { arm: base.arm + 0.55, wAng: base.wAng + 0.55, lean: base.lean - 0.22 };
    if (phase === 'rec') return { arm: base.arm + 0.3, wAng: base.wAng + 0.25, lean: base.lean + 0.1 };
    return base;
  }

  function drawStickCaster(ctx, cx, cy, pose, tint, scalePunch) {
    const sc = scalePunch || 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    if (pose.lean) ctx.rotate(pose.lean * 0.2);
    const pal = paletteFor('spear', false);
    if (tint) {
      ctx.globalAlpha = 0.85;
    }
    const hip = { x: 0, y: 0 };
    const sh = { x: 2, y: -24 };
    const head = { x: 3, y: -40 };
    const fHand = { x: 18 + Math.sin(pose.arm) * 10, y: -10 + Math.cos(pose.arm) * 8 };
    ctx.fillStyle = pal.coat;
    ctx.beginPath();
    ctx.moveTo(sh.x + 8, sh.y);
    ctx.lineTo(sh.x - 8, sh.y);
    ctx.lineTo(hip.x - 8, hip.y);
    ctx.lineTo(hip.x + 8, hip.y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hip.x + 8, hip.y);
    ctx.lineTo(hip.x + 6, hip.y + 18);
    ctx.lineTo(hip.x - 10, hip.y + 16);
    ctx.lineTo(hip.x - 8, hip.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0e1218';
    ctx.beginPath();
    ctx.arc(head.x - 1, head.y - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pal.arm;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(fHand.x, fHand.y);
    ctx.stroke();
    drawWeaponAt(ctx, fHand, pose.wAng, {
      shape: 'sword', length: 40, blade: '#b8c0c8', trail: '#c9a466', edge: '#e0e8f0', parts: [],
    });
    if (tint) {
      ctx.fillStyle = hexAlpha(tint, 0.25);
      ctx.fillRect(-30, -55, 60, 90);
    }
    ctx.restore();
  }

  function drawAnimFx(ctx, cx, cy, step, localT, w, h) {
    if (!step) return;
    const k = step.kind;
    const color = step.color || GOLD;
    if (k === 'swingArc' || k === 'crescentSlash') {
      const r = step.radius || 72;
      const sweep = step.sweep || 1.2;
      const a0 = -1.6;
      const a1 = a0 + sweep * localT;
      ctx.strokeStyle = hexAlpha(color, 0.55);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx + 10, cy - 12, r * 0.55, a0, a1);
      ctx.stroke();
    } else if (k === 'weaponTrail' || k === 'talismanTrail') {
      ctx.strokeStyle = hexAlpha(color, 0.4);
      ctx.lineWidth = step.width || 3;
      ctx.beginPath();
      ctx.moveTo(cx + 8, cy - 8);
      ctx.quadraticCurveTo(cx + 40, cy - 40, cx + 55, cy - 10);
      ctx.stroke();
    } else if (k === 'afterimage') {
      const n = step.count || 3;
      for (let i = 0; i < n; i++) {
        ctx.globalAlpha = (step.alpha || 0.25) * (1 - i / n);
        drawStickCaster(ctx, cx - (i + 1) * 14, cy, poseAngles('slash'), step.color, 0.92);
      }
      ctx.globalAlpha = 1;
    } else if (k === 'sealGlyph' || k === 'sealStamp' || k === 'sealSpin') {
      const text = (step.text || '封').slice(0, 2);
      ctx.save();
      ctx.translate(cx, cy - 30);
      if (k === 'sealSpin') ctx.rotate(localT * Math.PI * 2 * (step.revs || 1));
      const sc = (step.scale || 1) * (0.8 + 0.4 * Math.sin(localT * Math.PI));
      ctx.scale(sc, sc);
      ctx.strokeStyle = color;
      ctx.fillStyle = hexAlpha(color, 0.15);
      ctx.lineWidth = 2;
      ctx.strokeRect(-18, -18, 36, 36);
      ctx.fillRect(-18, -18, 36, 36);
      ctx.fillStyle = color;
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 1);
      ctx.restore();
    } else if (k === 'sealPaper') {
      ctx.fillStyle = hexAlpha(step.color || '#e8d0a0', 0.7);
      const pw = step.w || 22, ph = step.h || 30;
      ctx.fillRect(cx - pw / 2, cy - 50 - ph / 2, pw, ph);
      ctx.strokeStyle = INK;
      ctx.strokeRect(cx - pw / 2, cy - 50 - ph / 2, pw, ph);
    } else if (k === 'inkBurst' || k === 'inkSplash' || k === 'sparkBurst' || k === 'flareBurst' || k === 'landDust') {
      const n = step.n || 8;
      const size = step.size || 24;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = size * (0.3 + 0.7 * localT);
        ctx.fillStyle = hexAlpha(color, 0.5 * (1 - localT));
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * rr, cy - 10 + Math.sin(a) * rr * 0.6, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (k === 'ringPulse' || k === 'baguaRing' || k === 'exorcismWave' || k === 'orbitRing') {
      const r = (step.radius || step.size || 40) * (0.4 + 0.6 * localT);
      ctx.strokeStyle = hexAlpha(color, 0.55 * (1 - localT * 0.5));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy - 8, r, 0, Math.PI * 2);
      ctx.stroke();
      if (k === 'baguaRing') {
        ctx.font = '10px serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText('☰', cx, cy - 8);
      }
    } else if (k === 'beamLine' || k === 'swordQiFlash') {
      ctx.strokeStyle = hexAlpha(color, 0.7);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy - 12);
      ctx.lineTo(cx + (step.length || 80), cy - 20);
      ctx.stroke();
    } else if (k === 'groundCrack') {
      ctx.strokeStyle = hexAlpha(step.color || '#6a5040', 0.8);
      ctx.lineWidth = 2;
      const ww = step.width || 40;
      ctx.beginPath();
      ctx.moveTo(cx - ww, cy + 22);
      ctx.lineTo(cx, cy + 18);
      ctx.lineTo(cx + ww * 0.6, cy + 24);
      ctx.stroke();
    } else if (k === 'flash' || k === 'parryFlash') {
      ctx.fillStyle = hexAlpha(step.color || '#fff', (step.a ?? 0.35) * (1 - localT));
      ctx.fillRect(0, 0, w, h);
    } else if (k === 'tintCaster' || k === 'guardGlow') {
      /* handled via tint on caster */
    } else if (k === 'riseMist') {
      ctx.fillStyle = hexAlpha(step.color || '#a0b0c0', 0.2);
      ctx.beginPath();
      ctx.ellipse(cx, cy + 10, 40, 10 + 8 * localT, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (k === 'soulBell') {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy - 48, 8 + 4 * Math.sin(localT * Math.PI * 2), 0, Math.PI * 2);
      ctx.stroke();
    } else if (k === 'bindThreads') {
      ctx.strokeStyle = hexAlpha(color, 0.5);
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy - 20 + i * 8);
        ctx.quadraticCurveTo(cx, cy - 30 + i * 6, cx + 30, cy - 15 + i * 8);
        ctx.stroke();
      }
    } else if (k === 'dash' || k === 'hop' || k === 'bounce') {
      ctx.strokeStyle = hexAlpha(PAPER, 0.35);
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy);
      ctx.lineTo(cx + 20, cy - 8);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawAnimFrame(ctx, w, h, def, frame, timeline, content) {
    clearCanvas(ctx, w, h);
    if (!def) {
      label(ctx, '尚无招式样子', 16, 28);
      return;
    }
    label(ctx, def.label || def.id || '招式', 16, 22);
    const cx = w * 0.42;
    const cy = h * 0.62;
    let cur = null;
    let localT = 0;
    let pose = poseAngles('idle');
    let tint = null;
    let scalePunch = 1;
    let phaseTag = '';
    for (const it of timeline.items) {
      if (frame >= it.start && frame < it.end) {
        cur = it;
        localT = (frame - it.start) / Math.max(1, it.frames);
        break;
      }
      if (frame >= it.end) {
        const s = it.step;
        if (s && (s.kind === 'playPose' || s.kind === 'holdPose' || s.kind === 'loopPose')) {
          // after step: freeze on strike (full ends on rec visually during scrub of that step only)
          pose = poseAnglesForPlayPose(s.poseId, { timeline: 'strike' }, 0.5, content);
        } else if (s && s.kind === 'chainPose' && s.poseIds && s.poseIds.length) {
          pose = poseAngles(s.poseIds[s.poseIds.length - 1]);
        }
      }
    }
    if (cur && cur.step) {
      const s = cur.step;
      if (s.kind === 'playPose') {
        pose = poseAnglesForPlayPose(s.poseId, s, localT, content);
        if (s.timeline === 'full') phaseTag = ' · ' + posePhaseFromLocalT(localT);
      } else if (s.kind === 'holdPose' || s.kind === 'loopPose') {
        pose = poseAngles(s.poseId);
      }
      if (s.kind === 'chainPose' && s.poseIds) {
        const idx = Math.min(s.poseIds.length - 1, Math.floor(localT * s.poseIds.length));
        pose = poseAngles(s.poseIds[idx]);
      }
      if (s.kind === 'tintCaster') tint = s.color;
      if (s.kind === 'scalePunch') scalePunch = 1 + ((s.scale || 1.2) - 1) * Math.sin(localT * Math.PI);
      if (s.kind === 'dash') {
        drawStickCaster(ctx, cx + (s.dist || 40) * localT * 0.4, cy, pose, tint, scalePunch);
      } else {
        drawStickCaster(ctx, cx, cy, pose, tint, scalePunch);
      }
      drawAnimFx(ctx, cx, cy, s, localT, w, h);
    } else {
      drawStickCaster(ctx, cx, cy, pose, tint, scalePunch);
    }

    // timeline bar
    const barY = h - 18;
    const barX = 16;
    const barW = w - 32;
    ctx.fillStyle = 'rgba(40,32,48,0.9)';
    ctx.fillRect(barX, barY - 6, barW, 8);
    let x = barX;
    for (const it of timeline.items) {
      const ww = (it.frames / timeline.total) * barW;
      const active = cur === it;
      ctx.fillStyle = active ? GOLD : 'rgba(201,164,102,0.28)';
      ctx.fillRect(x, barY - 6, Math.max(1, ww - 1), 8);
      x += ww;
    }
    const playX = barX + (frame / timeline.total) * barW;
    ctx.fillStyle = PAPER;
    ctx.fillRect(playX - 1, barY - 9, 2, 14);
    if (cur && cur.step) {
      label(ctx, `${cur.step.kind}${cur.step.poseId ? ' · ' + cur.step.poseId : ''}${phaseTag}`, 16, 36);
    }
  }

  function mountAnim(host, def, content) {
    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'ink-preview-stage';
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 200;
    canvas.className = 'ink-canvas';
    wrap.append(canvas);
    const controls = document.createElement('div');
    controls.className = 'ink-preview-controls';
    const btnPlay = document.createElement('button');
    btnPlay.type = 'button';
    btnPlay.className = 'btn-ink tiny';
    btnPlay.textContent = '▶ 回放';
    const btnPause = document.createElement('button');
    btnPause.type = 'button';
    btnPause.className = 'btn-ink tiny';
    btnPause.textContent = '❚❚';
    const scrub = document.createElement('input');
    scrub.type = 'range';
    scrub.min = '0';
    scrub.max = '100';
    scrub.value = '0';
    scrub.className = 'ink-scrub';
    scrub.setAttribute('aria-label', '时间轴');
    controls.append(btnPlay, btnPause, scrub);
    wrap.append(controls);
    host.append(wrap);

    const ctx = canvas.getContext('2d');
    const timeline = buildTimeline(def && def.steps);
    scrub.max = String(Math.max(0, timeline.total - 1));
    let frame = 0;
    let playing = true;
    let raf = 0;
    let acc = 0;
    let last = 0;

    const paint = () => {
      drawAnimFrame(ctx, canvas.width, canvas.height, def, frame, timeline, content);
      scrub.value = String(frame);
    };

    const tick = (ts) => {
      if (!playing) {
        last = ts;
        raf = requestAnimationFrame(tick);
        return;
      }
      if (!last) last = ts;
      acc += ts - last;
      last = ts;
      // ~12 fps feel
      while (acc >= 80) {
        acc -= 80;
        frame += 1;
        if (frame >= timeline.total) frame = 0;
      }
      paint();
      raf = requestAnimationFrame(tick);
    };

    btnPlay.addEventListener('click', () => { playing = true; });
    btnPause.addEventListener('click', () => { playing = false; });
    scrub.addEventListener('input', () => {
      frame = Number(scrub.value) || 0;
      playing = false;
      paint();
    });

    paint();
    raf = requestAnimationFrame(tick);
    return {
      stop() {
        playing = false;
        cancelAnimationFrame(raf);
      },
    };
  }

  /* ── Stage wave schematic ───────────────────────────────── */

  function drawStageSchematic(ctx, w, h, def) {
    clearCanvas(ctx, w, h);
    if (!def) {
      label(ctx, '尚无幕次', 16, 28);
      return;
    }
    label(ctx, def.title || def.id || '浪次', 16, 22);
    const arenas = def.arenas || [];
    const stageLen = Math.max(1, def.length || 1);
    const padL = 16, padR = 16, top = 40, usableW = w - padL - padR;
    const laneH = Math.min(48, Math.max(28, (h - top - 36) / Math.max(1, arenas.length + (def.boss ? 1 : 0))));

    // world length bar
    ctx.strokeStyle = 'rgba(201,164,102,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL, top - 10);
    ctx.lineTo(padL + usableW, top - 10);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.font = '10px sans-serif';
    ctx.fillText(`程 ${stageLen}`, padL, top - 14);

    // platforms as ticks on length bar
    const plats = def.platforms || [];
    for (const p of plats) {
      const x = padL + ((p.x || 0) / stageLen) * usableW;
      const pw = Math.max(3, ((p.w || 40) / stageLen) * usableW);
      ctx.fillStyle = 'rgba(160,140,110,0.55)';
      ctx.fillRect(x, top - 16, pw, 4);
    }

    arenas.forEach((a, i) => {
      const y = top + i * (laneH + 6);
      const x0 = padL + ((a.x0 || 0) / stageLen) * usableW;
      const x1 = padL + ((a.trigger || (a.x0 || 0) + 340) / stageLen) * usableW;
      const aw = Math.max(24, x1 - x0);
      ctx.fillStyle = 'rgba(40,32,48,0.85)';
      ctx.strokeStyle = 'rgba(201,164,102,0.4)';
      ctx.lineWidth = 1;
      ctx.fillRect(x0, y, aw, laneH);
      ctx.strokeRect(x0, y, aw, laneH);
      ctx.fillStyle = GOLD;
      ctx.font = '11px serif';
      ctx.fillText(a.name || `场${i + 1}`, x0 + 6, y + 14);

      const waves = a.waves || [];
      waves.forEach((wave, wi) => {
        const wx = x0 + 8 + wi * 22;
        const wy = y + laneH - 10;
        ctx.fillStyle = 'rgba(201,164,102,0.2)';
        ctx.fillRect(wx - 4, y + 18, 18, laneH - 24);
        (wave || []).forEach((sp, si) => {
          const side = sp.side === 'L' ? -1 : 1;
          const sx = wx + side * 5;
          const sy = wy - si * 5;
          ctx.fillStyle = sp.type === 'archer' ? '#50a0c0'
            : sp.type === 'shield' ? '#c03040'
              : sp.type === 'spear' ? '#c07040' : '#e05030';
          ctx.beginPath();
          ctx.moveTo(sx, sy - 6);
          ctx.lineTo(sx + 4, sy);
          ctx.lineTo(sx - 4, sy);
          ctx.closePath();
          ctx.fill();
          // delay tick
          if (sp.delay) {
            ctx.fillStyle = MUTED;
            ctx.font = '8px sans-serif';
            ctx.fillText(`+${sp.delay}`, sx - 6, sy + 9);
          }
        });
        // side marks
        ctx.fillStyle = 'rgba(200,176,144,0.35)';
        ctx.font = '9px sans-serif';
        ctx.fillText('L', x0 + 4, y + laneH - 4);
        ctx.fillText('R', x0 + aw - 12, y + laneH - 4);
      });
      if (a.eliteWeight) {
        ctx.fillStyle = '#e8c870';
        ctx.font = '9px serif';
        ctx.fillText('精英偏重', x0 + aw - 48, y + 14);
      }
    });

    if (def.boss) {
      const y = top + arenas.length * (laneH + 6);
      const bx = padL + ((def.boss.x0 || stageLen * 0.85) / stageLen) * usableW;
      ctx.fillStyle = 'rgba(80,24,32,0.75)';
      ctx.strokeStyle = '#e05030';
      ctx.fillRect(bx, y, Math.min(100, usableW * 0.2), laneH);
      ctx.strokeRect(bx, y, Math.min(100, usableW * 0.2), laneH);
      ctx.fillStyle = '#e8d0a0';
      ctx.font = '11px serif';
      ctx.fillText(def.boss.bossName || def.boss.bossId || 'Boss', bx + 6, y + 16);
      ctx.fillStyle = MUTED;
      ctx.font = '9px sans-serif';
      ctx.fillText(`HP×${def.boss.hpScale ?? 1}`, bx + 6, y + 30);
    }
  }

  /* ── Public API ─────────────────────────────────────────── */

  function ensureShell(host) {
    let stage = host.querySelector('.ink-preview-stage');
    if (stage) return stage;
    host.innerHTML = '';
    stage = document.createElement('div');
    stage.className = 'ink-preview-stage';
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 200;
    canvas.className = 'ink-canvas';
    stage.append(canvas);
    host.append(stage);
    return stage;
  }

  function stop(host) {
    const c = ctrls.get(host);
    if (c && c.stop) c.stop();
    ctrls.delete(host);
  }

  /**
   * @param {HTMLElement} host
   * @param {string} section
   * @param {any} def
   * @param {{ content?: any }} [opts]
   */
  function render(host, section, def, opts) {
    if (!host) return;
    stop(host);
    const content = (opts && opts.content) || {};

    if (section === 'animRecipes') {
      const ctrl = mountAnim(host, def, content);
      ctrls.set(host, ctrl);
      return;
    }

    const stage = ensureShell(host);
    // remove leftover controls from prior anim
    stage.querySelectorAll('.ink-preview-controls').forEach((el) => el.remove());
    let canvas = stage.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 280;
      canvas.height = 200;
      canvas.className = 'ink-canvas';
      stage.append(canvas);
    }
    if (section === 'stages') {
      canvas.width = 300;
      canvas.height = 240;
    } else {
      canvas.width = 280;
      canvas.height = 200;
    }
    const ctx = canvas.getContext('2d');
    if (section === 'weaponLooks') drawWeaponPreview(ctx, canvas.width, canvas.height, def);
    else if (section === 'silhouettes') drawSilhouettePreview(ctx, canvas.width, canvas.height, def, content);
    else if (section === 'stages') drawStageSchematic(ctx, canvas.width, canvas.height, def);
    else if (section === 'gameplay' && opts && opts.gpKind === 'enemies') {
      // resolve silhouette if present
      let sil = null;
      if (def && def.silhouetteId && content.silhouettes) {
        sil = content.silhouettes.find((x) => x && x.id === def.silhouetteId) || null;
      }
      if (sil) drawSilhouettePreview(ctx, canvas.width, canvas.height, sil, content);
      else {
        clearCanvas(ctx, canvas.width, canvas.height);
        label(ctx, (def && (def.name || def.id)) || '敌寇', 16, 22);
        drawSilhouettePreview(ctx, canvas.width, canvas.height, {
          id: def && def.id, label: def && def.name, body: (def && def.body) || 'axe', parts: [],
        }, content);
      }
    } else if (section === 'gameplay' && opts && opts.gpKind === 'weapons') {
      let look = null;
      if (def && def.lookId && content.weaponLooks) {
        look = content.weaponLooks.find((x) => x && x.id === def.lookId);
      }
      if (look) drawWeaponPreview(ctx, canvas.width, canvas.height, look);
      else {
        clearCanvas(ctx, canvas.width, canvas.height);
        label(ctx, (def && (def.name || def.id)) || '兵器', 16, 22);
        drawWeaponAt(ctx, { x: canvas.width * 0.4, y: canvas.height * 0.6 }, -0.55, {
          shape: (def && def.shape) || 'sword',
          length: (def && def.length) || 44,
          blade: (def && def.blade) || '#9aa0a8',
          trail: (def && def.trail) || '#c9a466',
          edge: (def && def.edge) || '#c8d0d8',
          parts: [],
        });
      }
    } else if (section === 'gameplay' && opts && opts.gpKind === 'poses') {
      // Loco3 light hint: stick from strike PoseNums; tag loco when hp.*/sp.*
      clearCanvas(ctx, canvas.width, canvas.height);
      const pid = (def && def.id) ? String(def.id) : 'pose';
      const isLoco = /^(hp|sp)\./.test(pid);
      label(ctx, pid + (isLoco ? ' · loco' : ' · 攻击姿'), 16, 22);
      if (isLoco) label(ctx, '只读 strike · 建议三帧同填', 16, 40);
      const nums = (def && def.strike) || {};
      const pose = poseAnglesFromNums(nums, poseAngles(isLoco ? 'idle' : 'slash'));
      drawStickCaster(ctx, canvas.width * 0.45, canvas.height * 0.72, pose, '#c8a060', 1);
    } else {
      clearCanvas(ctx, canvas.width, canvas.height);
      label(ctx, '此分区暂无画面预览', 16, 28);
      label(ctx, '可看下方人话短述', 16, 46);
    }
  }

  window.DesignerPreview = { render, stop };
})();
