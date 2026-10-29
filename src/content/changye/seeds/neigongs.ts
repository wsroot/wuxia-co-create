/** Oc4: 出厂 CORE_NEIGONGS 字面量（原 meta/neigong.ts）。 */
import type { NeigongDef } from '../../../meta/neigong';

export const CORE_NEIGONGS: NeigongDef[] = [
  {
    id: 'hunyuan', name: '混元功', style: '均衡', quality: 'fan',
    lore: '丹田混元，攻守相济。江湖入门心法，稳扎稳打。',
    tip: '武功伤害与气势均衡提升 · 内力回复平稳',
    signature: '回内：内力回复最快档之一 · 满级处决伤 +10%',
    meditateCost: { cinnabar: 2, herb: 2 }, fee: 22,
    effects: {
      damageBonus: [0.06, 0.09, 0.12, 0.16, 0.20],
      rageBonus: [0.08, 0.11, 0.14, 0.18, 0.22],
      defBonus: [0.02, 0.03, 0.04, 0.05, 0.06],
      neiliRegenMul: [1.0, 1.05, 1.1, 1.15, 1.2],
      executeMulBonus: 0.1,
    }
  },
  {
    id: 'xueying', name: '血影心法', style: '烈攻', quality: 'huang',
    lore: '以血养劲，刀锋更凶，却疏于护体。',
    tip: '高武功加成 · 气势较快 · 减伤略弱 · 内力回复偏快',
    signature: '饮血：满级普攻吸血 4% · 处决伤 +18%',
    meditateCost: { cinnabar: 3, bone: 2 }, fee: 28,
    effects: {
      damageBonus: [0.10, 0.14, 0.18, 0.23, 0.28],
      rageBonus: [0.10, 0.13, 0.16, 0.20, 0.24],
      defBonus: [0, 0, 0.01, 0.01, 0.02],
      neiliRegenMul: [1.05, 1.1, 1.15, 1.2, 1.25],
      executeMulBonus: 0.18,
      lifestealMax: 0.04,
    }
  },
  {
    id: 'qingxu', name: '清虚心法', style: '守中', quality: 'huang',
    lore: '清心寡欲，真气绵长，利于格挡与积怒。',
    tip: '低伤害加成 · 高气势 · 略增减伤 · 内力回复最快',
    signature: '弹反窗：满级完美格挡时机大幅放宽 · 弹反回气加强',
    meditateCost: { herb: 3, cinnabar: 1 }, fee: 24,
    effects: {
      damageBonus: [0.03, 0.05, 0.07, 0.09, 0.12],
      rageBonus: [0.14, 0.18, 0.22, 0.28, 0.34],
      defBonus: [0.03, 0.05, 0.07, 0.09, 0.11],
      neiliRegenMul: [1.15, 1.25, 1.35, 1.45, 1.55],
      parryWindowBonusMax: 4,
      parryRageBonusMax: 6,
    }
  },
  {
    id: 'lieshan', name: '裂山劲', style: '霸道', quality: 'xuan',
    lore: '力可裂山，高阶武功暴涨，怒意积蓄较慢。',
    tip: '最高武功加成 · 气势较慢 · 内力回复偏慢',
    signature: '破韧：满级破势伤害 +22% · 重击更沉',
    meditateCost: { xuaniron: 1, cinnabar: 2, iron: 2 }, fee: 32,
    effects: {
      damageBonus: [0.12, 0.17, 0.22, 0.28, 0.35],
      rageBonus: [0.02, 0.04, 0.06, 0.08, 0.10],
      defBonus: [0.01, 0.02, 0.02, 0.03, 0.04],
      neiliRegenMul: [0.9, 0.92, 0.95, 0.98, 1.0],
      poiseMulBonus: 0.22,
      executeMulBonus: 0.08,
    }
  },
];
