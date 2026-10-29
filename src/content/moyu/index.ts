/**
 * 内容包「墨羽」— R3 远程素材示范 + ArrowProj2 伤害软挂（NOT a 门派）.
 *
 * 只登记：自建 AttackBox（墨羽伤）+ projectile（墨箭挂 attackKey）+ volley（慢雷）
 * + synth sfx 别名 + backdrop；符步骤 spawnVolley.volleyId / 弓兵 Behavior
 * rangedAttack.projectileId 软引用。
 * Load: `?pack=moyu` / `__pack.load('moyu')`.
 * 不扩 drawKind / VolleyStyle / theme；零核心解释器 diff.
 * 玩家存档 bump=否；内容包 version 见馆 pack.json。
 */
import { Context, Schema } from 'cordis';

export interface MoyuConfig {
  /** 慢雷弹幕单段伤害. */
  thunderDamage: number;
}

export const PackMoyu = {
  name: 'pack-moyu',
  inject: ['attacks', 'projectiles', 'volleys', 'sfx', 'backdrops', 'talismans', 'behaviors', 'enemies'],
  Config: Schema.object({
    thunderDamage: Schema.number().min(1).max(40).default(8).description('慢雷弹幕伤害'),
  }) as Schema<MoyuConfig>,
  apply(ctx: Context, config: MoyuConfig) {
    // ArrowProj2: 自建伤害盒（与核心 arrow dmg10/kbX3 可辨；命名错开飞行 id）
    ctx.attacks.add({
      id: 'moyu_ink_shot',
      name: 'moyu_ink_shot',
      startup: 0,
      active: 1,
      recovery: 0,
      box: { x: 0, y: 0, w: 0, h: 0 },
      damage: 16,
      kbX: 6,
      kbY: -1,
      hitstun: 20,
      hitstop: 6,
      shake: 4,
      parryable: true,
    });

    // R3+ArrowProj2: 自建箭种（飞行盒 + soft attackKey → 本包伤害盒）
    ctx.projectiles.add({
      id: 'moyu_ink_arrow',
      drawKind: 'arrow',
      hitW: 32,
      hitH: 10,
      life: 280,
      hitSfx: 'arrow',
      attackKey: 'moyu_ink_shot',
    });

    // R3: 自建弹幕模板（对齐 demo_slow_thunder / R1 slow_thunder）
    ctx.volleys.add({
      id: 'moyu_slow_thunder',
      style: 'thunder',
      defaultCount: 3,
      defaultInterval: 18,
      defaultSpread: 180,
      color: '#ffe080',
    });

    // 轻量 synth 别名
    ctx.sfx.add({
      id: 'moyu_ink_slash',
      synth: 'slash',
    });
    // R4b：file sfx 别名（仅路径；wav 已在 public/art/audio/，馆 tgz 不塞二进制）
    ctx.sfx.add({
      id: 'moyu_file_tap',
      src: './art/audio/r4a_smoke.wav',
      format: 'wav',
    });
    // R4c：第二示范 · 轻击 ogg（同静态目录；馆包仍不塞二进制）
    ctx.sfx.add({
      id: 'moyu_file_click',
      src: './art/audio/r4c_tap.ogg',
      format: 'ogg',
    });

    // 可选幕氛围（闭集 theme + tint；stages 可软引用 id）
    ctx.backdrops.add({
      id: 'moyu_eclipse_tint',
      theme: 'eclipse',
      skyTint: '#1a1028',
      label: '墨羽蚀月',
    });

    // 挂点：符步骤 spawnVolley → 本包 volley（看得见慢雷）
    ctx.talismans.script({
      id: 'moyuSlowThunder',
      steps: [
        { kind: 'banner', text: '灵符', sub: '墨羽慢雷', dur: 70 },
        { kind: 'sfx', id: 'moyu_ink_slash' },
        { kind: 'fx', preset: 'flare', at: 'caster', size: 48, color: '#ffe080' },
        {
          kind: 'spawnVolley',
          volleyId: 'moyu_slow_thunder',
          count: 3,
          interval: 18,
          damage: config.thunderDamage,
          spread: 180,
        },
        { kind: 'shake', amp: 3, frames: 6 },
        { kind: 'wait', frames: 12 },
      ],
    });
    ctx.talismans.add({
      id: 'moyufu',
      name: '墨羽符',
      fogName: '灵符·墨??',
      lore: '纸上凝墨羽，一挥慢雷自天降。箭羽与雷纹同源。',
      tip: '出征：慢雷三落 · 墨羽弹幕',
      color: '#ffe080',
      cost: { cinnabar: 1, silk: 1, bone: 1 },
      fee: 14,
      stockCap: 2,
      runCharges: 1,
      quality: 'huang',
      grade: 'zhong',
      scriptId: 'moyuSlowThunder',
      icon: 'H-05-tal-4',
    });

    // 挂点：弓兵 Behavior rangedAttack → 本包 projectile（看得见墨箭；伤走 attackKey）
    ctx.behaviors.add({
      id: 'moyu_ink_archer',
      body: 'archer',
      label: '墨羽试射',
      steps: [
        { kind: 'facePlayer' },
        { kind: 'keepDistance', idealMin: 260, idealMax: 460, chase: 700, retreatSpeed: 2.8 },
        {
          kind: 'rangedAttack',
          projectileId: 'moyu_ink_arrow',
          rangeMin: 190,
          rangeMax: 600,
          weight: 2.4,
          cooldown: 70,
          aimFrames: 38,
        },
        { kind: 'meleeAttack', attackKey: 'whip', rangeMin: 0, rangeMax: 76, weight: 2.0, cooldown: 40 },
      ],
    });
    ctx.enemies.add({
      id: 'moyu_archer',
      name: '墨羽弓手',
      body: 'archer',
      silhouetteId: 'archer',
      behaviorId: 'moyu_ink_archer',
      hp: 48,
      dropChance: 0.2,
      eliteEligible: true,
      loot: [
        { kind: 'material', id: 'silk', chance: 0.3, amount: 1 },
        { kind: 'crystal', chance: 0.15, amount: 2 },
      ],
    });
  },
};
