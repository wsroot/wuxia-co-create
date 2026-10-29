/** Oc4: 出厂 CORE_BOSS_KITS 字面量（原 level/actPools.ts）。 */
import type { BossKitDef } from '../../../level/actPools';

export const CORE_BOSS_KITS: BossKitDef[] = [
  {
    id: 'stone',
    close: [
      { move: 'claw', weight: 4 }, { move: 'charge', weight: 2 },
      { move: 'dive', weight: 1 }, { move: 'roar', weight: 1.4 },
      { move: 'slam', weight: 1.5 }, { move: 'sweep', weight: 1.2 },
    ],
    far: [
      { move: 'fireball', weight: 2 }, { move: 'dive', weight: 2 },
      { move: 'charge', weight: 3 }, { move: 'walk', weight: 2 }, { move: 'roar', weight: 1.4 },
      { move: 'inkNova', weight: 1.1 }, { move: 'summonAdds', weight: 0.6 },
    ],
  },
  {
    id: 'rain',
    close: [
      { move: 'claw', weight: 3 }, { move: 'charge', weight: 4 },
      { move: 'dive', weight: 2 }, { move: 'roar', weight: 1.4 },
    ],
    far: [
      { move: 'fireball', weight: 4 }, { move: 'dive', weight: 3 },
      { move: 'charge', weight: 2 }, { move: 'walk', weight: 1 }, { move: 'roar', weight: 1.4 },
    ],
  },
  {
    id: 'tomb',
    close: [
      { move: 'claw', weight: 4 }, { move: 'charge', weight: 1 },
      { move: 'dive', weight: 3 }, { move: 'roar', weight: 1.68 },
    ],
    far: [
      { move: 'fireball', weight: 2 }, { move: 'dive', weight: 4 },
      { move: 'charge', weight: 2 }, { move: 'walk', weight: 2 }, { move: 'roar', weight: 1.4 },
    ],
  },
  {
    id: 'night',
    close: [
      { move: 'claw', weight: 4 }, { move: 'charge', weight: 3 },
      { move: 'dive', weight: 2 }, { move: 'roar', weight: 2.1 },
    ],
    far: [
      { move: 'fireball', weight: 5 }, { move: 'dive', weight: 3 },
      { move: 'charge', weight: 2 }, { move: 'walk', weight: 1 }, { move: 'roar', weight: 1.4 },
    ],
  },
];
