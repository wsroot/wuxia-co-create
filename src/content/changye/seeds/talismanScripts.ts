/** Oc4: 出厂 CORE_SCRIPTS 字面量（原 meta/talismanScripts.ts）。 */
import type { TalismanScriptDef } from '../../../meta/talismanScripts';

export const CORE_SCRIPTS: TalismanScriptDef[] = [
  {
    id: 'quxie',
    anim: 'exorcismPulse',
    steps: [
      { kind: 'banner', text: '灵符', sub: '驱邪符', dur: 80 },
      { kind: 'flash', color: '#e8c070', a: 0.2 },
      { kind: 'hitstop', frames: 4 },
      { kind: 'fx', preset: 'flare', size: 80, color: '#e8c070' },
      { kind: 'fx', preset: 'ring', size: 70, color: '#ffe0a0' },
      { kind: 'fx', preset: 'qi', n: 8, color: '#e8c070' },
      { kind: 'shake', amp: 2, frames: 6 },
      { kind: 'sfx', id: 'ui' },
      {
        kind: 'status',
        eliteSuppress: 60 * 10,
        floatEachElite: '驱邪',
      },
    ],
  },
  {
    id: 'qingwu',
    steps: [
      { kind: 'banner', text: '灵符', sub: '清雾符', dur: 80 },
      { kind: 'fx', preset: 'ring', size: 90, color: '#70c8a0' },
      { kind: 'fx', preset: 'flare', size: 60, color: '#a0e8c0' },
      { kind: 'float', text: '雾散', color: '#70c8a0', size: 16 },
      { kind: 'sfx', id: 'ui' },
      { kind: 'status', affixSuppress: 60 * 12, clearHazards: true },
    ],
  },
  {
    id: 'jiekong',
    steps: [
      { kind: 'banner', text: '灵符', sub: '解控符', dur: 80 },
      { kind: 'fx', preset: 'flare', size: 70, color: '#90c0ff' },
      { kind: 'fx', preset: 'ring', size: 50, color: '#c0e0ff' },
      { kind: 'float', text: '解控', color: '#90c0ff', size: 16 },
      { kind: 'sfx', id: 'ui' },
      {
        kind: 'status',
        clearControl: true,
        invuln: 45,
        stamina: 25,
      },
    ],
  },
  {
    id: 'poshi',
    steps: [
      { kind: 'banner', text: '灵符', sub: '破势符', dur: 80 },
      { kind: 'flash', color: '#ff9070', a: 0.28 },
      { kind: 'hitstop', frames: 6 },
      { kind: 'fx', preset: 'flare', size: 90, color: '#ff9070', heavy: true },
      { kind: 'fx', preset: 'spark', heavy: true, color: '#ff9070' },
      { kind: 'fx', preset: 'ring', size: 80, color: '#ffb090' },
      { kind: 'shake', amp: 4, frames: 10 },
      { kind: 'sfx', id: 'heavy' },
      { kind: 'status', poshi: true },
    ],
  },
  {
    id: 'hushen',
    steps: [
      { kind: 'banner', text: '灵符', sub: '护身符', dur: 80 },
      { kind: 'fx', preset: 'ring', size: 70, color: '#a0c8e8' },
      { kind: 'fx', preset: 'flare', size: 55, color: '#c0e0ff' },
      { kind: 'float', text: '护身', color: '#a0c8e8', size: 16 },
      { kind: 'sfx', id: 'ui' },
      { kind: 'status', hushen: 60 * 8 },
    ],
  },
  {
    id: 'dingshen',
    anim: 'baguaBind',
    steps: [
      { kind: 'banner', text: '灵符', sub: '定身符', dur: 80 },
      { kind: 'fx', preset: 'qi', n: 10, color: '#c0a070' },
      { kind: 'fx', preset: 'flare', size: 60, color: '#c0a070' },
      { kind: 'sfx', id: 'ui' },
      { kind: 'status', dingshen: 60 * 4 },
    ],
  },
  {
    id: 'anhunfu',
    steps: [
      { kind: 'banner', text: '灵符', sub: '安魂符', dur: 80 },
      { kind: 'fx', preset: 'ring', size: 100, color: '#e8d090' },
      { kind: 'fx', preset: 'flare', size: 70, color: '#ffe8a0' },
      { kind: 'float', text: '安魂', color: '#e8d090', size: 16 },
      { kind: 'sfx', id: 'ui' },
      { kind: 'status', anhun: 60 * 8 },
    ],
  },
  {
    id: 'jingxue',
    steps: [
      { kind: 'banner', text: '灵符', sub: '净血符', dur: 80 },
      { kind: 'fx', preset: 'flare', size: 65, color: '#70d0a8' },
      { kind: 'fx', preset: 'qi', n: 6, color: '#70d0a8' },
      { kind: 'sfx', id: 'potion' },
      {
        kind: 'status',
        clearHazards: true,
        affixSuppress: 60 * 10,
        heal: 18,
      },
      { kind: 'float', text: '净血', color: '#70d0a8', size: 16 },
    ],
  },
  {
    id: 'zhangyan',
    steps: [
      { kind: 'banner', text: '灵符', sub: '障眼符', dur: 80 },
      { kind: 'fx', preset: 'flare', size: 55, color: '#9080c0' },
      { kind: 'fx', preset: 'qi', n: 8, color: '#9080c0' },
      { kind: 'float', text: '障眼', color: '#9080c0', size: 14 },
      { kind: 'sfx', id: 'ui' },
      {
        kind: 'status',
        eliteSuppress: 60 * 7,
        floatEachElite: '障眼',
      },
    ],
  },
  /* ── attack scripts ─────────────────────────────────────── */
  {
    id: 'skySwords',
    steps: [
      { kind: 'banner', text: '灵符', sub: '满天飞剑', dur: 90 },
      { kind: 'hitstop', frames: 5 },
      { kind: 'flash', color: '#c8d8ff', a: 0.22 },
      { kind: 'fx', preset: 'flare', size: 80, color: '#c8d8ff' },
      { kind: 'fx', preset: 'swordQi', heavy: true },
      { kind: 'fx', preset: 'qi', n: 8, color: '#e0ecff' },
      { kind: 'shake', amp: 3, frames: 8 },
      { kind: 'sfx', id: 'superSlash' },
      {
        kind: 'spawnVolley',
        style: 'skySword',
        count: 10,
        interval: 5,
        damage: 11,
        spread: 260,
      },
      { kind: 'wait', frames: 70 },
    ],
  },
  {
    id: 'thunder',
    steps: [
      { kind: 'banner', text: '灵符', sub: '九霄落雷', dur: 90 },
      { kind: 'fx', preset: 'flare', size: 90, color: '#ffe080' },
      { kind: 'flash', color: '#e8f0ff', a: 0.35 },
      { kind: 'sfx', id: 'roar' },
      {
        kind: 'spawnVolley',
        style: 'thunder',
        count: 5,
        interval: 10,
        damage: 22,
        spread: 280,
        radius: 55,
      },
      { kind: 'wait', frames: 80 },
    ],
  },
  {
    id: 'waterPulse',
    steps: [
      { kind: 'banner', text: '灵符', sub: '水龙冲击', dur: 90 },
      { kind: 'fx', preset: 'flare', at: 'ground', oy: -20, size: 70, color: '#70c8ff' },
      { kind: 'fx', preset: 'ring', at: 'ground', oy: -20, size: 60, color: '#a0e0ff' },
      { kind: 'sfx', id: 'wave' },
      {
        kind: 'spawnVolley',
        style: 'waterPulse',
        count: 3,
        interval: 12,
        damage: 16,
        radius: 100,
      },
      { kind: 'wait', frames: 50 },
    ],
  },
];
