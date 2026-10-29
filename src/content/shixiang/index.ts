/**
 * 内容包「石像夜巡」— 无 body 组装键示范：Boss 石像 + 夜巡石俑杂兵改写第一幕。
 *
 * Load: `?pack=shixiang` / `__pack.load('shixiang')`.
 * 自建 bossMoves（slam 别名 + Dfr4 dive/fireball/roar soft 三招）；不扩 BehaviorStep / BossMove kind；不实现 perch/takeoff。
 * BossLoad3：isBoss 挂 gear（夜巡石甲）+ skill（核心突刺）——装配可见 HP/承伤；idle/walk 空档可施放。
 * BossSil3：isBoss 挂自建 silhouette（灰石 palette/scale + 面纹/甲/饰/云披）——drawGargoyle 可读，可辨于核心 jade。
 * Gsm5：isBoss 挂自建 behavior（非空 loco steps）——idle/walk 空档吃积木；CORE gargoyle 仍无 steps；高风险招仍壳。
 * Dfr4：kit 挂 shixiang_roar/fireball/dive_swift（soft 可辨于 CORE omit）；CORE roar/dive/fireball 行仍 omit soft。
 */
import { Context, Schema } from 'cordis';
import type { StageDef } from '../../level/stage';

export interface ShixiangConfig {
  /** Boss「石像夜巡」底气血. */
  bossHp: number;
  /** 杂兵「夜巡石俑」底气血. */
  yongHp: number;
  /** 夜巡石甲加气血（Boss 负载示范）. */
  yejiaHp: number;
  /** 夜巡石甲防%（Boss 负载示范）. */
  yejiaDef: number;
}

function withShixiangNight(base: StageDef): StageDef {
  const stage: StageDef = JSON.parse(JSON.stringify(base));
  stage.title = '第一幕 · 石像夜巡';
  stage.subtitle = '古刹灯灭，石瞳睁开';
  // Arena 0 山门古道 — 石俑混入
  stage.arenas[0]!.waves = [
    [
      { type: 'shixiang_yong', side: 'R', delay: 0 },
      { type: 'axe', side: 'L', delay: 50 },
    ],
    [
      { type: 'shixiang_yong', side: 'R', delay: 0 },
      { type: 'archer', side: 'R', delay: 35 },
      { type: 'shixiang_yong', side: 'L', delay: 70 },
    ],
  ];
  // Arena 1 竹林栈道
  stage.arenas[1]!.waves = [
    [
      { type: 'shield', side: 'R', delay: 0 },
      { type: 'shixiang_yong', side: 'L', delay: 40 },
    ],
    [
      { type: 'shixiang_yong', side: 'R', delay: 0 },
      { type: 'archer', side: 'L', delay: 20 },
      { type: 'axe', side: 'R', delay: 55 },
    ],
  ];
  // Arena 2 古刹前殿
  stage.arenas[2]!.waves = [
    [
      { type: 'shield', side: 'L', delay: 0 },
      { type: 'shixiang_yong', side: 'R', delay: 30 },
    ],
    [
      { type: 'shixiang_yong', side: 'R', delay: 0 },
      { type: 'archer', side: 'L', delay: 20 },
      { type: 'archer', side: 'R', delay: 40 },
      { type: 'shixiang_yong', side: 'L', delay: 80 },
    ],
  ];
  stage.boss = {
    ...stage.boss,
    bossName: '石像夜巡',
    bossSubtitle: '夜深石醒 · 巡廊不歇',
    bossId: 'shixiang_yexun',
    tint: 'ash',
    // G3: stage.boss.kit 优先于 actPool.kit，进战真正吃夜巡权重
    kit: 'shixiang_yexun',
  };
  if (stage.beats[0]) {
    stage.beats[0].title = '第一幕 · 石像夜巡';
    stage.beats[0].subtitle = '灯灭寺门，石影先动';
  }
  if (stage.beats[1]) {
    stage.beats[1].subtitle = '竹影间，石步沉沉';
  }
  if (stage.beats[2]) {
    stage.beats[2].subtitle = '前殿无灯，石瞳似睁';
  }
  if (stage.beats[3]) {
    stage.beats[3].subtitle = '巡廊尽头，石像已候';
  }
  if (stage.beats[4]) {
    stage.beats[4].title = '石像夜巡';
    stage.beats[4].subtitle = '夜深石醒 · 巡廊不歇';
  }
  if (stage.beats[5]) {
    stage.beats[5].title = '石像崩落';
    stage.beats[5].subtitle = '第一幕终 · 尘灰未定…';
  }
  return stage;
}

export const PackShixiang = {
  name: 'pack-shixiang',
  inject: ['enemies', 'stages', 'silhouettes', 'colliders', 'bossMoves', 'bossKits', 'armorPieces', 'behaviors'],
  Config: Schema.object({
    bossHp: Schema.natural().min(400).max(2000).default(900).description('石像夜巡气血'),
    yongHp: Schema.natural().min(40).max(150).default(72).description('夜巡石俑气血'),
    yejiaHp: Schema.natural().min(10).max(120).default(40).description('夜巡石甲加气血'),
    yejiaDef: Schema.number().min(1).max(20).default(8).description('夜巡石甲防%'),
  }) as Schema<ShixiangConfig>,
  apply(ctx: Context, config: ShixiangConfig) {
    // 自建碰撞盒（与官方 gargoyle 同规格，示范 colliderId 引用）
    ctx.colliders.add({ id: 'shixiang_box', w: 70, h: 130, label: '石像夜巡盒' });

    // BossLoad3：夜巡石甲——挂 isBoss gear，makeBoss 后 HP/承伤可见变
    ctx.armorPieces.add({
      id: 'shixiang_yejia',
      name: '夜巡石甲',
      slot: 'body',
      lore: '古刹石像胸口凝出的一层灰鳞甲，夜巡时犹有余温。',
      base: { hp: config.yejiaHp, def: config.yejiaDef },
      weight: 0,
      quality: 'huang',
      tier: 3,
      fogName: '石甲·夜??',
    });

    // 夜巡石俑剪影：body/baseRig 仍必填 axe；石色 parts
    ctx.silhouettes.add({
      id: 'shixiang_yong',
      body: 'axe',
      baseRig: 'axe',
      label: '夜巡石俑剪影',
      parts: [
        { kind: 'palette', coat: '#6a6860', arm: '#7a7870', armB: '#5a5850', leg: '#5c5a52', legB: '#4a4840', boot: '#3a3830', skin: '#8a8680', sash: '#4a4840', collar: '#707068', eye: '#c8c0a8' },
        { kind: 'armorLayer', slot: 'chest', style: 'plate', color: '#7a7870' },
        { kind: 'armorLayer', slot: 'shoulder', style: 'plate', color: '#6a6860' },
        { kind: 'scale', value: 1.08 },
        { kind: 'faceMark', style: 'mask', color: '#5a5850' },
        { kind: 'stanceBias', lean: 0.05, crouch: 0.08 },
      ],
    });

    // BossSil3：夜巡石兽剪影——body/baseRig 仍必填 gargoyle；灰石色 + 饰件，可辨于核心空 parts jade
    ctx.silhouettes.add({
      id: 'shixiang_yexun',
      body: 'gargoyle',
      baseRig: 'gargoyle',
      label: '夜巡石兽剪影',
      parts: [
        { kind: 'palette', coat: '#6a6860', arm: '#7a7870', armB: '#5a5850', leg: '#5c5a52', legB: '#4a4840', boot: '#3a3830', skin: '#8a8680', sash: '#4a4840', collar: '#707068', eye: '#c8c0a8' },
        { kind: 'scale', value: 1.12 },
        { kind: 'faceMark', style: 'mask', color: '#5a5850' },
        { kind: 'armorLayer', slot: 'chest', style: 'plate', color: '#7a7870' },
        { kind: 'armorLayer', slot: 'shoulder', style: 'plate', color: '#6a6860' },
        { kind: 'ornament', slot: 'neck', style: 'pendant', color: '#c8b070' },
        { kind: 'cloak', style: 'long', color: 'rgba(80,78,70,0.55)' },
      ],
    });

    // 自建 Boss 招（kind=slam，对齐设计台 slam_heavy，略大 radius；不扩 kind）
    ctx.bossMoves.add({
      id: 'shixiang_slam_heavy',
      kind: 'slam',
      label: '石重震',
      radius: 240,
      damage: 24,
      hitstop: 12,
    });

    // Dfr4：dive/fireball/roar soft 三招（字段已由 Dfr1–3 接线；可辨于 CORE omit 缺省；不扩 kind/drawKind）
    ctx.bossMoves.add({
      id: 'shixiang_roar_swift',
      kind: 'roar',
      label: '夜巡短啸',
      windFrames: 8,
      radius: 160,
      frames: 20,
    });
    ctx.bossMoves.add({
      id: 'shixiang_fireball_swift',
      kind: 'fireball',
      label: '夜巡急火',
      frames: 10,
      count: 1,
      windFrames: 6,
      projectileId: 'fireball',
    });
    ctx.bossMoves.add({
      id: 'shixiang_dive_swift',
      kind: 'dive',
      label: '夜巡迅潜',
      windFrames: 12,
      radius: 80,
      frames: 18,
    });

    // Boss kit 示范（G3：经 EnemyDef.kitId / stage.boss.kit 进战；不改官方幕池字面量）
    // Dfr4：close/far 的 roar/dive/fireball 改挂 soft 三招；保留 slam_heavy 与其它核心招
    ctx.bossKits.add({
      id: 'shixiang_yexun',
      close: [
        { move: 'claw', weight: 4 },
        { move: 'shixiang_slam_heavy', weight: 2.5 },
        { move: 'sweep', weight: 1.6 },
        { move: 'charge', weight: 1.8 },
        { move: 'shixiang_roar_swift', weight: 1.5 },
      ],
      far: [
        { move: 'shixiang_dive_swift', weight: 2.5 },
        { move: 'charge', weight: 2.8 },
        { move: 'shixiang_slam_heavy', weight: 2.0 },
        { move: 'shixiang_fireball_swift', weight: 1.4 },
        { move: 'walk', weight: 1.8 },
        { move: 'inkNova', weight: 1.0 },
        { move: 'summonAdds', weight: 0.5 },
        { move: 'shixiang_roar_swift', weight: 1.3 },
      ],
    });

    // Gsm5：Boss 空档积木（仅 BOSS_GAP_LOCO_KINDS；非 loco soft-skip；不替代 kit 选招）
    // keepDistance 带比核心壳更宽的巡廊控距，smoke / ?pack=shixiang 可辨
    ctx.behaviors.add({
      id: 'shixiang_yexun_pace',
      body: 'gargoyle',
      label: '夜巡空档步',
      steps: [
        { kind: 'facePlayer' },
        { kind: 'keepDistance', idealMin: 180, idealMax: 280, chase: 520, retreatSpeed: 2.4 },
        { kind: 'circleStrafe', radius: 200, speed: 1.2, weight: 0.6 },
        { kind: 'idlePace', speed: 1.0 },
        { kind: 'flank', preferBehind: true, weight: 0.35 },
        { kind: 'phaseAtHp', below: 0.45, setPhase: '夜醒' },
        {
          kind: 'phaseGate',
          phase: '夜醒',
          steps: [
            { kind: 'keepDistance', idealMin: 140, idealMax: 220, chase: 600, retreatSpeed: 2.8 },
            { kind: 'circleStrafe', radius: 160, speed: 1.5, weight: 0.9 },
          ],
        },
      ],
    });

    // Boss：无 body，组装键 silhouette + behavior + collider
    // BossSil3：silhouetteId → 自建灰石剪影（drawGargoyle 读 parts）
    // BossLoad3：gear 夜巡石甲 + skill 核心突刺（idle/walk 空档施放；不改 kit 权重）
    // Gsm5：behaviorId → 自建非空 loco steps（CORE gargoyle 仍无 steps）
    ctx.enemies.add({
      id: 'shixiang_yexun',
      name: '石像夜巡',
      hp: config.bossHp,
      isBoss: true,
      eliteEligible: false,
      silhouetteId: 'shixiang_yexun',
      behaviorId: 'shixiang_yexun_pace',
      colliderId: 'shixiang_box',
      kitId: 'shixiang_yexun',
      gear: [{ id: 'shixiang_yejia' }],
      skills: [
        { id: 'tuci', weight: 1.2, minRange: 0, maxRange: 9999, cooldown: 140 },
      ],
    });

    // 杂兵：无 body，自建剪影 + CORE axe 行为/碰撞
    ctx.enemies.add({
      id: 'shixiang_yong',
      name: '夜巡石俑',
      hp: config.yongHp,
      eliteEligible: true,
      silhouetteId: 'shixiang_yong',
      behaviorId: 'axe',
      colliderId: 'axe',
      dropChance: 0.22,
      loot: [
        { kind: 'material', id: 'bone', chance: 0.3, amount: 1 },
        { kind: 'material', id: 'iron', chance: 0.25, amount: 1 },
        { kind: 'crystal', chance: 0.15, amount: 2 },
      ],
    });

    // Oc5: 读活目录（长夜包已登记），勿硬 import CORE_STAGES
    const act1 = ctx.stages.get('act1') ?? ctx.stages.list().find((s) => s && s.actIndex === 0);
    if (act1) ctx.stages.add(withShixiangNight(act1));
  },
};
