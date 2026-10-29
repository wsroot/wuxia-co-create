/** Oc4: 出厂 B 档 CORE_* 字面量（原 meta/bTier/coreData.ts）。 */
/**
 * Official B-tier catalog entries (长夜).
 * CORE_ATTACK_BOXES seeds PM/BARE/specials + 敌人七内置盒 + Boss 八盒 into ctx.attacks (id = AttackDef.name).
 * W3: 普攻选招 / runtime 认 attackKey + combatCue，不再依赖 def === PM.* 对象身份；
 * boxFrom 仍就地写 id（目录与种子同名即可）。
 * 外功 / attackChain / 敌人 Behavior meleeAttack 只经 getAttackBox / ctx.attacks（W1 + A1）。
 * Boss claw/charge/dive/roar/fireball 命中盒亦经 getAttackBox（G5；种子自 entities/boss/bossMoves.ts）。
 */
import { PM, BARE, PLUNGE_WAVE, SUPER_SLASH, SUPER_FINAL } from '../../../combat/playerMoves';
import {
  AXE_CHOP, SHIELD_BASH, SHIELD_CHARGE, WHIP, SPEAR_THRUST, SPEAR_LUNGE, ARROW,
} from '../../../entities/enemies/bodyAttacks';
import {
  CLAW1, CLAW2, CLAW3, CHARGE_HIT, DIVE_BODY, DIVE_WAVE, ROAR_WAVE, FIREBALL,
} from '../../../entities/boss/bossMoves';
import { HUNTER_ATTACKS, SKEL_ATTACKS, GARG_ATTACKS } from '../../../render/poses';
import { WEAPON_SHEET_IDS, WEAPON_SHEET_FRAME_W, WEAPON_SHEET_FRAME_H, WEAPON_SHEET_FRAMES } from '../../../render/weaponSheets';
import type {
  AttackBoxDef, PoseDef, ProjectileDef, FxRecipeDef, SheetDef, SfxDef,
  VolleyDef, SilhouetteDef, BehaviorDef, BackdropDef, BossMoveDef,
  ColliderProfile,
} from '../../../meta/bTier/types';

/** Attach id in-place (id = name); W3 no longer requires shared object identity for 普攻. */
function boxFrom(def: { name: string }): AttackBoxDef {
  const d = def as AttackBoxDef;
  d.id = def.name;
  return d;
}

/** All player / skill / special / enemy-body / Boss attack boxes (shared refs; A1 + G5). */
export const CORE_ATTACK_BOXES: AttackBoxDef[] = [
  ...Object.values(PM).map(boxFrom),
  ...Object.values(BARE).map(boxFrom),
  boxFrom(PLUNGE_WAVE),
  boxFrom(SUPER_SLASH),
  boxFrom(SUPER_FINAL),
  // A1: 七内置敌盒（数值/盒形与 bodyAttacks 单源一致，不改手感）
  boxFrom(AXE_CHOP),
  boxFrom(SHIELD_BASH),
  boxFrom(SHIELD_CHARGE),
  boxFrom(WHIP),
  boxFrom(SPEAR_THRUST),
  boxFrom(SPEAR_LUNGE),
  boxFrom(ARROW),
  // G5: Boss 八盒（数值/盒形与 entities/boss/bossMoves 单源一致，不改手感）
  boxFrom(CLAW1),
  boxFrom(CLAW2),
  boxFrom(CLAW3),
  boxFrom(CHARGE_HIT),
  boxFrom(DIVE_BODY),
  boxFrom(DIVE_WAVE),
  boxFrom(ROAR_WAVE),
  boxFrom(FIREBALL),
];

export const CORE_POSES: PoseDef[] = [
  ...Object.entries(HUNTER_ATTACKS).map(([id, p]) => ({ id, ...p })),
  ...Object.entries(SKEL_ATTACKS).map(([id, p]) => ({ id: `skel.${id}`, ...p })),
  ...Object.entries(GARG_ATTACKS).map(([id, p]) => ({ id: `garg.${id}`, ...p })),
];

export const CORE_PROJECTILES: ProjectileDef[] = [
  {
    id: 'arrow', drawKind: 'arrow', hitW: 24, hitH: 8, life: 240,
    // hitSfx opt-in：缺省无 → 命中仍走 resolver hit/hitHeavy（bit-identical 今日）
  },
  {
    id: 'fireball', drawKind: 'fireball', hitW: 28, hitH: 28, life: 240,
    attackKey: 'gFire',
    explodeOnGround: true, trailEvery: 2, explodeSfx: 'fire',
  },
];

export const CORE_FX_RECIPES: FxRecipeDef[] = [
  { id: 'flare', emitter: 'flare', size: 70, life: 16 },
  { id: 'ring', emitter: 'ring', size: 50, life: 18 },
  { id: 'spark', emitter: 'spark' },
  { id: 'qi', emitter: 'qi', n: 6, size: 10, life: 20 },
  { id: 'fire', emitter: 'fire', n: 8, size: 10 },
  { id: 'dust', emitter: 'dust', n: 10 },
  { id: 'swordQi', emitter: 'swordQi' },
];

export const CORE_SHEETS: SheetDef[] = WEAPON_SHEET_IDS.map((id) => ({
  id,
  src: `./art/weapons/${id}.png`,
  frameW: WEAPON_SHEET_FRAME_W,
  frameH: WEAPON_SHEET_FRAME_H,
  frames: WEAPON_SHEET_FRAMES,
  maxBytes: 512_000,
}));

/** Built-in synth ids — interpreter stays in audio/sfx.ts. */
const CORE_SFX_IDS = [
  'slash', 'heavy', 'kick', 'hit', 'hitHeavy', 'clang', 'parry', 'block', 'bone', 'jump', 'land',
  'hurt', 'dash', 'roar', 'arrow', 'fire', 'boom', 'potion', 'super', 'superSlash', 'telegraph',
  'shieldBang', 'claw', 'whip', 'bash', 'ui', 'death', 'wave', 'stagger', 'flap',
] as const;

export const CORE_SFX: SfxDef[] = CORE_SFX_IDS.map((id) => ({ id, synth: id }));

export const CORE_VOLLEYS: VolleyDef[] = [
  { id: 'skySword', style: 'skySword', defaultCount: 5, defaultInterval: 8, defaultSpread: 220, color: '#c8d8ff' },
  { id: 'thunder', style: 'thunder', defaultCount: 4, defaultInterval: 10, defaultSpread: 200, color: '#ffe080' },
  { id: 'waterPulse', style: 'waterPulse', defaultCount: 3, defaultInterval: 12, defaultRadius: 70, color: '#70c8ff' },
];


/** Physical body boxes matching Enemy constructor super(x, GROUND_Y, 32, 82, hp). */
export const CORE_COLLIDERS: ColliderProfile[] = [
  { id: 'axe', w: 32, h: 82, label: '斧兵碰撞' },
  { id: 'shield', w: 32, h: 82, label: '盾兵碰撞' },
  { id: 'archer', w: 32, h: 82, label: '弓兵碰撞' },
  { id: 'spear', w: 32, h: 82, label: '枪兵碰撞' },
  // Align with Gargoyle shell super(x,-160,70,130,…).
  { id: 'gargoyle', w: 70, h: 130, label: '石兽碰撞' },
];

export const CORE_SILHOUETTES: SilhouetteDef[] = [
  { id: 'axe', body: 'axe', baseRig: 'axe', label: '斧兵剪影' },
  { id: 'shield', body: 'shield', baseRig: 'shield', label: '盾兵剪影' },
  { id: 'archer', body: 'archer', baseRig: 'archer', label: '弓兵剪影' },
  { id: 'spear', body: 'spear', baseRig: 'spear', label: '枪兵剪影' },
  { id: 'gargoyle', body: 'gargoyle', baseRig: 'gargoyle', label: '石兽剪影' },
];

export const CORE_BEHAVIORS: BehaviorDef[] = [
  {
    id: 'axe', body: 'axe', label: '斧兵套路',
    steps: [
      { kind: 'facePlayer' },
      { kind: 'keepDistance', idealMin: 74, idealMax: 84, chase: 420 },
      { kind: 'meleeAttack', attackKey: 'axeChop', rangeMin: 0, rangeMax: 84, weight: 3.0, cooldown: 55 },
    ],
  },
  {
    id: 'shield', body: 'shield', label: '盾兵套路',
    steps: [
      { kind: 'facePlayer' },
      { kind: 'keepDistance', idealMin: 90, idealMax: 120, chase: 520 },
      { kind: 'meleeAttack', attackKey: 'bash', rangeMin: 0, rangeMax: 86, weight: 2.2, cooldown: 50 },
      { kind: 'charge', speed: 8.8, frames: 70, rangeMin: 86, rangeMax: 520, weight: 1.6, cooldown: 90 },
      { kind: 'block', holdFrames: 40, weight: 1.0, cooldown: 60 },
    ],
  },
  {
    id: 'archer', body: 'archer', label: '弓兵套路',
    steps: [
      { kind: 'facePlayer' },
      { kind: 'keepDistance', idealMin: 260, idealMax: 460, chase: 700, retreatSpeed: 2.8 },
      { kind: 'rangedAttack', projectileId: 'arrow', rangeMin: 190, rangeMax: 600, weight: 2.4, cooldown: 70, aimFrames: 38 },
      { kind: 'meleeAttack', attackKey: 'whip', rangeMin: 0, rangeMax: 76, weight: 2.0, cooldown: 40 },
      { kind: 'dodge', range: 190, direction: 'away', weight: 1.4, cooldown: 80 },
      { kind: 'retreatBurst', dist: 90, frames: 14, weight: 0.9 },
    ],
  },
  {
    id: 'spear', body: 'spear', label: '枪兵套路',
    steps: [
      { kind: 'facePlayer' },
      { kind: 'keepDistance', idealMin: 100, idealMax: 175, chase: 220, retreatSpeed: 2.4 },
      { kind: 'meleeAttack', attackKey: 'thrust', rangeMin: 100, rangeMax: 175, weight: 2.2, cooldown: 62 },
      { kind: 'meleeAttack', attackKey: 'lunge', rangeMin: 120, rangeMax: 220, weight: 1.0, cooldown: 48 },
      { kind: 'meleeAttack', attackKey: 'thrust', rangeMin: 72, rangeMax: 100, weight: 0.8, cooldown: 55 },
      { kind: 'retreatBurst', dist: 80, frames: 16, weight: 1.1 },
    ],
  },
  // Boss AI via bossMoves / kit；空档可选 Behavior（Gsm1）。核心 stub 无 steps → 壳 idle/walk bit-identical。
  { id: 'gargoyle', body: 'gargoyle', label: '石兽套路' },
];

export const CORE_BACKDROPS: BackdropDef[] = [
  { id: 'night', theme: 'night', label: '长夜山道' },
  { id: 'dock', theme: 'dock', label: '江埠残灯' },
  { id: 'ash', theme: 'ash', label: '灰烬祠' },
  { id: 'eclipse', theme: 'eclipse', label: '蚀月岭' },
];

/**
 * Boss move aliases. Kind primitives (dive/roar/…) remain hard-coded in gargoyle.ts;
 * kits weight these ids. Plugins may register variants that remap to the same kind.
 * Gsm3: CORE claw/walk omit soft muls/frames → gargoyle soft-read defaults (= today).
 * Packs may add claw startupMul/recoveryMul/damageMul or walk frames for discernible cadence.
 * Gsm4: CORE charge/slam/sweep omit windFrames → wind defaults 38/28/22 (= today).
 * Packs may set windFrames; slam radius/damage/hitstop + sweep width/damage already soft.
 * Dfr1: CORE roar omits windFrames/radius/frames → roarWind 40 / ring max 300 / active 44 (= today).
 * Packs may set windFrames (± radius/frames); damage still catalog gRoar.
 * Dfr2: CORE fireball omits frames/count/windFrames/projectileId → rise 34 / count 3 / gap 20 / id fireball (= today).
 * Packs may set frames (± count/windFrames/projectileId); drawKind still closed; phase2 gap/count delta still shell.
 * Dfr3: CORE dive omits windFrames/radius/frames/attackKey → aim 68 / wave rx 150 / recover 60 / gDive+gDiveWave (= today).
 * Packs may set windFrames (± radius/frames/attackKey); diveAim invuln unchanged; no perch/drawKind.
 */
export const CORE_BOSS_MOVES: BossMoveDef[] = [
  { id: 'claw', kind: 'claw', label: '裂爪' },
  { id: 'charge', kind: 'charge', label: '冲撞' },
  { id: 'fireball', kind: 'fireball', label: '火球' },
  { id: 'dive', kind: 'dive', label: '俯冲' },
  { id: 'roar', kind: 'roar', label: '震啸' },
  { id: 'walk', kind: 'walk', label: '踱步' },
  { id: 'slam', kind: 'slam', label: '震地', radius: 140, damage: 18, hitstop: 10 },
  { id: 'sweep', kind: 'sweep', label: '横扫', width: 180, damage: 14 },
  { id: 'summonAdds', kind: 'summonAdds', label: '召卫', enemyId: 'axe', count: 2, side: 'both' },
  { id: 'inkNova', kind: 'inkNova', label: '墨爆', radius: 160, frames: 28, color: '#2a2030', damage: 8 },
];
