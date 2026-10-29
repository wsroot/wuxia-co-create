/** Oc4: 出厂 CORE_PILLS 字面量（原 meta/alchemy.ts）。 */
import type { PillDef } from '../../../meta/alchemy';

export const CORE_PILLS: PillDef[] = [
  {
    id: 'heal', name: '回血丹', lore: '温养气血，伤势立缓。',
    cost: { herb: 2, cinnabar: 1, silk: 1 }, fee: 8, carryCap: 5,
    sortie: true,
    quality: 'fan', grade: 'xia',
    tip: '出征：回复 40 生命',
    effect: { heal: 40, healWithFrag: true, floatText: '回血丹', floatColor: '#ff6a7a', sfx: 'potion' }
  },
  {
    id: 'rage', name: '气势丹', lore: '激荡心火，气势骤升。',
    cost: { cinnabar: 2, bone: 1 }, fee: 10, carryCap: 3,
    sortie: true,
    quality: 'fan', grade: 'xia',
    tip: '出征：气势 +45',
    effect: { rage: 45, rageWithFrag: true, floatText: '气势丹', floatColor: '#ff90b0', sfx: 'ui' }
  },
  {
    id: 'atkIncense', name: '攻击香', lore: '燃香片刻，刀锋更烈。',
    cost: { herb: 2, yaohe: 1 }, fee: 18, carryCap: 2,
    sortie: true,
    quality: 'huang', grade: 'zhong',
    tip: '出征：20 秒攻击 ×1.18',
    effect: {
      atkBuffSec: 20, durScaleWithPillMul: true, floatText: '攻击香', floatColor: '#ffd27a', sfx: 'ui',
      castFeel: { hitstop: 4, shake: { amp: 2, frames: 6 }, flash: { color: '#ffd27a', a: 0.18 } },
      whileActive: { auraPreset: 'ember', color: '#ffd27a', period: 16, hudTint: '#ffd27a', rimGlow: true },
    }
  },
  {
    id: 'qingxin', name: '清心散', lore: '宁神定气，护体一周。',
    cost: { herb: 3, bone: 1, hide: 1 }, fee: 14, carryCap: 3,
    sortie: true,
    quality: 'fan', grade: 'zhong',
    tip: '出征：15 秒减伤 +12%',
    effect: { defBuffSec: 15, neili: 35, neiliWithFrag: true, durScaleWithPillMul: true, floatText: '清心散 · 内力+', floatColor: '#a0d0ff', sfx: 'ui' }
  },
  {
    id: 'baofa', name: '爆发丹', lore: '短时气焰狂涌，过犹不及。',
    cost: { cinnabar: 3, yaohe: 1 }, fee: 22, carryCap: 2,
    sortie: true,
    quality: 'huang', grade: 'zhong',
    tip: '出征：爆发 · 12 秒攻击 ×1.18 · 气势 +20',
    effect: { atkBuffSec: 12, rage: 20, floatText: '爆发丹', floatColor: '#ff5030', sfx: 'ui' }
  },
  {
    id: 'xuhang', name: '续航膏', lore: '细水长流，伤势缓愈。',
    cost: { herb: 4, silk: 1 }, fee: 16, carryCap: 3,
    sortie: true,
    quality: 'fan', grade: 'zhong',
    tip: '出征：续航 · 缓回 8 次生命',
    effect: { xuhangSec: 16, xuhangTicks: 8, floatText: '续航膏', floatColor: '#70d090', sfx: 'potion' }
  },
  {
    id: 'jiekongdan', name: '解控丹', lore: '瞬解缠绕，重获自由。',
    cost: { herb: 2, cinnabar: 2, spiritjade: 1 }, fee: 20, carryCap: 2,
    sortie: true,
    quality: 'huang', grade: 'zhong',
    tip: '出征：解控 · 清硬直并短暂无敌',
    effect: { clearControl: true, invuln: 40, stamina: 20, floatText: '解控丹', floatColor: '#c0a0ff', sfx: 'ui' }
  },
  {
    id: 'porendan', name: '破韧散', lore: '专破架势，石皮亦裂。',
    cost: { bone: 3, coal: 2, xuaniron: 1 }, fee: 24, carryCap: 2,
    sortie: true,
    quality: 'xuan', grade: 'shang',
    tip: '出征：破韧 · 20 秒破势伤害 ×1.35',
    effect: { porenBuffSec: 20, floatText: '破韧散', floatColor: '#e8c070', sfx: 'ui' }
  },
  {
    id: 'hutidan', name: '护体丹', lore: '气血外护，刀枪暂难近身。',
    cost: { herb: 3, hide: 2, bone: 1 }, fee: 18, carryCap: 3,
    sortie: true,
    quality: 'huang', grade: 'zhong',
    tip: '出征：12 秒减伤 +12% · 微回护甲',
    effect: {
      defBuffSec: 12, defBuffMax: true, armor: 12, floatText: '护体丹', floatColor: '#a8c0d8', sfx: 'ui',
      castFeel: { hitstop: 3, shake: { amp: 1.5, frames: 5 } },
      whileActive: { auraPreset: 'ring', color: '#a8c0d8', period: 20, rimGlow: true },
    }
  },
  {
    id: 'jingzhou', name: '净咒散', lore: '涤除邪氛，诅咒与场地毒雾难侵。',
    cost: { herb: 3, cinnabar: 2, spiritjade: 1 }, fee: 22, carryCap: 2,
    sortie: true,
    quality: 'xuan', grade: 'zhong',
    tip: '出征：20 秒场地/诅咒承伤大减',
    effect: { jingzhouSec: 20, affixSuppressSec: 6, floatText: '净咒散', floatColor: '#b0a0ff', sfx: 'ui' }
  },
  {
    id: 'baoqi', name: '暴气丸', lore: '心火暴涨，气势充盈。',
    cost: { cinnabar: 3, yaohe: 1, bone: 1 }, fee: 16, carryCap: 3,
    sortie: true,
    quality: 'huang', grade: 'zhong',
    tip: '出征：气势 +55 · 短时气势回复加快',
    effect: { rage: 55, baoqiSec: 10, floatText: '暴气丸', floatColor: '#ff7090', sfx: 'ui' }
  },
  {
    id: 'yingbu', name: '影步散', lore: '踏影无痕，闪身更疾。',
    cost: { silk: 2, herb: 2, cinnabar: 1 }, fee: 20, carryCap: 2,
    sortie: true,
    quality: 'huang', grade: 'zhong',
    tip: '出征：15 秒闪身冷却缩短 · 无敌时间微增',
    effect: { yingbuSec: 15, floatText: '影步散', floatColor: '#90a0ff', sfx: 'ui' }
  },
  {
    id: 'xuming', name: '续命丹', lore: '濒死续命，一线生机。',
    cost: { herb: 4, yaohe: 1, spiritjade: 1 }, fee: 28, carryCap: 2,
    sortie: true,
    quality: 'xuan', grade: 'shang',
    tip: '出征：急回 55 生命 · 短暂无敌',
    effect: { heal: 55, invuln: 50, floatText: '续命', floatColor: '#ff8098', sfx: 'potion' }
  },
  {
    id: 'pojia', name: '破甲散', lore: '专破铁衣，护甲如纸。',
    cost: { coal: 2, bone: 2, xuaniron: 1 }, fee: 24, carryCap: 2,
    sortie: true,
    quality: 'xuan', grade: 'zhong',
    tip: '出征：18 秒破甲加强 · 对护甲伤害提升',
    effect: { pojiaBuffSec: 18, floatText: '破甲散', floatColor: '#d0b070', sfx: 'ui' }
  },
]
