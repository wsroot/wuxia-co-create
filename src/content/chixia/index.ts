/**
 * 示例内容包「赤霞」— talisman-only pack (NOT a 门派).
 *
 * A 门派 may only register skills + neigong. This pack adds a 灵符 and is
 * loaded via `?pack=chixia` / `__pack.load('chixia')`.
 *
 * Deprecated alias: `?menpai=chixia` still loads this pack once (see
 * src/content/index.ts + src/menpai/index.ts boot).
 */
import { Context, Schema } from 'cordis';

export interface ChixiaConfig {
  /** Damage of each flame burst. */
  damage: number;
  /** How many bursts per cast. */
  bursts: number;
}

export const PackChixia = {
  name: 'pack-chixia',
  inject: ['talismans'],
  Config: Schema.object({
    damage: Schema.number().min(1).max(60).default(18).description('每次烈焰的伤害'),
    bursts: Schema.natural().min(1).max(5).default(3).description('每次施放的烈焰次数'),
  }) as Schema<ChixiaConfig>,
  apply(ctx: Context, config: ChixiaConfig) {
    const burst = [
      { kind: 'hitstop', frames: 3 },
      { kind: 'fx', preset: 'fire', at: 'caster', n: 14, size: 12 },
      { kind: 'fx', preset: 'flare', at: 'caster', size: 60, color: '#ffb080' },
      { kind: 'fx', preset: 'ring', at: 'caster', size: 70, color: '#ff8050' },
      { kind: 'sfx', id: 'fire' },
      { kind: 'damageRadius', rx: 150, ry: 90, damage: config.damage, kbX: 4, kbY: -3, hitstun: 18 },
      { kind: 'shake', amp: 5, frames: 10 },
      { kind: 'wait', frames: 18 },
    ] as const;
    ctx.talismans.script({
      id: 'chixiaBurst',
      steps: [
        { kind: 'banner', text: '灵符', sub: '赤霞焚身', dur: 90 },
        { kind: 'flash', color: '#ff9060', a: 0.25 },
        ...Array.from({ length: config.bursts }, () => burst.map((s) => ({ ...s }))).flat(),
        { kind: 'wait', frames: 20 },
      ],
    });
    ctx.talismans.add({
      id: 'chixiafu', name: '赤霞符', fogName: '灵符·霞??',
      lore: '赤霞秘符，焚身成焰，近身者皆退。',
      tip: '出征：周身连爆烈焰 · 近身清场',
      color: '#ff8050', cost: { cinnabar: 2, coal: 2, herb: 1 }, fee: 20, stockCap: 3, runCharges: 1,
      quality: 'huang', grade: 'zhong',
      scriptId: 'chixiaBurst',
      icon: 'H-05-tal-2',
    });
  },
};
