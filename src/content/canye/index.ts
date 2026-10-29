/**
 * 内容包「残夜」— D5 设计台玩法副目录示范（NOT a 门派）.
 *
 * 只登记：自建精英薄铜变种 + 裂气残页变种 + 夜行套装调参。
 * 不改核心 id；数值可辨于 tongpi / lieqi / yexing。
 * Load: `?pack=canye` / `__pack.load('canye')`。
 * bump=否；馆种子见 dlc-server/packages/canye。
 */
import { Context, Schema } from 'cordis';

export interface CanyeConfig {
  /** 薄铜变种承伤倍率（核心 tongpi=0.62，更「薄」）. */
  tongpiDmgTakenMul: number;
}

export const PackCanye = {
  name: 'pack-canye',
  inject: ['eliteMods', 'fragments', 'armorSets'],
  Config: Schema.object({
    tongpiDmgTakenMul: Schema.number().min(0.5).max(1).default(0.78).description('残夜薄铜承伤倍率'),
  }) as Schema<CanyeConfig>,
  apply(ctx: Context, config: CanyeConfig) {
    // D1 瘦面同构：可不挂 weaponCounters
    ctx.eliteMods.add({
      id: 'canye_tongpi',
      name: '残夜薄铜',
      tag: '薄铜',
      color: '#c8a878',
      dmgTakenMul: config.tongpiDmgTakenMul,
    });

    ctx.fragments.add({
      id: 'canye_lieqi',
      name: '残夜裂气',
      fogName: '残页·??',
      desc: '外功伤害略升',
      color: '#ff9080',
      tag: 'qi',
      skillDmgMul: 1.12,
    });

    ctx.armorSets.add({
      id: 'canye_yexing',
      fogName: '套装·夜??',
      name: '残夜行影',
      lore: '残夜踏影，气机更轻。',
      slots: ['legs', 'arms', 'waist', 'neck'],
      weight: 10,
      two: { dashCdMul: 0.90, rage: 0.04 },
      full: { dashCdMul: 0.82, dashIframes: 4, rage: 0.06 },
      twoTip: '闪身冷却再短 · 气势微增',
      fullTip: '闪身更快 · 无敌略久 · 气势回复',
    });
  },
};
