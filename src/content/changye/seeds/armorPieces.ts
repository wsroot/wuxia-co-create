/** Oc4: 出厂 CORE_ARMOR_PIECES 字面量（原 meta/gear.ts）。 */
import type { ArmorDef } from '../../../meta/gear';

export const CORE_ARMOR_PIECES: ArmorDef[] = [
  { id: 'buyi', name: '布衣', slot: 'body', lore: '粗布短褐，聊胜于无。', base: { hp: 8, def: 1 }, weight: 14, common: true, quality: 'fan', tier: 1 },
  { id: 'pijia', name: '皮甲', slot: 'body', lore: '鞣制兽皮，可挡风刃。', base: { hp: 14, def: 3 }, weight: 8, quality: 'huang', tier: 2 },
  { id: 'tiejia', name: '铁甲', slot: 'body', lore: '铁叶缀成，沉重而稳。', base: { hp: 22, def: 5, atk: -1 }, weight: 4, quality: 'huang', tier: 3 },

  { id: 'bumao', name: '布帽', slot: 'head', lore: '寻常头巾。', base: { hp: 4 }, weight: 10, common: true, quality: 'fan', tier: 1 },
  { id: 'tongmao', name: '铜盔', slot: 'head', lore: '铜片护额。', base: { hp: 8, def: 2 }, weight: 6, quality: 'huang', tier: 2 },
  { id: 'yuguan', name: '玉冠', slot: 'head', lore: '温润玉石，静心安神。', base: { hp: 6, rage: 0.05, wugong: 2 }, weight: 3, quality: 'xuan', tier: 4 },

  { id: 'buhuwan', name: '布护腕', slot: 'arms', lore: '缠腕布条。', base: { atk: 1 }, weight: 10, common: true, quality: 'fan', tier: 1 },
  { id: 'tiehuwan', name: '铁护腕', slot: 'arms', lore: '铁箍护臂。', base: { atk: 3, def: 1 }, weight: 6, quality: 'huang', tier: 2 },
  { id: 'longwenwan', name: '龙纹腕', slot: 'arms', lore: '隐有龙纹，催力。', base: { atk: 5, wugong: 2 }, weight: 3, quality: 'xuan', tier: 4 },

  { id: 'buxue', name: '布靴', slot: 'legs', lore: '轻便布鞋。', base: { hp: 3 }, weight: 10, common: true, quality: 'fan', tier: 1 },
  { id: 'pixue', name: '皮靴', slot: 'legs', lore: '牛皮短靴。', base: { hp: 6, def: 1 }, weight: 6, quality: 'huang', tier: 2 },
  { id: 'yunlv', name: '云履', slot: 'legs', lore: '踏雪无痕之感。', base: { hp: 5, atk: 2, rage: 0.03 }, weight: 3, quality: 'xuan', tier: 4 },

  { id: 'muyupei', name: '木玉佩', slot: 'neck', lore: '雕木为佩。', base: { hp: 5 }, weight: 8, common: true, quality: 'fan', tier: 1 },
  { id: 'yupei', name: '玉佩', slot: 'neck', lore: '温润玉佩。', base: { hp: 10, atk: 2, def: 1 }, weight: 5, quality: 'huang', tier: 3 },
  { id: 'xuejinglian', name: '血晶链', slot: 'neck', lore: '嵌有细碎血晶。', base: { hp: 8, rage: 0.08, wugong: 3 }, weight: 2, quality: 'xuan', tier: 4 },

  { id: 'tongjie', name: '铜戒', slot: 'ring', lore: '粗铜指环。', base: { atk: 1 }, weight: 10, common: true, quality: 'fan', tier: 1 },
  { id: 'yinjie', name: '银戒', slot: 'ring', lore: '细银环。', base: { atk: 2, wugong: 1 }, weight: 6, quality: 'huang', tier: 2 },
  { id: 'xuejie', name: '血戒', slot: 'ring', lore: '暗赤戒面。', base: { atk: 4, rage: 0.05 }, weight: 3, quality: 'xuan', tier: 4 },

  { id: 'budai', name: '布腰带', slot: 'waist', lore: '束腰布带。', base: { hp: 4, def: 1 }, weight: 9, common: true, quality: 'fan', tier: 1 },
  { id: 'pidai', name: '皮腰带', slot: 'waist', lore: '宽皮束带。', base: { hp: 8, def: 2 }, weight: 5, quality: 'huang', tier: 3 },
  { id: 'yaopai', name: '腰牌', slot: 'waist', lore: '官府腰牌仿制。', base: { hp: 6, atk: 2, def: 2 }, weight: 3, quality: 'xuan', tier: 4 },
];
