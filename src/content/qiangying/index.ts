/**
 * 内容包「枪影」— mid-range spear trash + act1 wave mix-in (NOT a 门派).
 *
 * Uses core body kit `spear` (C-tier). Load: `?pack=qiangying` / `__pack.load('qiangying')`.
 * 枪影先锋挂敌人负载 + BehaviorStep 积木示范：外功突刺 + 枪芒符 + 回血丹阈值 + 皮甲/圣银刺枪；
 * AI 走中距 keepDistance + meleeAttack + useLoadout 配方（非纯硬编码 spear AI）。
 * 先锋挂 `qiangying_yingqiang`（lookId→lookQiangyingRain 外观积木示范）。
 */
import { Context, Schema } from 'cordis';
import type { StageDef } from '../../level/stage';

export interface QiangyingConfig {
  /** Base HP for 枪影亡魂. */
  spearHp: number;
  /** Base HP for 枪影先锋. */
  vanguardHp: number;
  /** 枪芒符锥形伤害. */
  qiangmangDamage: number;
}

function withSpearWaves(base: StageDef): StageDef {
  // Deep-clone act1 geometry; only rewrite a few wave slots so campaign stays intact.
  const stage: StageDef = JSON.parse(JSON.stringify(base));
  stage.title = '第一幕 · 枪影夜雨';
  stage.subtitle = '雨巷深处，枪锋先至';
  // Arena 0 山门古道 — mix spear into both waves
  stage.arenas[0]!.waves = [
    [
      { type: 'qiangying_spear', side: 'R', delay: 0 },
      { type: 'axe', side: 'L', delay: 50 },
    ],
    [
      { type: 'qiangying_spear', side: 'R', delay: 0 },
      { type: 'archer', side: 'R', delay: 35 },
      { type: 'qiangying_vanguard', side: 'L', delay: 70 },
    ],
  ];
  // Arena 1 竹林栈道 — spear vs shield spacing lesson
  stage.arenas[1]!.waves = [
    [
      { type: 'shield', side: 'R', delay: 0 },
      { type: 'qiangying_spear', side: 'L', delay: 40 },
    ],
    [
      { type: 'qiangying_vanguard', side: 'R', delay: 0 },
      { type: 'archer', side: 'L', delay: 20 },
      { type: 'qiangying_spear', side: 'R', delay: 55 },
    ],
  ];
  // Arena 2 古刹前殿 — keep denser; inject one spear per wave
  stage.arenas[2]!.waves = [
    [
      { type: 'shield', side: 'L', delay: 0 },
      { type: 'qiangying_spear', side: 'R', delay: 30 },
    ],
    [
      { type: 'qiangying_vanguard', side: 'R', delay: 0 },
      { type: 'archer', side: 'L', delay: 20 },
      { type: 'archer', side: 'R', delay: 40 },
      { type: 'qiangying_spear', side: 'L', delay: 80 },
    ],
  ];
  // Soft beat flavour (江湖口吻)
  if (stage.beats[0]) {
    stage.beats[0].subtitle = '雨巷枪影，先机在彼';
  }
  if (stage.beats[1]) {
    stage.beats[1].subtitle = '古道尽头，长枪破雾';
  }
  return stage;
}

export const PackQiangying = {
  name: 'pack-qiangying',
  inject: ['enemies', 'stages', 'talismans', 'silhouettes', 'behaviors', 'weapons', 'weaponLooks'],
  Config: Schema.object({
    spearHp: Schema.natural().min(30).max(120).default(55).description('枪影亡魂气血'),
    vanguardHp: Schema.natural().min(40).max(160).default(72).description('枪影先锋气血'),
    qiangmangDamage: Schema.number().min(1).max(60).default(14).description('枪芒符伤害'),
  }) as Schema<QiangyingConfig>,
  apply(ctx: Context, config: QiangyingConfig) {
    // 示范符：敌人可施放的锥形枪芒（与玩家共用 ScriptStep 播放器）
    ctx.talismans.script({
      id: 'qiangyingQiangmang',
      anim: 'sealStampFull',
      steps: [
        { kind: 'fx', preset: 'flare', at: 'caster', size: 55, color: '#c07040' },
        { kind: 'fx', preset: 'swordQi', at: 'caster', color: '#e09050' },
        { kind: 'sfx', id: 'slash' },
        {
          kind: 'multihit',
          times: 2,
          gapFrames: 6,
          step: {
            kind: 'damageCone',
            reach: 150,
            halfH: 48,
            damage: Math.round(config.qiangmangDamage * 0.65),
            kbX: 4,
            kbY: -2,
            hitstun: 12,
            heavy: true,
          },
        },
        {
          kind: 'damageBox',
          w: 90,
          h: 50,
          ox: 70,
          oy: -35,
          damage: Math.round(config.qiangmangDamage * 0.4),
          kbX: 3,
        },
        { kind: 'shake', amp: 3, frames: 6 },
        { kind: 'wait', frames: 10 },
      ],
    });
    ctx.talismans.add({
      id: 'qiangying_qiangmang',
      name: '枪芒符',
      fogName: '灵符·枪??',
      lore: '纸上凝枪意，一挥锋芒外吐。枪影先锋偶以此破势。',
      tip: '出征：身前枪芒锥击',
      color: '#c07040',
      cost: { iron: 1, silk: 1 },
      fee: 10,
      stockCap: 2,
      runCharges: 1,
      quality: 'fan',
      grade: 'xia',
      scriptId: 'qiangyingQiangmang',
      icon: 'H-05-tal-3',
    });


    // 兵刃外观积木示范：登记配方 + 挂 lookId 的枪
    ctx.weaponLooks.add({
      id: 'lookQiangyingRain',
      label: '枪影雨枪',
      baseShape: 'spear',
      parts: [
        { kind: 'palette', blade: '#e8d0b0', trail: '#c07040', edge: '#ffe0c0', grip: '#2a2218', metal: '#c07040' },
        { kind: 'haft', length: 15, width: 3.0 },
        { kind: 'grip', length: 8, width: 3.8, color: '#5a4030', wrapStyle: 'cord' },
        { kind: 'head', style: 'spear', size: 13 },
        { kind: 'tip', style: 'point', size: 7 },
        { kind: 'tassel', style: 'knot', length: 11, color: '#c07040', swayAmp: 1.4 },
        { kind: 'runeInlay', text: '影', color: '#e09050', along: 0.55 },
        { kind: 'inkEdge', width: 0.7 },
        { kind: 'glow', color: '#c07040', radius: 9, alpha: 0.28 },
        { kind: 'swingHint', color: '#c07040', width: 2.5 },
      ],
    });
    ctx.weapons.add({
      id: 'qiangying_yingqiang',
      name: '枪影雨枪',
      lore: '雨巷枪影所执长枪，锋上凝一缕残阳。',
      tip: '枪系示范 · 外观积木 lookQiangyingRain',
      unlock: { type: 'blueprint', hint: '枪影夜雨偶得' },
      damage: 0.88, speed: 0.94, reach: 1.5, poise: 1.0, rage: 0.9, airHover: 0.9,
      weight: 'medium', category: 'spear',
      affinities: ['shieldBreak'], affinityBonus: 0.18,
      blade: '#e8d0b0', trail: '#c07040', edge: '#ffe0c0', length: 78, shape: 'spear',
      quality: 'huang', tier: 3,
      lookId: 'lookQiangyingRain',
      feel: { boxTune: { tipXPush: 14, tipWFloorMul: 0.92 } },
      craft: { materials: { iron: 3, bone: 1 }, fee: 30 },
    });

    ctx.silhouettes.add({
      id: 'qiangying_vanguard',
      body: 'spear',
      baseRig: 'spear',
      label: '枪影先锋剪影',
      parts: [
        { kind: 'mainhand', fromWeapon: true },
        { kind: 'headgear', style: 'topknot' },
        { kind: 'palette', sash: '#c07040', eye: '#e09050', coat: '#182838' },
        { kind: 'cloak', style: 'ragged', sway: 1.2, color: '#1a2430' },
        { kind: 'armorLayer', slot: 'shoulder', style: 'light', color: '#4a3840' },
        { kind: 'ornament', slot: 'waist', style: 'bell', color: '#c07040' },
        { kind: 'faceMark', style: 'scar', color: '#602820' },
        { kind: 'stanceBias', lean: 0.15, crouch: 0.05 },
      ],
    });

    // BehaviorStep 积木：中距控距 + 突刺/短突 + 负载施放（与硬编码 spear AI 略有不同）
    ctx.behaviors.add({
      id: 'qiangying_mid_spear',
      body: 'spear',
      label: '枪影中距枪法',
      steps: [
        { kind: 'keepDistance', idealMin: 90, idealMax: 165, chase: 240, retreatSpeed: 2.6 },
        { kind: 'circleStrafe', radius: 130, speed: 1.35, weight: 0.7 },
        { kind: 'meleeAttack', attackKey: 'thrust', rangeMin: 80, rangeMax: 175, weight: 2.0, cooldown: 52 },
        { kind: 'meleeAttack', attackKey: 'lunge', rangeMin: 100, rangeMax: 220, weight: 1.0, cooldown: 44 },
        { kind: 'comboChain', attackKeys: ['thrust', 'lunge'], gapFrames: 12, weight: 0.9, rangeMin: 70, rangeMax: 190 },
        { kind: 'dodge', range: 100, direction: 'side', weight: 0.8, cooldown: 70 },
        { kind: 'flank', preferBehind: true, weight: 0.5 },
        { kind: 'retreatBurst', dist: 80, frames: 12, weight: 0.45 },
        { kind: 'phaseAtHp', below: 0.4, setPhase: '残枪' },
        {
          kind: 'phaseGate',
          phase: '残枪',
          steps: [
            { kind: 'callAlly', enemyId: 'qiangying_spear', max: 1, cooldown: 240, weight: 1.2 },
            { kind: 'taunt', text: '枪未折！', weight: 0.4, cooldown: 90 },
          ],
        },
        { kind: 'useLoadout', prefer: 'any', weight: 1.4 },
        { kind: 'idleEmote', text: '……', weight: 0.15, cooldown: 160 },
        { kind: 'facePlayer' },
      ],
    });

    ctx.enemies.add({
      id: 'qiangying_spear',
      name: '枪影亡魂',
      body: 'spear',
      silhouetteId: 'spear',
      behaviorId: 'spear',
      hp: config.spearHp,
      dropChance: 0.24,
      eliteEligible: true,
      loot: [
        { kind: 'material', id: 'iron', chance: 0.35, amount: 1 },
        { kind: 'crystal', chance: 0.18, amount: 3 },
      ],
    });
    ctx.enemies.add({
      id: 'qiangying_vanguard',
      name: '枪影先锋',
      body: 'spear',
      silhouetteId: 'qiangying_vanguard',
      behaviorId: 'qiangying_mid_spear',
      hp: config.vanguardHp,
      dropChance: 0.28,
      eliteEligible: true,
      cooldown: 28,
      loot: [
        { kind: 'material', id: 'iron', chance: 0.45, amount: 2 },
        { kind: 'material', id: 'bone', chance: 0.25, amount: 1 },
        { kind: 'crystal', chance: 0.22, amount: 4 },
      ],
      // 敌人负载示范：突刺 / 皮甲+圣银刺枪（手持外观） / 回血丹 / 枪芒符
      skills: [
        { id: 'tuci', weight: 2, minRange: 90, maxRange: 220, cooldown: 110 },
      ],
      gear: [
        { id: 'pijia' },
        { id: 'qiangying_yingqiang' },
      ],
      pills: [
        { id: 'heal', when: 'hpBelow', hpFrac: 0.4, once: true },
      ],
      talismans: [
        { id: 'qiangying_qiangmang', weight: 1, minRange: 50, maxRange: 180, cooldown: 150 },
      ],
    });

    // Oc5: 读活目录（长夜包已登记），勿硬 import CORE_STAGES
    const act1 = ctx.stages.get('act1') ?? ctx.stages.list().find((s) => s && s.actIndex === 0);
    if (act1) ctx.stages.add(withSpearWaves(act1));
  },
};
