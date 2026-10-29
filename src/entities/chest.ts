import { GROUND_Y } from '../engine/constants';
import type { Game } from '../game';
import { drawGlow } from '../effects/glow';
import { playSfx } from '../audio/sfx';
import { QUALITY_COLOR, QUALITY_NAME, type InherentQuality } from '../meta/craft';
import {
  CHEST_QUALITY_WEIGHTS, qualityRank, isRareQuality, rollWeightedQuality,
} from '../meta/taxonomy';
import { rollMaterials, type MaterialId } from '../meta/materials';
import { spawnLootBurst, type PickupOpts } from './pickup';
import { unknownBlueprintPool, WEAPON_BY_ID, type WeaponId } from '../meta/weapons';
import { getBossChestGuaranteeBp } from '../meta/pluginConfig';

export function rollChestQuality(): InherentQuality {
  return rollWeightedQuality(CHEST_QUALITY_WEIGHTS);
}

/**
 * Roll 2–4 chest qualities; guarantee at least one ≥ 玄.
 */
export function rollBossChestQualities(count?: number): InherentQuality[] {
  const n = count ?? 2 + Math.floor(Math.random() * 3); // 2–4
  const qs: InherentQuality[] = [];
  for (let i = 0; i < n; i++) qs.push(rollChestQuality());
  if (!qs.some((q) => qualityRank(q) >= 3)) {
    const idx = Math.floor(Math.random() * qs.length);
    qs[idx] = Math.random() < 0.3 ? 'di' : 'xuan';
  }
  return qs;
}

/** Build Diablo-style burst contents for a chest of given quality. */
export function buildChestLoot(
  g: Game,
  quality: InherentQuality,
  opts: { guaranteeBell?: boolean; guaranteeBlueprintId?: string } = {},
): PickupOpts[] {
  const items: PickupOpts[] = [];
  const rareLean = isRareQuality(quality);
  const rank = qualityRank(quality);

  // Material count scales with quality rank
  const matN =
    rank <= 0 ? 2
    : rank === 1 ? 2 + (Math.random() < 0.4 ? 1 : 0)
    : rank === 2 ? 3 + (Math.random() < 0.5 ? 1 : 0)
    : rank === 3 ? 4 + (Math.random() < 0.5 ? 1 : 0)
    : rank === 4 ? 5 + Math.floor(Math.random() * 2)
    : 6 + Math.floor(Math.random() * 3);

  const mats = rollMaterials(matN, rareLean);
  if (quality === 'tian' || quality === 'di') {
    forceRareMat(mats, 'yaohe');
    forceRareMat(mats, Math.random() < 0.5 ? 'xuaniron' : 'spiritjade');
  } else if (quality === 'xuan' && Math.random() < 0.55) {
    forceRareMat(mats, Math.random() < 0.5 ? 'xuaniron' : 'spiritjade');
  }
  for (const id of mats) {
    items.push({ kind: 'material', materialId: id, materialN: 1 });
  }

  const crystalChance = ({ lie: 0.2, fan: 0.35, huang: 0.55, xuan: 0.75, di: 0.95, tian: 1 } as const)[quality];
  if (Math.random() < crystalChance) {
    const amt =
      quality === 'lie' ? 2 + Math.floor(Math.random() * 2)
      : quality === 'fan' ? 3 + Math.floor(Math.random() * 3)
      : quality === 'huang' ? 5 + Math.floor(Math.random() * 4)
      : quality === 'xuan' ? 8 + Math.floor(Math.random() * 5)
      : quality === 'di' ? 12 + Math.floor(Math.random() * 8)
      : 16 + Math.floor(Math.random() * 10);
    items.push({ kind: 'crystal', amount: amt });
  }

  const gearChance = ({ lie: 0.06, fan: 0.12, huang: 0.28, xuan: 0.55, di: 0.85, tian: 0.95 } as const)[quality];
  if (g.meta && Math.random() < gearChance) {
    items.push({ kind: 'gear', gear: g.meta.rollUnidentifiedDrop(rareLean, g.actIndex) });
  }
  if (g.meta && (quality === 'di' || quality === 'tian') && Math.random() < 0.45) {
    items.push({ kind: 'gear', gear: g.meta.rollUnidentifiedDrop(true, g.actIndex) });
  }

  const bpChance = ({ lie: 0.02, fan: 0.04, huang: 0.1, xuan: 0.22, di: 0.4, tian: 0.55 } as const)[quality];
  if (g.meta && Math.random() < bpChance) {
    const bp = pickUnknownBlueprint(g, quality === 'di' || quality === 'tian');
    if (bp) items.push({ kind: 'blueprint', blueprintId: bp });
  }

  const guaranteeId = opts.guaranteeBlueprintId ?? getBossChestGuaranteeBp();
  if (guaranteeId && g.meta && WEAPON_BY_ID[guaranteeId] && !g.meta.knowsBlueprint(guaranteeId)) {
    if (!items.some((it) => it.kind === 'blueprint' && it.blueprintId === guaranteeId)) {
      items.push({ kind: 'blueprint', blueprintId: guaranteeId });
    }
  }

  return items;
}

function forceRareMat(mats: MaterialId[], id: MaterialId): void {
  if (mats.includes(id)) return;
  if (mats.length) mats[Math.floor(Math.random() * mats.length)] = id;
  else mats.push(id);
}

function pickUnknownBlueprint(g: Game, preferBossClear: boolean): WeaponId | undefined {
  if (!g.meta) return undefined;
  const pool = unknownBlueprintPool((id) => g.meta!.knowsBlueprint(id));
  if (!pool.length) return undefined;
  const bossClear = pool.filter((id) => WEAPON_BY_ID[id]?.unlock.type === 'bossClear');
  if (preferBossClear && bossClear.length) return bossClear[Math.floor(Math.random() * bossClear.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * World chest: closed → player walks near → opens once → spawnLootBurst → husk.
 */
export class Chest {
  opened = false;
  /** Remove after husk fades (optional). */
  dead = false;
  openAnim = 0;
  /** Soft blueprint id to inject on open if unknown (from menpai config). */
  guaranteeBlueprintId: string | null = null;
  /** @deprecated use guaranteeBlueprintId */
  guaranteeBell = false;
  private bobPhase: number;

  constructor(
    public x: number,
    public y: number,
    public quality: InherentQuality,
  ) {
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  /** Force-open (safety timeout) — burst then mark opened. */
  forceOpen(g: Game): void {
    if (this.opened || this.dead) return;
    this.open(g);
  }

  open(g: Game): void {
    if (this.opened || this.dead) return;
    this.opened = true;
    this.openAnim = 1;
    const gid = this.guaranteeBlueprintId ?? (this.guaranteeBell ? getBossChestGuaranteeBp() : null);
    const loot = buildChestLoot(g, this.quality, { guaranteeBlueprintId: gid ?? undefined });
    spawnLootBurst(g, this.x, this.y - 10, loot);
    const tint = QUALITY_COLOR[this.quality];
    g.texts.add(`${QUALITY_NAME[this.quality]}·宝箱`, this.x, this.y - 50, tint, 16, true);
    g.fx.flare(this.x, this.y - 20, 70, tint, 18);
    g.fx.ring(this.x, this.y - 20, 50, tint, 14);
    playSfx(g.audio, 'ui');
    playSfx(g.audio, 'potion');
  }

  update(g: Game): void {
    if (this.dead) return;
    if (this.opened) {
      if (this.openAnim < 20) this.openAnim++;
      return;
    }
    const p = g.player;
    if (p.dead) return;
    if (Math.abs(p.x - this.x) < 42 && Math.abs(p.y - 20 - this.y) < 70) {
      this.open(g);
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    const tint = QUALITY_COLOR[this.quality];
    const bob = this.opened ? 0 : Math.sin(t * 0.07 + this.bobPhase) * 2;
    const y = this.y + bob;

    ctx.save();
    if (!this.opened) {
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, this.x, y - 18, 36, tint, 0.4 + Math.sin(t * 0.1 + this.bobPhase) * 0.15);
      ctx.restore();
      ctx.save();
    }

    const lidLift = this.opened ? Math.min(1, this.openAnim / 8) * 10 : 0;
    ctx.translate(this.x, y);

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.opened ? '#3a2a18' : '#4a3020';
    ctx.strokeStyle = tint;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-16, -22, 32, 24, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = tint;
    ctx.globalAlpha = this.opened ? 0.45 : 0.85;
    ctx.fillRect(-16, -12, 32, 3);
    ctx.globalAlpha = 1;

    ctx.fillStyle = this.opened ? '#2a1c10' : '#5a3a24';
    ctx.strokeStyle = tint;
    ctx.beginPath();
    if (this.opened) {
      ctx.save();
      ctx.translate(0, -22 - lidLift * 0.3);
      ctx.rotate(-0.7);
      ctx.roundRect(-16, -10, 32, 12, 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.roundRect(-17, -30, 34, 12, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.arc(0, -18, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(-1, -19, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * Spawn 2–4 colored chests around a world point (boss corpse).
 * Guarantees 葬钟图纸 on the best chest if the player does not know it yet.
 */
export function spawnBossChests(g: Game, cx: number, cy: number): Chest[] {
  const qualities = rollBossChestQualities();
  const n = qualities.length;
  const chests: Chest[] = [];
  const baseY = Math.min(cy, GROUND_Y);
  for (let i = 0; i < n; i++) {
    const spread = (i - (n - 1) / 2) * 78;
    const x = cx + spread + (Math.random() - 0.5) * 16;
    const chest = new Chest(x, baseY, qualities[i]);
    chests.push(chest);
    g.chests.push(chest);
  }
  const gBp = getBossChestGuaranteeBp();
  if (gBp && g.meta && WEAPON_BY_ID[gBp] && !g.meta.knowsBlueprint(gBp) && chests.length) {
    let best = chests[0];
    for (const c of chests) {
      if (qualityRank(c.quality) > qualityRank(best.quality)) best = c;
    }
    best.guaranteeBlueprintId = gBp;
  }
  return chests;
}
