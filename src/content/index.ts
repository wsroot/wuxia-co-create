/**
 * Optional 内容包 boot (`?pack=chixia`). Official catalogs live in 官方大包
 * `changye` (`src/content/changye`；Cordis id `changye`；always-on via
 * `bootMenpai` → `bootOfficialPack()`). **勿**把 `changye` 塞进 OPTIONAL_PACKS。
 *
 * 单项内容包（符 / 丹 / 外功）走此处；大门派合集走 `src/menpai/`。
 */
import type { ForkScope } from 'cordis';
import { game } from '../plugins/root';
import { PackChixia } from './chixia';
import { PackHanmang } from './hanmang';
import { PackMolin } from './molin';
import { PackCanzhao } from './canzhao';
import { PackQiangying } from './qiangying';
import { PackShixiang } from './shixiang';
import { PackBingren } from './bingren';
import { PackMoyu } from './moyu';
import { PackXinzhong } from './xinzhong';
import { PackCanye } from './canye';

/** Store-facing display meta (江湖口吻，无技术词). */
export interface PackMeta {
  name: string;
  lore: string;
}

/** Optional 内容包 that can be switched on by name. */
export const OPTIONAL_PACKS: Record<string, { plugin: any; config?: unknown; meta: PackMeta }> = {
  chixia: {
    plugin: PackChixia,
    meta: {
      name: '赤霞',
      lore: '赤霞秘符一脉，焚身成焰，近身者皆退。',
    },
  },
  hanmang: {
    plugin: PackHanmang,
    meta: {
      name: '寒芒',
      lore: '纸上凝霜，一枚寒芒符：身前寒刃锥击。',
    },
  },
  molin: {
    plugin: PackMolin,
    meta: {
      name: '墨鳞',
      lore: '墨色鳞光一丹：入腹护体，刀剑暂难近身。',
    },
  },
  canzhao: {
    plugin: PackCanzhao,
    meta: {
      name: '残照',
      lore: '残阳入骨一门外功：皮膜自固，余晖护身。',
    },
  },
  qiangying: {
    plugin: PackQiangying,
    meta: {
      name: '枪影',
      lore: '雨巷枪影一脉：中距突刺杂兵入第一幕浪次。',
    },
  },
  shixiang: {
    plugin: PackShixiang,
    meta: {
      name: '石像夜巡',
      lore: '古刹石醒一脉：夜巡石俑入第一幕；石像镇廊，胸口石甲护体，巡廊空档偶吐突刺。',
    },
  },
  bingren: {
    plugin: PackBingren,
    meta: {
      name: '残锋',
      lore: '缺刃亦能成芒：残锋弯刀一柄，残锋诀一招，斩芒全时间轴起手→击发→收招，自带冷芒配方；启卷后站姿微倾，残锋闲影自显。',
    },
  },
  moyu: {
    plugin: PackMoyu,
    meta: {
      name: '墨羽',
      lore: '纸上凝墨羽：自建墨箭挂自建伤害盒，慢雷弹幕，墨羽符一挥慢雷自天降。',
    },
  },
  xinzhong: {
    plugin: PackXinzhong,
    meta: {
      name: '新钟',
      lore: '山门新钟一响：第一幕开幕换句，闪步精英更偏。',
    },
  },
  canye: {
    plugin: PackCanye,
    meta: {
      name: '残夜',
      lore: '残夜一脉：自建薄铜精英、裂气残页、夜行套装调参。',
    },
  },
};

const loaded = new Map<string, ForkScope>();

export function loadPack(name: string, config?: unknown): boolean {
  if (loaded.has(name)) return true;
  const entry = OPTIONAL_PACKS[name];
  if (!entry) {
    game.logger('content').warn(`未知内容包：${name}`);
    return false;
  }
  const cfg = config ?? entry.config;
  try {
    entry.plugin.Config?.(cfg);
  } catch (e) {
    game.logger('content').warn(`内容包 ${name} 配置无效，未加载：${(e as Error).message}`);
    return false;
  }
  loaded.set(name, game.plugin(entry.plugin, cfg));
  return true;
}

export function unloadPack(name: string): boolean {
  const fork = loaded.get(name);
  if (!fork) return false;
  fork.dispose();
  loaded.delete(name);
  return true;
}

/** No-op for official content (changye via bootOfficialPack). Kept for API compat. */
export function bootContent(): void {
  /* official catalogs: changye via bootOfficialPack → bootMenpaiOnly */
}

export function packFromUrl(search: string): string[] {
  const v = new URLSearchParams(search).get('pack');
  return v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

/** True if `name` is a known optional content pack. */
export function isOptionalPack(name: string): boolean {
  return name in OPTIONAL_PACKS;
}

/** Live: whether an optional pack is currently loaded. */
export function isPackLoaded(name: string): boolean {
  return loaded.has(name);
}

/** Live ids of loaded optional packs. */
export function listLoadedPacks(): string[] {
  return [...loaded.keys()];
}

export interface PackCatalogEntry {
  id: string;
  name: string;
  lore: string;
  enabled: boolean;
}

/** Optional packs for the DLC 商店 (display name + 简介 + 启用态). */
export function listPackCatalog(): PackCatalogEntry[] {
  return Object.entries(OPTIONAL_PACKS).map(([id, e]) => ({
    id,
    name: e.meta.name,
    lore: e.meta.lore,
    enabled: loaded.has(id),
  }));
}
