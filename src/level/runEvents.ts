/**
 * 局内事件：幕间三选一 / 邪气潮 / 据点 / 诅咒交易 / 临时符 / 精英进化.
 */
import type { Game } from '../game';
import { pickAffixForAct, primaryAffixPool, getAffix, type AffixId } from './affixes';
import { tryAddFragment, FRAGMENT_BY_ID, listFragments, type FragmentId } from '../meta/runFragments';
import { spawnLootBurst } from '../entities/pickup';
import { TALISMAN_BY_ID, type TalismanId } from '../meta/talismans';
import { makeEnemy } from '../entities/enemies/factory';
import { applyEliteMod, type EliteModId } from './eliteMods';
import { getTideClearLoot, getTideSpawn, getTempScribeCost } from '../meta/pluginConfig';
import { getEnemy, ENEMY_BY_ID } from '../entities/enemies/factory';
import { MATERIAL_BY_ID } from '../meta/materials';
import { WEAPON_BY_ID } from '../meta/weapons';

export type BetweenChoice =
  | { id: 'frag'; label: string; sub: string; frag: FragmentId }
  | { id: 'rerollAffix'; label: string; sub: string }
  | { id: 'gambleChest'; label: string; sub: string }
  | { id: 'hpForMats'; label: string; sub: string }
  | { id: 'curse'; label: string; sub: string };

export interface RunEventState {
  between: BetweenChoice[] | null;
  betweenPicked: boolean;
  tideT: number;
  tideActive: boolean;
  tideCleared: boolean;
  outpostX: number;
  outpostUsed: boolean;
  outpostOpen: boolean;
  evolvedQueue: Array<{ type: string; mod: EliteModId | null }>;
}

export function emptyRunEvents(actIndex: number): RunEventState {
  return {
    between: null,
    betweenPicked: false,
    tideT: 60 * (42 + actIndex * 8),
    tideActive: false,
    tideCleared: false,
    outpostX: 1500 + actIndex * 140,
    outpostUsed: false,
    outpostOpen: false,
    evolvedQueue: [],
  };
}

export function buildBetweenChoices(g: Game): BetweenChoice[] {
  const choices: BetweenChoice[] = [
    { id: 'frag', label: '拾取残页', sub: '随机心法残页', frag: pickSafeFrag(g) },
    { id: 'rerollAffix', label: '改写场地', sub: '重掷本幕词缀' },
    { id: 'gambleChest', label: '赌运宝匣', sub: '血晶换优质掉落' },
    { id: 'hpForMats', label: '血祭求材', sub: '扣 20% 生命换材料' },
    { id: 'curse', label: '诅咒交易', sub: '黑残页：强攻带伤' },
  ];
  const shuffled = choices.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function pickSafeFrag(g: Game): FragmentId {
  const exclude = new Set(g.fragments.active);
  const pool = listFragments().filter((f) => !f.eventOnly && !exclude.has(f.id)).map((f) => f.id);
  if (!pool.length) return listFragments().find((f) => !f.eventOnly)?.id ?? 'lieqi';
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function openBetweenActEvent(g: Game): void {
  g.runEvents.between = buildBetweenChoices(g);
  g.runEvents.betweenPicked = false;
  g.pausedForEvent = true;
  g.showBanner('幕间机缘', '1 / 2 / 3 选择', 100);
}

export function applyBetweenChoice(g: Game, index: number): void {
  const list = g.runEvents.between;
  if (!list || g.runEvents.betweenPicked) return;
  const c = list[index];
  if (!c) return;
  g.runEvents.betweenPicked = true;
  g.runEvents.between = null;
  g.pausedForEvent = false;

  if (c.id === 'frag') {
    const r = tryAddFragment(g.fragments, c.frag);
    if (r === 'added') g.showBanner('残页入手', FRAGMENT_BY_ID[c.frag]?.name ?? c.frag, 90);
    else g.texts.add(r === 'tag' ? '与已有残页相冲' : '残页已满', g.player.x, g.player.y - 110, '#c8a0a8', 14);
  } else if (c.id === 'rerollAffix') {
    const cur = g.stageAffix;
    const pool = primaryAffixPool().map((a) => a.id).filter((id) => id !== cur);
    const next = (pool[Math.floor(Math.random() * pool.length)] ?? pickAffixForAct(g.actIndex)) as AffixId;
    g.stageAffix = next;
    if (!g.knownAffixes.includes(g.stageAffix)) g.knownAffixes.push(g.stageAffix);
    g.toastAffix();
    g.showBanner('场地改写', getAffix(next)?.name ?? '', 90);
  } else if (c.id === 'gambleChest') {
    if (g.meta && g.meta.runCrystals >= 8) {
      g.meta.runCrystals -= 8;
      spawnLootBurst(g, g.player.x, g.player.y - 40, [
        { kind: 'material', materialId: 'yaohe' },
        { kind: 'material', materialId: 'xuaniron' },
        { kind: 'crystal', amount: 5 },
      ]);
      g.showBanner('赌运得利', '材料散落', 90);
    } else {
      g.texts.add('血晶不足', g.player.x, g.player.y - 100, '#ff90b0', 14);
    }
  } else if (c.id === 'hpForMats') {
    const cost = Math.max(1, Math.round(g.player.maxHp * 0.2));
    g.player.hp = Math.max(1, g.player.hp - cost);
    spawnLootBurst(g, g.player.x, g.player.y - 40, [
      { kind: 'material', materialId: 'iron', materialN: 2 },
      { kind: 'material', materialId: 'cinnabar' },
      { kind: 'material', materialId: 'bone' },
    ]);
    g.showBanner('血祭', '材料入手', 90);
  } else if (c.id === 'curse') {
    const r = tryAddFragment(g.fragments, 'heican');
    if (r === 'added') {
      g.pendingCurseCleanse = true;
      g.showBanner('诅咒交易', '黑残页生效', 100);
    } else {
      g.texts.add(r === 'tag' ? '诅咒相冲' : '无法接受', g.player.x, g.player.y - 110, '#a060ff', 14);
    }
  }
}

export function tickRunEvents(g: Game): void {
  const ev = g.runEvents;
  if (g.pausedForEvent) return;

  if (!ev.tideCleared && !ev.tideActive) {
    if (ev.tideT > 0) ev.tideT--;
    if (ev.tideT <= 0 && g.director.phase === 'roam') {
      ev.tideActive = true;
      g.showBanner('邪气潮', '亡潮涌起 · 肃清可获潮汐箱', 120);
      const sc = g.player.mods.enemyScale;
      const spawns = getTideSpawn();
      for (const s of spawns) {
        if (!getEnemy(s.enemyId) && !ENEMY_BY_ID[s.enemyId]) continue; // soft skip
        g.enemies.push(makeEnemy(s.enemyId as 'axe', g.player.x + s.dx, { scale: sc, eliteChance: s.eliteChance }));
      }
    }
  }
  if (ev.tideActive && g.enemies.length === 0 && g.director.phase === 'roam') {
    ev.tideActive = false;
    ev.tideCleared = true;
    g.showBanner('潮退', '潮汐箱开启', 100);
    {
      const items: import('../entities/pickup').PickupOpts[] = [];
      for (const e of getTideClearLoot()) {
        if (e.kind === 'crystal') {
          items.push({ kind: 'crystal', amount: e.amount ?? 1 });
        } else if (e.kind === 'material' && e.id) {
          if (!MATERIAL_BY_ID[e.id]) continue;
          items.push({ kind: 'material', materialId: e.id, materialN: e.amount });
        } else if (e.kind === 'blueprint' && e.id) {
          if (!WEAPON_BY_ID[e.id]) continue;
          items.push({ kind: 'blueprint', blueprintId: e.id });
        }
      }
      if (items.length) spawnLootBurst(g, g.player.x, g.player.y - 40, items);
    }
  }

  if (!ev.outpostUsed && Math.abs(g.player.x - ev.outpostX) < 48 && g.director.phase === 'roam') {
    ev.outpostOpen = true;
  }

  // Spawn evolved elites during arena
  if (ev.evolvedQueue.length && g.director.phase === 'arena' && g.enemies.length < 5) {
    spawnEvolved(g);
  }
}

export function useOutpost(g: Game, action: 'pill' | 'identify' | 'lore'): void {
  const ev = g.runEvents;
  if (ev.outpostUsed || !ev.outpostOpen) return;
  ev.outpostUsed = true;
  ev.outpostOpen = false;
  if (action === 'pill') {
    g.player.hp = Math.min(g.player.maxHp, g.player.hp + 25);
    g.showBanner('据点', '略作休整 · 生命回复', 90);
  } else if (action === 'identify') {
    g.showBanner('据点', '烛下辨物 · 回山门结算可鉴', 100);
    if (g.meta) g.meta.runCrystals += 2;
  } else {
    g.showBanner('残简', '「长夜未尽，安魂未歇……」', 110);
  }
}

/** Spend hub materials mid-run to scribe a temporary talisman. */
export function scribeTempTalisman(g: Game, id: TalismanId): string | true {
  if (!g.meta) return '尚未入门，无法绘符';
  const def = TALISMAN_BY_ID[id];
  if (!def) return '符箓未备';
  const mats = g.meta.data.materials;
  const cost = getTempScribeCost() ?? {};
  const need: string[] = [];
  for (const [mid, n] of Object.entries(cost)) {
    if (!MATERIAL_BY_ID[mid]) continue; // soft skip unknown mat
    if ((mats[mid] ?? 0) < (n ?? 0)) need.push(MATERIAL_BY_ID[mid].name);
  }
  if (need.length) return `材料不足（需${need.join('·')}）`;
  for (const [mid, n] of Object.entries(cost)) {
    if (!MATERIAL_BY_ID[mid]) continue;
    mats[mid] = (mats[mid] ?? 0) - (n ?? 0);
  }
  const slots = g.player.talismanSlots;
  let idx = slots.findIndex((s) => !s || s.n <= 0);
  if (idx < 0) idx = g.player.talismanIndex;
  slots[idx] = { id, n: 1 };
  g.player.talismanIndex = idx;
  g.tempTalismanScribed = true;
  g.showBanner('临时符', def.name, 90);
  return true;
}

export function queueEliteEvolve(g: Game, e: { kind: string; eliteMod: EliteModId | null }): void {
  if (!e.eliteMod) return;
  if (g.runEvents.evolvedQueue.length >= 2) return;
  g.runEvents.evolvedQueue.push({ type: e.kind, mod: e.eliteMod });
  g.texts.add('余烬未散…', g.player.x, g.player.y - 130, '#ff9060', 14);
}

export function spawnEvolved(g: Game): void {
  const q = g.runEvents.evolvedQueue;
  if (!q.length) return;
  const item = q.shift()!;
  const type = (item.type === 'shield' || item.type === 'archer' || item.type === 'spear' ? item.type : 'axe') as 'axe' | 'shield' | 'archer' | 'spear';
  const e = makeEnemy(type, g.player.x + 180, { scale: g.player.mods.enemyScale * 1.1, eliteChance: 1 });
  if (item.mod && !e.eliteMod) applyEliteMod(e, item.mod);
  e.scoreName = `${e.scoreName}·进化`;
  e.maxHp = Math.round(e.maxHp * 1.25);
  e.hp = e.maxHp;
  if (e.hasElitePoise) {
    e.poiseMax += 14;
    e.poise = e.poiseMax;
  }
  e.evolved = true;
  g.enemies.push(e);
  g.texts.add('精英进化!', e.x, e.y - 120, '#ff9060', 16, true);
  g.showBanner('精英进化', '余烬再燃', 70);
}
