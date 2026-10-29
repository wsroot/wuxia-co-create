/** Oc4: 出厂 CORE_ELITE_MODS 字面量（原 level/eliteMods.ts）。 */
import type { EliteModDef } from '../../../level/eliteMods';

export const CORE_ELITE_MODS: EliteModDef[] = [
  {
    id: 'tongpi', name: '铜皮', tag: '铜皮', color: '#c8a878', dmgTakenMul: 0.62,
    weaponCounters: [
      { category: 'heavy', label: '克制·铜皮', dmgMul: 1.25, poiseMul: 1.45, pierceTongpi: true },
    ],
  },
  {
    id: 'shixue', name: '嗜血', tag: '嗜血', color: '#ff4060', lifesteal: 0.28,
    weaponCounters: [
      { category: 'spear', label: '克制·嗜血', dmgMul: 1.12, poiseMul: 1.1 },
      { category: 'bare', label: '克制·近身', dmgMul: 1.12, poiseMul: 1.15 },
    ],
  },
  {
    id: 'shanbu', name: '闪步', tag: '闪步', color: '#a090ff', dashAway: true,
    weaponCounters: [
      { category: 'blade', label: '克制·闪步', dmgMul: 1.2, poiseMul: 1.15, cancelShanbu: true },
      { category: 'spear', label: '克制·远刺', dmgMul: 1.15, poiseMul: 1.2, cancelShanbu: true },
    ],
  },
  {
    id: 'fanshang', name: '反伤', tag: '反伤', color: '#ff9060', reflect: 0.22,
    weaponCounters: [
      { category: 'bare', label: '克制·反伤', dmgMul: 1.18, poiseMul: 1.1, ignoreReflect: true },
    ],
  },
  {
    id: 'zhongji', name: '重击', tag: '重击', color: '#e8c070', heavyMul: 1.45, startupMul: 1.35, summonMinion: true, summonEnemyId: 'axe',
    weaponCounters: [
      { category: 'heavy', label: '克制·重击', dmgMul: 1.15, poiseMul: 1.35 },
    ],
  },
  {
    id: 'xiehuo', name: '邪火', tag: '邪火', color: '#ff6030', fireOnDeath: true, summonFire: true,
    weaponCounters: [
      { category: 'blade', label: '克制·邪火', dmgMul: 1.12, poiseMul: 1.1 },
    ],
  },
];
