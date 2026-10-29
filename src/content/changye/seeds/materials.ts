/** Oc4: 出厂 CORE_MATERIALS 字面量（原 meta/materials.ts）。 */
import type { MaterialDef } from '../../../meta/materials';

export const CORE_MATERIALS: MaterialDef[] = [
  { id: 'iron', name: '精铁', lore: '寻常矿脉所出，锻兵之本。', weight: 28 },
  { id: 'bone', name: '兽骨', lore: '妖兽残骸，可磨作柄与符骨。', weight: 22 },
  { id: 'hide', name: '兽皮', lore: '剥自夜行兽类，可制甲与护腕。', weight: 20 },
  { id: 'herb', name: '灵草', lore: '月下采得，炼丹入药。', weight: 16 },
  { id: 'silk', name: '丝线', lore: '蛛丝与蚕丝混纺，缚刃缠柄。', weight: 14 },
  { id: 'cinnabar', name: '朱砂', lore: '丹房常用，亦能淬刃成朱。', weight: 14 },
  { id: 'coal', name: '煤铁', lore: '炉中焦铁，淬火增韧。', weight: 12 },
  { id: 'xuaniron', name: '玄铁', lore: '寒铁沉重，重兵所需。', weight: 7, rare: true },
  { id: 'spiritjade', name: '灵玉', lore: '山门旧藏碎玉，蕴微光。', weight: 5, rare: true },
  { id: 'yaohe', name: '妖核', lore: '妖物心核，铸极品兵器与秘药。', weight: 3, rare: true },
];
