/** Oc4: 出厂 CORE_FRAGMENTS 字面量（原 meta/runFragments.ts）。 */
import type { FragmentDef } from '../../../meta/runFragments';

export const CORE_FRAGMENTS: FragmentDef[] = [
  { id: 'lieqi', name: '裂气残页', fogName: '残页·??', desc: '外功伤害提升', color: '#ff9080', tag: 'qi', skillDmgMul: 1.18 },
  { id: 'guixi', name: '归息残页', fogName: '残页·??', desc: '内力回复加快', color: '#70c0ff', tag: 'qi', neiliRegenMul: 1.55 },
  { id: 'toujia', name: '透甲残页', fogName: '残页·??', desc: '破甲更利', color: '#d0b070', tag: 'body', armorPierceBonus: 0.22 },
  { id: 'jiying', name: '疾影残页', fogName: '残页·??', desc: '闪身冷却缩短', color: '#b0a0ff', tag: 'speed', dashCdMul: 0.7 },
  { id: 'yaoli', name: '药力残页', fogName: '残页·??', desc: '丹药效力增强', color: '#ff6a8a', tag: 'sustain', pillHealMul: 1.35, pillRageBonus: 15 },
  { id: 'tieyi', name: '铁意残页', fogName: '残页·??', desc: '所受伤害略减', color: '#a8b8c8', tag: 'body', dmgTakenMul: 0.9 },
  {
    id: 'heican', name: '黑残页', fogName: '残页·诡',
    desc: '全伤害 +22%', color: '#a060ff', tag: 'curse',
    curse: '受击 +12% · 结束可山门净秽',
    eventOnly: true,
    atkMul: 1.22,
    dmgTakenMul: 1.12,
  },
];
