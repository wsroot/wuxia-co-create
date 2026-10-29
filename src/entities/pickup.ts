import { GROUND_Y } from '../engine/constants';
import type { Game } from '../game';
import { drawGlow } from '../effects/glow';
import { playSfx } from '../audio/sfx';
import type { MaterialId } from '../meta/materials';
import { MATERIAL_BY_ID } from '../meta/materials';
import type { WeaponId } from '../meta/weapons';
import { WEAPON_BY_ID } from '../meta/weapons';
import type { GearItem } from '../meta/types';
import { QUALITY_COLOR, LOOT_TINT, MATERIAL_QUALITY } from '../meta/craft';
import { isRareQuality } from '../meta/taxonomy';
import { FRAGMENT_BY_ID, type FragmentId } from '../meta/runFragments';
import { TALISMAN_BY_ID } from '../meta/talismans';

/** World pickup payload. */
export type PickupKind = 'potion' | 'crystal' | 'material' | 'gear' | 'blueprint' | 'fragment';

export interface PickupOpts {
  kind?: PickupKind;
  heal?: number;
  amount?: number;
  materialId?: MaterialId;
  materialN?: number;
  gear?: GearItem;
  blueprintId?: WeaponId;
  fragmentId?: import('../meta/runFragments').FragmentId;
  /** Initial scatter velocity. */
  vx?: number;
  vy?: number;
}

/**
 * Ground loot / potion / crystal orb.
 * Materials, unidentified gear and blueprints scatter from corpses and bank on pickup.
 */
export class Potion {
  dead = false;
  vx = 0;
  vy = -6;
  y: number;
  t = 0;
  kind: PickupKind;
  heal: number;
  amount: number;
  materialId?: MaterialId;
  materialN: number;
  gear?: GearItem;
  blueprintId?: WeaponId;
  fragmentId?: FragmentId;
  /** Settled on floor (bob starts). */
  settled = false;
  /** Bounce count to stop jitter. */
  private bounces = 0;

  constructor(
    public x: number,
    y: number,
    healOrOpts: number | PickupOpts = 30,
    kind: PickupKind = 'potion',
    amount?: number,
  ) {
    this.y = y;
    // Legacy ctor: (x, y, heal, kind, amount)
    if (typeof healOrOpts === 'number') {
      this.heal = healOrOpts;
      this.kind = kind;
      this.amount = amount ?? healOrOpts;
      this.materialN = 1;
      return;
    }
    const o = healOrOpts;
    this.kind = o.kind ?? 'potion';
    this.heal = o.heal ?? 30;
    this.amount = o.amount ?? (this.kind === 'crystal' ? 3 : this.heal);
    this.materialId = o.materialId;
    this.materialN = o.materialN ?? 1;
    this.gear = o.gear;
    this.blueprintId = o.blueprintId;
    this.fragmentId = o.fragmentId;
    if (o.vx !== undefined) this.vx = o.vx;
    if (o.vy !== undefined) this.vy = o.vy;
  }

  tint(): string {
    switch (this.kind) {
      case 'potion': return LOOT_TINT.potion;
      case 'crystal': return LOOT_TINT.crystal;
      case 'blueprint': return LOOT_TINT.blueprint;
      case 'fragment': {
        const id = this.fragmentId;
        return id ? (FRAGMENT_BY_ID[id]?.color ?? '#d0a0ff') : '#d0a0ff';
      }
      case 'gear': return LOOT_TINT.unidentified;
      case 'material': {
        const id = this.materialId ?? 'iron';
        return QUALITY_COLOR[MATERIAL_QUALITY[id]];
      }
      default: return '#c8c8d0';
    }
  }

  label(): string {
    switch (this.kind) {
      case 'potion': return '血瓶';
      case 'crystal': return `血晶×${this.amount}`;
      case 'blueprint': {
        const n = this.blueprintId ? WEAPON_BY_ID[this.blueprintId]?.name : '?';
        return `图纸·${n}`;
      }
      case 'fragment': {
        // Fog until pickup (collect reveals)
        return '残页·??';
      }
      case 'gear': return '未鉴装备';
      case 'material': {
        const id = this.materialId ?? 'iron';
        const q = MATERIAL_QUALITY[id];
        const name = MATERIAL_BY_ID[id]?.name ?? id;
        const rare = isRareQuality(q) ? '稀' : '';
        return `${rare}${name}`;
      }
      default: return '';
    }
  }

  /** True if this pickup banks into run loot (vacuum on settle). */
  isLoot(): boolean {
    return this.kind === 'material' || this.kind === 'gear' || this.kind === 'blueprint' || this.kind === 'crystal';
  }

  /** Apply bank without proximity (vacuum / settle). */
  collect(g: Game, silent = false): void {
    if (this.dead) return;
    this.dead = true;
    const color = this.tint();
    if (this.kind === 'crystal') {
      if (g.meta) g.meta.runCrystals += this.amount;
      if (!silent) {
        g.texts.add(`+${this.amount} 血晶`, this.x, this.y - 30, color, 18);
        g.fx.flare(this.x, this.y, 40, color, 16);
        playSfx(g.audio, 'potion');
      }
      return;
    }
    if (this.kind === 'material' && this.materialId && g.meta) {
      g.meta.bankMaterial(this.materialId, this.materialN);
      const recipes = g.meta.discoverRecipesForMat(this.materialId);
      for (const pid of recipes) {
        const name = ({ heal: '回血丹', rage: '气势丹', atkIncense: '攻击香', qingxin: '清心散', baofa: '爆发丹', xuhang: '续航膏', jiekongdan: '解控丹', porendan: '破韧散', hutidan: '护体丹', jingzhou: '净咒散', baoqi: '暴气丸', yingbu: '影步散', xuming: '续命丹', pojia: '破甲散' } as Record<string, string>)[pid] ?? pid;
        g.showBanner('丹方领悟', name, 100);
      }
      const fus = g.meta.discoverTalismansForMat(this.materialId);
      for (const tid of fus) {
        g.showBanner('符咒领悟', TALISMAN_BY_ID[tid].name, 100);
      }
      if (!silent) {
        g.texts.add(this.label(), this.x, this.y - 30, color, 14);
        g.fx.flare(this.x, this.y, 36, color, 14);
        playSfx(g.audio, 'potion');
      }
      return;
    }
    if (this.kind === 'gear' && this.gear && g.meta) {
      g.meta.bankGearDrop(this.gear);
      if (!silent) {
        g.texts.add('未鉴装备', this.x, this.y - 30, color, 16);
        g.fx.flare(this.x, this.y, 44, color, 16);
        playSfx(g.audio, 'ui');
      }
      return;
    }
    if (this.kind === 'blueprint' && this.blueprintId && g.meta) {
      g.meta.bankBlueprint(this.blueprintId);
      const name = WEAPON_BY_ID[this.blueprintId]?.name ?? this.blueprintId;
      if (!silent) {
        g.showBanner('图纸入手', `${name}图纸`, 120);
        g.texts.add(`图纸·${name}`, this.x, this.y - 30, color, 18, true);
        g.fx.flare(this.x, this.y, 50, color, 18);
        playSfx(g.audio, 'ui');
      }
      return;
    }
    if (this.kind === 'fragment' && this.fragmentId) {
      if (silent) {
        // vacuum / TTL: run-only, discard
        return;
      }
      const r = g.tryPickupFragment(this.fragmentId);
      if (r === 'full') {
        // leave on ground so player can swap later (cap is 2)
        this.dead = false;
        return;
      }
      g.fx.flare(this.x, this.y, 48, color, 16);
      playSfx(g.audio, 'ui');
      return;
    }
    // potion
    const p = g.player;
    const amt = Math.min(this.heal, p.maxHp - p.hp);
    p.hp += amt;
    if (!silent) {
      g.texts.add(`+${this.heal}`, this.x, this.y - 30, '#ff6a7a', 22);
      g.fx.flare(this.x, this.y, 50, '#ff3050', 20);
      for (let i = 0; i < 12; i++) {
        g.fx.spawn({
          kind: 'ember',
          x: p.x + (Math.random() - 0.5) * 30,
          y: p.y - Math.random() * 80,
          vy: -1.5, life: 40, size: 2, color: '#ff5070', add: true,
        });
      }
      playSfx(g.audio, 'potion');
    }
  }

  update(g: Game): void {
    this.t++;
    const floor = platformFloor(g, this.x, this.y) - 14;

    // Physics: scatter → bounce → settle
    if (!this.settled) {
      this.vy += 0.45;
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.98;
      if (this.y >= floor) {
        this.y = floor;
        if (Math.abs(this.vy) > 1.2 && this.bounces < 3) {
          this.vy *= -0.45;
          this.vx *= 0.7;
          this.bounces++;
        } else {
          this.vy = 0;
          this.vx = 0;
          this.settled = true;
        }
      }
    } else if (this.y < floor) {
      this.vy += 0.4;
      this.y = Math.min(floor, this.y + this.vy);
    }

    const p = g.player;
    // Delay pickup briefly so burst is visible
    const ready = this.t > (this.isLoot() ? 28 : 20);
    if (ready && !p.dead && Math.abs(p.x - this.x) < 34 && Math.abs(p.y - 30 - this.y) < 62) {
      this.collect(g, false);
      return;
    }
    // TTL: potions/crystals 30s; loot 90s then vacuum silently if meta present
    const ttl = this.isLoot() ? 60 * 90 : 60 * 30;
    if (this.t > ttl) {
      if (this.isLoot() && g.meta) this.collect(g, true);
      else this.dead = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    const bob = this.settled ? Math.sin(t * 0.08 + this.x * 0.01) * 3 : 0;
    const y = this.y + bob;
    const color = this.tint();

    if (this.kind === 'crystal') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, this.x, y, 26, color, 0.55 + Math.sin(t * 0.15) * 0.2);
      ctx.restore();
      ctx.save();
      ctx.translate(this.x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ff6a8a';
      ctx.strokeStyle = '#ffe0e8';
      ctx.lineWidth = 1.2;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeRect(-6, -6, 12, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(-4, -4, 4, 4);
      ctx.restore();
      return;
    }

    if (this.kind === 'potion') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, this.x, y, 30, '#ff2040', 0.5 + Math.sin(t * 0.1) * 0.2);
      ctx.restore();
      ctx.fillStyle = '#2a1820';
      ctx.fillRect(this.x - 2.5, y - 16, 5, 5);
      ctx.fillStyle = '#c8b090';
      ctx.fillRect(this.x - 3, y - 18, 6, 3);
      ctx.fillStyle = '#8a0a20';
      ctx.strokeStyle = '#e8d8e0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(this.x - 3, y - 11);
      ctx.quadraticCurveTo(this.x - 11, y - 4, this.x - 8, y + 4);
      ctx.quadraticCurveTo(this.x, y + 9, this.x + 8, y + 4);
      ctx.quadraticCurveTo(this.x + 11, y - 4, this.x + 3, y - 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,200,210,0.7)';
      ctx.fillRect(this.x - 5, y - 4, 2, 5);
      return;
    }

    // Loot gem / bag silhouette with quality glow
    const glowR = this.kind === 'gear' ? 32 : this.kind === 'blueprint' || this.kind === 'fragment' ? 30 : 24;
    const pulse = 0.45 + Math.sin(t * 0.12 + this.x) * 0.2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, this.x, y, glowR, color, pulse);
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, y);
    if (this.kind === 'fragment') {
      // torn heart-method page
      ctx.fillStyle = '#2a1830';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(7, -9);
      ctx.lineTo(8, 8);
      ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(-3, -3, 7, 1.2);
      ctx.fillRect(-3, 1, 5, 1.2);
      ctx.restore();
      return;
    }
    if (this.kind === 'blueprint') {
      // scroll
      ctx.fillStyle = color;
      ctx.strokeStyle = '#fff8e0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.rect(-7, -9, 14, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(40,20,0,0.55)';
      ctx.fillRect(-4, -5, 8, 1.5);
      ctx.fillRect(-4, -1, 8, 1.5);
      ctx.fillRect(-4, 3, 5, 1.5);
    } else if (this.kind === 'gear') {
      // mystery bag
      ctx.fillStyle = '#2a1838';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, 2);
      ctx.quadraticCurveTo(-10, -6, 0, -10);
      ctx.quadraticCurveTo(10, -6, 8, 2);
      ctx.quadraticCurveTo(0, 8, -8, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // material gem
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = 1.1;
      const s = this.materialId === 'yaohe' || this.materialId === 'xuaniron' || this.materialId === 'spiritjade' ? 7 : 5.5;
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.strokeRect(-s, -s, s * 2, s * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(-s + 1, -s + 1, s * 0.7, s * 0.7);
    }
    ctx.restore();
  }
}

/** Burst loot outward from a corpse (Diablo-style scatter). */
export function spawnLootBurst(g: Game, x: number, y: number, items: PickupOpts[]): void {
  const n = items.length;
  for (let i = 0; i < n; i++) {
    const spread = (i - (n - 1) / 2) * 0.55 + (Math.random() - 0.5) * 0.5;
    const speed = 2.8 + Math.random() * 4.5;
    const opts: PickupOpts = {
      ...items[i],
      vx: Math.sin(spread) * speed + (Math.random() - 0.5) * 1.5,
      vy: -5.5 - Math.random() * 5,
    };
    g.pickups.push(new Potion(x + (Math.random() - 0.5) * 8, y - 20 - Math.random() * 10, opts));
  }
}

/** Vacuum remaining loot pickups into the run bag (arena exit / death / victory). */
export function vacuumLoot(g: Game): void {
  for (const p of g.pickups) {
    if (!p.dead && p.isLoot()) p.collect(g, true);
  }
}

function platformFloor(g: Game, x: number, y: number): number {
  let best = GROUND_Y;
  for (const pl of g.platforms) {
    if (x < pl.x || x > pl.x + pl.w) continue;
    if (y <= pl.y + 8 && pl.y < best) best = pl.y;
  }
  return best;
}
