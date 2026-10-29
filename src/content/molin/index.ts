/**
 * 示例内容包「墨鳞」— 单项丹药（NOT a 门派）.
 *
 * 只贡献一颗可出征丹药。`?pack=molin` / `__pack.load('molin')`。
 */
import { Context, Schema } from 'cordis';

export interface MolinConfig {
  /** 护体减伤持续（秒）。 */
  defSec: number;
}

export const PackMolin = {
  name: 'pack-molin',
  inject: ['pills'],
  Config: Schema.object({
    defSec: Schema.number().min(4).max(40).default(14).description('墨鳞护体秒数'),
  }) as Schema<MolinConfig>,
  apply(ctx: Context, config: MolinConfig) {
    ctx.pills.add({
      id: 'molindan', name: '墨鳞丹',
      lore: '墨色鳞光入腹，皮膜如甲，刀剑暂难近身。',
      tip: `出征：${config.defSec} 秒减伤护体 · 内力微回`,
      cost: { herb: 3, cinnabar: 1, hide: 1 }, fee: 15, carryCap: 3,
      sortie: true,
      quality: 'huang', grade: 'zhong',
      effect: {
        defBuffSec: config.defSec,
        defBuffMax: true,
        neili: 20,
        floatText: '墨鳞丹',
        floatColor: '#6a8a9a',
        sfx: 'potion',
        castFeel: { hitstop: 4, shake: { amp: 2, frames: 6 }, flash: { color: '#6a8a9a', a: 0.2 } },
        whileActive: { auraPreset: 'tint', color: '#6a8a9a', period: 22, hudTint: '#6a8a9a', rimGlow: true },
      },
    });
  },
};
