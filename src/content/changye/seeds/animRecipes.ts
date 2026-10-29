/** Oc4: 出厂 CORE_ANIM_RECIPES 字面量（原 meta/animScripts.ts）。 */
import type { AnimRecipeDef } from '../../../meta/animScripts';

export const CORE_ANIM_RECIPES: AnimRecipeDef[] = [
  {
    id: 'slashInk',
    label: '墨斩',
    steps: [
      { kind: 'playPose', poseId: 'slash1', frames: 5 },
      { kind: 'swingArc', radius: 72, sweep: 1.35, color: '#e8d0a0', frames: 8 },
      { kind: 'weaponTrail', frames: 10, color: '#e8d0a0', width: 5 },
      { kind: 'afterimage', count: 3, life: 10, color: '#c8b090', alpha: 0.35 },
      { kind: 'sfx', id: 'slash' },
    ],
  },
  {
    id: 'thrustInk',
    label: '墨刺',
    steps: [
      { kind: 'playPose', poseId: 'thrust', frames: 6 },
      { kind: 'weaponTrail', frames: 12, color: '#c07040', width: 4 },
      { kind: 'swingArc', radius: 110, sweep: 0.4, color: '#e09050', frames: 6 },
      { kind: 'afterimage', count: 4, life: 8, color: '#a06030', alpha: 0.3 },
      { kind: 'inkBurst', size: 42, color: '#c07040', n: 6 },
      { kind: 'sfx', id: 'slash' },
    ],
  },
  {
    id: 'sealBurst',
    label: '符面爆',
    steps: [
      { kind: 'sealGlyph', text: '符', color: '#e8c070', frames: 20, scale: 1.5 },
      { kind: 'inkBurst', size: 58, color: '#e8c070', n: 8 },
      { kind: 'tintCaster', color: '#e8c070', frames: 14, alpha: 0.28 },
      { kind: 'flash', color: '#ffe0a0', a: 0.12 },
      { kind: 'sfx', id: 'ui' },
    ],
  },
  {
    id: 'hopSlash',
    label: '跃斩',
    steps: [
      { kind: 'hop', vy: -11, vx: 2.5, faceMul: true },
      { kind: 'sfx', id: 'jump' },
      { kind: 'playPose', poseId: 'rising', frames: 8 },
      { kind: 'wait', frames: 6 },
      { kind: 'swingArc', radius: 78, sweep: 1.4, color: '#e8d0a0', frames: 8 },
      { kind: 'weaponTrail', frames: 10, color: '#e8d0a0', width: 5 },
      { kind: 'afterimage', count: 3, life: 10, color: '#c8b090', alpha: 0.35 },
      { kind: 'fallStrike', vy: 12 },
      { kind: 'playPose', poseId: 'plunge', frames: 8 },
      { kind: 'sfx', id: 'slash' },
    ],
  },
  /* A skill seeds */
  {
    id: 'dashThrust',
    label: '突进刺',
    steps: [
      { kind: 'face', dir: 'player' },
      { kind: 'afterimage', count: 4, life: 8, color: '#c07040', alpha: 0.32 },
      { kind: 'dash', dist: 90, frames: 5, faceMul: true },
      { kind: 'landDust', n: 5 },
      { kind: 'playPose', poseId: 'thrust', frames: 6 },
      { kind: 'beamLine', length: 120, color: '#e09050', frames: 8 },
      { kind: 'weaponTrail', frames: 10, color: '#c07040', width: 4 },
      { kind: 'sparkBurst', color: '#e8d0a0', n: 8 },
      { kind: 'scalePunch', scale: 1.12, frames: 6 },
      { kind: 'sfx', id: 'dash' },
    ],
  },
  {
    id: 'crescentInk',
    label: '月牙墨斩',
    steps: [
      { kind: 'playPose', poseId: 'slash1', frames: 5 },
      { kind: 'crescentSlash', radius: 88, color: '#e8d0a0', frames: 10 },
      { kind: 'swordQiFlash', color: '#d0e0f0' },
      { kind: 'weaponTrail', frames: 12, color: '#e8d0a0', width: 5 },
      { kind: 'afterimage', count: 3, life: 10, alpha: 0.35 },
      { kind: 'sfx', id: 'slash' },
    ],
  },
  {
    id: 'groundBreak',
    label: '地裂',
    steps: [
      { kind: 'fallStrike', vy: 14 },
      { kind: 'playPose', poseId: 'plunge', frames: 6 },
      { kind: 'landDust', n: 10, color: '#4a3f5a' },
      { kind: 'groundCrack', width: 90, frames: 22, color: '#2a2030' },
      { kind: 'shake', amp: 5, frames: 10 },
      { kind: 'flareBurst', size: 50, color: '#6a5a7a', frames: 10 },
      { kind: 'sfx', id: 'land' },
    ],
  },
  {
    id: 'mistRise',
    label: '升雾',
    steps: [
      { kind: 'riseMist', frames: 28, color: '#6a5a7a' },
      { kind: 'tintCaster', color: '#8a7a9a', frames: 20, alpha: 0.22 },
      { kind: 'orbitRing', n: 6, color: '#a090b0', frames: 24, radius: 40 },
      { kind: 'sfx', id: 'ui' },
    ],
  },
  /* B talisman seeds */
  {
    id: 'sealStampFull',
    label: '盖印全式',
    steps: [
      { kind: 'sealPaper', frames: 16, color: '#e8c070', w: 48, h: 64 },
      { kind: 'sealStamp', text: '印', frames: 18, scale: 1.8 },
      { kind: 'inkSplash', size: 40, color: '#c01828' },
      { kind: 'flash', color: '#ffe0a0', a: 0.14 },
      { kind: 'sfx', id: 'ui' },
    ],
  },
  {
    id: 'sealRainCast',
    label: '符雨',
    steps: [
      { kind: 'sealRain', count: 7, text: '符', color: '#e8c070' },
      { kind: 'inkBurst', size: 48, color: '#e8c070', n: 6 },
      { kind: 'shake', amp: 2, frames: 8 },
      { kind: 'sfx', id: 'ui' },
    ],
  },
  {
    id: 'baguaBind',
    label: '八卦定',
    steps: [
      { kind: 'baguaRing', frames: 28, color: '#c0a070', radius: 70 },
      { kind: 'runeOrbit', count: 6, frames: 26, color: '#e8c070' },
      { kind: 'bindThreads', frames: 20, color: '#c0a070' },
      { kind: 'tintCaster', color: '#c0a070', frames: 16, alpha: 0.25 },
      { kind: 'sfx', id: 'ui' },
    ],
  },
  {
    id: 'paperBurnBurst',
    label: '符纸燃',
    steps: [
      { kind: 'sealPaper', frames: 10, color: '#e8c070', w: 40, h: 56 },
      { kind: 'paperBurn', frames: 22, color: '#ff6a1a' },
      { kind: 'inkBurst', size: 50, color: '#ff9a30', n: 8 },
      { kind: 'flareBurst', size: 55, color: '#ff6a1a', frames: 12 },
      { kind: 'sfx', id: 'fire' },
    ],
  },
  {
    id: 'exorcismPulse',
    label: '驱邪波',
    steps: [
      { kind: 'sealGlyph', text: '驱', color: '#e8c070', frames: 16, scale: 1.4 },
      { kind: 'exorcismWave', radius: 110, frames: 24, color: '#ffe0a0' },
      { kind: 'ringPulse', size: 90, color: '#e8c070', frames: 16 },
      { kind: 'soulBell', frames: 18 },
      { kind: 'sfx', id: 'ui' },
    ],
  },
];
