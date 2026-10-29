/** Oc4: 出厂 CORE_ACT_POOLS 字面量（原 level/actPools.ts）。 */
import type { ActPool } from '../../../level/actPools';

export const CORE_ACT_POOLS: ActPool[] = [
  {
    kit: 'stone', tint: 'jade',
    eliteWeights: { tongpi: 3, zhongji: 2, shanbu: 1, fanshang: 1, shixue: 1, xiehuo: 1 },
    dropLean: ['iron', 'bone', 'hide'],
    blueprintLean: ['silver', 'thorn', 'softsword', 'clawglove'],
    setLean: ['tiegu', 'qingxinding', 'yingzhi'],
    loreLine: '山门旧钟犹在，石兽未眠。',
  },
  {
    kit: 'rain', tint: 'ink',
    eliteWeights: { shanbu: 3, shixue: 2, xiehuo: 2, tongpi: 1, fanshang: 1, zhongji: 1 },
    dropLean: ['silk', 'herb', 'cinnabar'],
    blueprintLean: ['spear', 'dao', 'pike', 'ironfist'],
    setLean: ['yexing', 'pojunrui', 'yingzhi'],
    loreLine: '渡口雨湿，刀光如鳞。',
  },
  {
    kit: 'tomb', tint: 'ash',
    eliteWeights: { fanshang: 3, tongpi: 2, zhongji: 2, xiehuo: 2, shanbu: 1, shixue: 1 },
    dropLean: ['bone', 'coal', 'xuaniron'],
    blueprintLean: ['axe', 'hammer', 'guandao'],
    setLean: ['pojunrui', 'tiegu', 'anhunling'],
    loreLine: '冢门半开，灰土里有人声。',
  },
  {
    kit: 'night', tint: 'blood',
    eliteWeights: { xiehuo: 3, shixue: 3, zhongji: 2, fanshang: 2, tongpi: 1, shanbu: 1 },
    dropLean: ['yaohe', 'spiritjade', 'cinnabar'],
    blueprintLean: ['twin', 'bell', 'halberd'],
    setLean: ['yinixue', 'anhunling', 'yexing'],
    loreLine: '长夜未尽，安魂未歇。',
  },
];
