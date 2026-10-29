/** Oc4: 出厂 CORE_WEP_AFFIXES 字面量（原 meta/weaponInstAffix.ts）。 */
import type { WepAffixDef } from '../../../meta/weaponInstAffix';

export const CORE_WEP_AFFIXES: WepAffixDef[] = [
  { id: 'poshi', name: '破势', fogName: '词缀·??', tip: '破韧 +18%', poiseMul: 1.18 },
  { id: 'yinixue', name: '饮血', fogName: '词缀·??', tip: '命中吸血 6%', lifesteal: 0.06 },
  { id: 'chouqi', name: '抽气', fogName: '词缀·??', tip: '命中回内 1.2', neiliOnHit: 1.2 },
  { id: 'kuaijie', name: '快截', fogName: '词缀·??', tip: '攻速微升', speedMul: 0.94 },
  { id: 'zhongji', name: '重击', fogName: '词缀·??', tip: '重击伤害 +12%', heavyDmgMul: 1.12 },
  { id: 'qingling', name: '轻灵', fogName: '词缀·??', tip: '攻击略省体力', staminaRefund: 0.12 },
];
