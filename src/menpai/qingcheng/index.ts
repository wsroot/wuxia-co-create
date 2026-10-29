/**
 * 示例门派「青城」— skills / neigong only (the correct 门派 shape).
 *
 * Ships one passive 外功. Load with `?menpai=qingcheng` or
 * `__menpai.load('qingcheng')`.
 */
import { Context, Schema } from 'cordis';

export interface QingchengConfig {
  /** 化境 defBonus (rank 5). Lower ranks scale down. */
  defAtMax: number;
}

export const QingchengMenpai = {
  name: 'menpai-qingcheng',
  inject: ['skills'],
  Config: Schema.object({
    defAtMax: Schema.number().min(0.02).max(0.2).default(0.08).description('化境减伤'),
  }) as Schema<QingchengConfig>,
  apply(ctx: Context, config: QingchengConfig) {
    const d = config.defAtMax;
    ctx.skills.add({
      id: 'qingchengdun', name: '青城遁甲', fogName: '武学·城??',
      kind: 'passive', track: 'combat',
      lore: '青城山门护体之术，以气化甲，避锋芒。',
      tip: '被动减伤（习得后）',
      profHint: '格挡承伤 / 挨打存活',
      meditateCost: {}, fee: 0,
      quality: 'huang',
      effects: {
        defBonus: [d * 0.4, d * 0.55, d * 0.7, d * 0.85, d].map((x) => Math.round(x * 1000) / 1000),
      },
    });
  },
};
