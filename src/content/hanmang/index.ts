/**
 * 示例内容包「寒芒」— 单项攻击符（NOT a 门派）.
 *
 * 只贡献一枚灵符 + 其数据剧本。`?pack=hanmang` / `__pack.load('hanmang')`。
 */
import { Context, Schema } from 'cordis';

export interface HanmangConfig {
  /** 寒刃锥形伤害。 */
  damage: number;
}

export const PackHanmang = {
  name: 'pack-hanmang',
  inject: ['talismans'],
  Config: Schema.object({
    damage: Schema.number().min(1).max(80).default(22).description('寒刃伤害'),
  }) as Schema<HanmangConfig>,
  apply(ctx: Context, config: HanmangConfig) {
    ctx.talismans.script({
      id: 'hanmangSlash',
      steps: [
        { kind: 'banner', text: '灵符', sub: '寒芒一斩', dur: 80 },
        { kind: 'flash', color: '#a8d8ff', a: 0.28 },
        { kind: 'hitstop', frames: 5 },
        { kind: 'sfx', id: 'slash' },
        { kind: 'fx', preset: 'flare', at: 'caster', size: 70, color: '#c0e0ff' },
        { kind: 'fx', preset: 'swordQi', at: 'caster', size: 90, color: '#90c8ff', n: 10 },
        { kind: 'fx', preset: 'qi', at: 'caster', n: 8, color: '#a8d8ff' },
        { kind: 'damageCone', reach: 170, halfH: 54, damage: config.damage, kbX: 7, kbY: -2, hitstun: 14, heavy: true },
        { kind: 'shake', amp: 4, frames: 8 },
        { kind: 'wait', frames: 16 },
      ],
    });
    ctx.talismans.add({
      id: 'hanmangfu', name: '寒芒符', fogName: '灵符·寒??',
      lore: '纸上凝霜，一挥成芒。寒刃出鞘，近前锋锐尽摧。',
      tip: '出征：身前寒刃锥击 · 破势推敌',
      color: '#90c8ff', cost: { cinnabar: 2, silk: 1, bone: 1 }, fee: 16, stockCap: 3, runCharges: 1,
      quality: 'huang', grade: 'zhong',
      scriptId: 'hanmangSlash',
      icon: 'H-05-tal-1',
    });
  },
};
