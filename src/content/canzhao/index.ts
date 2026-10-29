/**
 * 示例内容包「残照」— 单项被动外功（NOT a 门派）.
 *
 * 只贡献一门被动外功。`?pack=canzhao` / `__pack.load('canzhao')`。
 */
import { Context, Schema } from 'cordis';

export interface CanzhaoConfig {
  /** 化境 defBonus（rank 5）。 */
  defAtMax: number;
}

export const PackCanzhao = {
  name: 'pack-canzhao',
  inject: ['skills'],
  Config: Schema.object({
    defAtMax: Schema.number().min(0.02).max(0.18).default(0.07).description('化境减伤'),
  }) as Schema<CanzhaoConfig>,
  apply(ctx: Context, config: CanzhaoConfig) {
    const d = config.defAtMax;
    ctx.skills.add({
      id: 'canzhaojue', name: '残照诀', fogName: '武学·照??',
      kind: 'passive', track: 'combat',
      lore: '残阳入骨，皮膜自固。刀剑之下犹存一缕余晖。',
      tip: '被动减伤（习得后）',
      profHint: '格挡承伤 / 挨打存活',
      meditateCost: {}, fee: 0,
      quality: 'huang',
      profOn: ['block', 'hitTaken'],
      effects: {
        defBonus: [d * 0.4, d * 0.55, d * 0.7, d * 0.85, d].map((x) => Math.round(x * 1000) / 1000),
      },
    });
  },
};
