/**
 * 内容包「新钟」— Act3 幕池示范（NOT a 门派）.
 *
 * 只登记：第 0 幕 ActPool（开幕 Lore + 闪步精英偏）± 一条 betweenActs 幕间字幕。
 * 不改 stages 几何/波次；不挂敌人/符/丹；零核心解释器 diff。
 * Load: `?pack=xinzhong` / `__pack.load('xinzhong')`。
 * bump=否；馆种子见 dlc-server/packages/xinzhong。
 */
import { Context, Schema } from 'cordis';

export interface XinzhongConfig {
  /** 第 0 幕闪步精英相对权重（可辨于核心 shanbu=1）。 */
  shanbuWeight: number;
}

export const PackXinzhong = {
  name: 'pack-xinzhong',
  inject: ['acts'],
  Config: Schema.object({
    shanbuWeight: Schema.number().min(1).max(20).default(8).description('第 0 幕闪步精英权重'),
  }) as Schema<XinzhongConfig>,
  apply(ctx: Context, config: XinzhongConfig) {
    // 只盖第 0 幕整幕默认：Lore 可辨 + 闪步偏重；kit/tint/lean 对齐长夜核心
    ctx.acts.pool(0, {
      kit: 'stone',
      tint: 'jade',
      eliteWeights: {
        tongpi: 1,
        zhongji: 1,
        shanbu: config.shanbuWeight,
        fanshang: 1,
        shixue: 1,
        xiehuo: 1,
      },
      dropLean: ['iron', 'bone', 'hide'],
      blueprintLean: ['silver', 'thorn', 'softsword', 'clawglove'],
      setLean: ['tiegu', 'qingxinding', 'yingzhi'],
      loreLine: '新钟初鸣，山门石兽侧耳。闪步客影偏多。',
    });
    // 可选：换第 0→1 幕间字幕（when 锁 betweenActs；场内 when 仍走 stages）
    ctx.acts.beat(0, {
      id: 'betweenActs.xinzhong.1to2',
      when: 'betweenActs',
      title: '钟声未歇…',
      subtitle: '雨巷灯火，闪步客影交错',
      holdFrames: 160,
      slowmo: 0.5,
    });
  },
};
