/** Oc4: 出厂 CORE_TITLES 字面量（原 meta/titles.ts）。 */
import type { TitleDef } from '../../../meta/titles';

export const CORE_TITLES: TitleDef[] = [
  { id: 'wushang', name: '无伤归客', desc: '整次出征获胜且全程未受伤', qol: '开局丹药 +1', startPotions: 1 },
  { id: 'chaoxi', name: '潮退行者', desc: '肃清邪气潮', qol: '外观：开局血晶展示更醒目（无战斗效果）', shopDiscount: 0 },
  { id: 'lingbeng', name: '稳锋', desc: '一次出征零崩刀通关', qol: '弹反时机略宽', parryWindowBonus: 1 },
  { id: 'chujue', name: '断罪', desc: '单局处决 ≥5', qol: '处决提示更久' },
  { id: 'anhun', name: '安魂使', desc: '完成幕内安魂目标', qol: '据点休整回复 +5' },
];
